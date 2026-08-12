import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateUploadPayload,
  isTimestampFresh,
  type UploadStockItem,
} from "@/lib/validation";
import { isShortWindow } from "@/lib/signal-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 자동 최고달성률(max_pct) 추적.
 * 💬 stocks upsert(트리거로 buy_signals 생성) 직후 호출. 활성 신호마다 현재가로
 *    max_pct 를 누적하고 만료 신호의 최고달성률을 확정(finalize)한다.
 *
 * ※ 추적 대상: finalized=false AND note is null (부분인덱스 idx_buy_signals_active).
 *    만료 확정은 루프 안에서 처리 — SELECT 에 만료 필터 넣지 않음(마지막 표본 누락 방지).
 * ★ max_pct 갱신 = 조건부 UPDATE(.lt("max_pct", pct)) → 단조 최댓값 원자 보장(재시도 안전).
 * ※ entry_price ≤ 0 은 0나눗셈이므로 skip. top-10 이탈 종목은 이번 표본 skip(max_pct 유지).
 */
/** ISO timestamp → KST 날짜(YYYY-MM-DD). recommend_date/close_date 매핑용. */
function kstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

async function trackBuySignals(
  supabase: ReturnType<typeof createAdminClient>,
  visibleRows: UploadStockItem[]
): Promise<{ updated: number; finalized: number; promoted: number }> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 브릿지 설정(10_signal_bridge.sql seed) — 조건부 자동 승격. 없으면 안전기본(off/5/full).
  const { data: cfgRows } = await supabase
    .from("site_config")
    .select("key, value")
    .in("key", ["auto_bridge_enabled", "auto_bridge_min_pct", "auto_bridge_full_only"]);
  const cfg = new Map((cfgRows ?? []).map((r) => [r.key, r.value] as const));
  const bridgeEnabled = cfg.get("auto_bridge_enabled") === "true";
  const bridgeMinPct = Number(cfg.get("auto_bridge_min_pct") ?? "5") || 5;
  const bridgeFullOnly = cfg.get("auto_bridge_full_only") !== "false"; // 기본 true

  const { data: active, error } = await supabase
    .from("buy_signals")
    .select("id, stock_code, stock_name, entry_price, max_pct, max_price, signaled_at, tracking_until")
    .eq("finalized", false)
    .is("note", null)
    .not("tracking_until", "is", null); // ※ 레거시 행(tracking_until=null) 제외 — 기능 시대 이전 신호는
  // 트리거 미작동으로 추적창이 없어 영구추적될 수 있음. 안전망.
  if (error) throw error;
  if (!active || active.length === 0) return { updated: 0, finalized: 0, promoted: 0 };

  const priceByCode = new Map<string, number>();
  for (const s of visibleRows) priceByCode.set(s.stock_code, s.current_price);

  let updated = 0;
  let finalized = 0;
  let promoted = 0;

  for (const sig of active) {
    // 만료 → 최고달성률 확정(finalize)(루프 안에서 처리). tracking_until 은 timestamptz 문자열이라
    // 포맷·정밀도 차이가 있으므로 문자열 비교 대신 Date.parse 로 시각 비교.
    if (sig.tracking_until && Date.parse(sig.tracking_until) <= now) {
      // ★ 조건부 자동 승격(브릿지): 최고달성률 확정(finalize) '전에' 수행(L2 크래시안전). 조건 통과 시
      //   stock_history 로 1건 복사. 멱등: 부분 UNIQUE(signal_id) 위반(23505)은 이미
      //   승격된 것 → 무시. (부분 인덱스는 upsert onConflict 추론 불가 → insert+catch 방식.)
      if (
        bridgeEnabled &&
        sig.max_pct >= bridgeMinPct &&
        (!bridgeFullOnly || !isShortWindow(sig.signaled_at, sig.tracking_until))
      ) {
        const { error: brErr } = await supabase.from("stock_history").insert({
          stock_code: sig.stock_code,
          stock_name: sig.stock_name,
          entry_price: sig.entry_price,
          exit_price: sig.max_price,
          return_rate: sig.max_pct,
          result: "profit",
          recommend_date: kstDate(sig.signaled_at),
          close_date: kstDate(sig.tracking_until),
          notes: "[자동·최고달성]",
          signal_id: sig.id,
        });
        if (brErr && brErr.code !== "23505") throw brErr; // 23505=중복(이미 승격) → 무시
        if (!brErr) promoted++;
      }

      const { error: finErr } = await supabase
        .from("buy_signals")
        .update({ finalized: true })
        .eq("id", sig.id);
      if (finErr) throw finErr;
      finalized++;
      continue;
    }

    const cur = priceByCode.get(sig.stock_code);
    if (cur === undefined) continue;               // top-10 이탈 → 이번 표본 skip
    if (!sig.entry_price || sig.entry_price <= 0) continue; // 0나눗셈 방어

    const pct =
      Math.round(((cur - sig.entry_price) / sig.entry_price) * 100 * 100) / 100;
    if (pct <= sig.max_pct) continue;              // 1차 게이트(헛 write 감소)

    const { data: patched, error: upErr } = await supabase
      .from("buy_signals")
      .update({ max_pct: pct, max_price: cur, max_at: nowIso })
      .eq("id", sig.id)
      .lt("max_pct", pct)                          // ★ 조건부: 단조 최댓값 원자 보장
      .select("id");
    if (upErr) throw upErr;
    if (patched && patched.length > 0) updated++;
  }

  return { updated, finalized, promoted };
}

