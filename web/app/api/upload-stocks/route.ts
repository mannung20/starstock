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
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // 5) 기존 종목 조회 (stock_code 변경 감지 → entry_date 갱신 판단)
    const { data: existing, error: fetchErr } = await supabase
      .from("stocks")
      .select("rank, stock_code, entry_date");
    if (fetchErr) throw fetchErr;

    const existingRows = (existing ?? []) as {
      rank: number;
      stock_code: string;
      entry_date: string;
    }[];
    const existingByRank = new Map(existingRows.map((r) => [r.rank, r]));

    const visibleRows = stocks.filter((s) => !s.hide);
    const hideRanks = stocks.filter((s) => s.hide).map((s) => s.rank);

    // 6) 표시 종목 Upsert (onConflict: rank)
    if (visibleRows.length > 0) {
      const upsertRows = visibleRows.map((s) => {
        const prev = existingByRank.get(s.rank);
        // stock_code 변경 시 entry_date=오늘, 동일하면 기존 유지
        const entryDate =
          prev && prev.stock_code === s.stock_code ? prev.entry_date : today;
        return {
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
          status: s.status,
          memo: s.memo,
          is_visible: true,
          entry_date: entryDate,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: upsertErr } = await supabase
        .from("stocks")
        .upsert(upsertRows, { onConflict: "rank" });
      if (upsertErr) throw upsertErr;
    }

    // 7) 빈 rank → is_visible=false (DELETE 금지, 데이터 보존)
    if (hideRanks.length > 0) {
      const { error: hideErr } = await supabase
        .from("stocks")
        .update({ is_visible: false, updated_at: new Date().toISOString() })
        .in("rank", hideRanks);
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
      hidden: hideRanks.length,
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
