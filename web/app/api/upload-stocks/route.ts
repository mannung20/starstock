import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { validateUploadPayload, isTimestampFresh } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