/**
 * POST /api/upload-stocks — 엑셀 업로더 → DB 저장 (PRD 섹션 5-1)
 * 인증: X-Upload-Token 헤더. 트랜잭션: Upsert All (onConflict: rank).
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 0) Rate limiting (분당 10회)
  const rl = rateLimit(`upload:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfterSec} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let env;
  try {
    env = serverEnv();
  } catch (e) {
    return NextResponse.json(
      { error: "Server misconfigured", detail: (e as Error).message },
      { status: 500 }
    );
  }

  // 1) 토큰 검증
  const token = req.headers.get("x-upload-token");
  if (!token || token !== env.uploadToken) {
    return NextResponse.json(
      { error: "Invalid or missing upload token" },
      { status: 401 }
    );
  }

  // 2) 본문 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid data format", detail: "JSON 파싱 실패" },
      { status: 400 }
    );
  }

  // 3) 유효성 검사
  const result = validateUploadPayload(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: 400 }
    );
  }
  const { timestamp, stocks } = result.data;

  // 4) 타임스탬프 리플레이 방지 (±30초)
  if (!isTimestampFresh(timestamp, 30)) {
    return NextResponse.json(
      { error: "Request timestamp expired. Check system clock." },
      { status: 408 }
    );
  }

  const supabase = createAdminClient();

  try {
    // 5) 업로드 종목 준비 (빈 stock_code 마커는 제외 — v3.1 종목모델)
    const visibleRows = stocks.filter(
      (s) => !s.hide && s.stock_code.trim() !== ""
    );
    const uploadedCodes = new Set(visibleRows.map((s) => s.stock_code));

    // 6) 종목 Upsert (onConflict: stock_code)
    //    entry_date 미설정 → 신규=DB 기본값(current_date), 기존=보존(미포함 컬럼 불변).
    if (visibleRows.length > 0) {
      const upsertRows = visibleRows.map((s) => ({
        rank: s.rank,
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        current_price: s.current_price,
        open_price: s.open_price,
        high_price: s.high_price,
        low_price: s.low_price,
        target_price: s.target_price,
        stop_price: s.stop_price,
        entry_price: s.entry_price,
        entry_confirmed: s.entry_confirmed,
        change_rate: s.change_rate,
        status: s.status,
        memo: s.memo,
        is_visible: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from("stocks")
        .upsert(upsertRows, { onConflict: "stock_code" });
      if (upsertErr) throw upsertErr;
    }

    // 7) 이번 업로드에 없는 기존 visible 종목 → is_visible=false (DELETE 금지, 보존)
    const { data: curVisible, error: visErr } = await supabase
      .from("stocks")
      .select("stock_code")
      .eq("is_visible", true);
    if (visErr) throw visErr;

    const toHide = (curVisible ?? [])
      .map((r) => (r as { stock_code: string }).stock_code)
      .filter((code) => code && !uploadedCodes.has(code));

    if (toHide.length > 0) {
      const { error: hideErr } = await supabase
        .from("stocks")
        .update({ is_visible: false, updated_at: new Date().toISOString() })
        .in("stock_code", toHide);
      if (hideErr) throw hideErr;
    }

    // 7.5) 자동 최고달성률 추적 (best-effort) — 핵심 업로드(6~7) 성공 뒤 부가 처리.
    //   추적 실패가 업로드 전체를 500 으로 만들지 않도록 격리(업로더 재시도 폭주·화면 갱신
    //   중단 방지). 09 SQL 미적용 시점(컬럼 없음)에도 업로드는 정상 동작하도록 보호.
    let tracked = { updated: 0, finalized: 0, promoted: 0 };
    try {
      tracked = await trackBuySignals(supabase, visibleRows);
    } catch (e) {
      console.error(
        "[upload-stocks] signal tracking skipped:",
        (e as Error).message
      );
    }

    // 8) 성공 로그
    await supabase.from("upload_logs").insert({
      action_type: "upload",
      source_ip: ip,
      status: "success",
      records: visibleRows.length,
    });

    return NextResponse.json({
      success: true,
      updated: visibleRows.length,
      hidden: toHide.length,
      tracked,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    const msg = (e as Error).message ?? "unknown error";
    // 실패 로그 (best-effort)
    await supabase
      .from("upload_logs")
      .insert({
        action_type: "upload",
        source_ip: ip,
        status: "failed",
        error_msg: msg.slice(0, 500),
      })
      .then(() => {}, () => {});

    return NextResponse.json(
      { error: "Database update failed", detail: msg },
      { status: 500 }
    );
  }
}
