import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isShortWindow,
  summarize,
  type SignalPerfRow,
} from "@/lib/signal-performance";
import type { BuySignalRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/signal-performance — 자동 최고달성률 이력(관리자 전용).
 * 읽기 조건(PRD 5-4/9): note is null AND (finalized OR now >= tracking_until).
 *   → 업로더 다운으로 finalize 를 못 찍었어도 추적창이 지났으면 '확정'으로 간주(견고성).
 *   → 레거시 행(tracking_until null, finalized false)은 두 조건 다 불충족 → 자동 제외.
 * 응답: { rows: SignalPerfRow[], summary }  (summary 는 완주창만 집계).
 */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 500, 1), 2000);
  const nowIso = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("buy_signals")
    .select("id, stock_code, stock_name, entry_price, signaled_at, max_pct, rank, tracking_until, finalized")
    .is("note", null)
    .or(`finalized.eq.true,tracking_until.lte.${nowIso}`)
    .order("signaled_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const src = (data ?? []) as Pick<
    BuySignalRow,
    "id" | "stock_code" | "stock_name" | "entry_price" | "signaled_at" | "max_pct" | "rank" | "tracking_until"
  >[];

  const rows: SignalPerfRow[] = src.map((r) => ({
    id: r.id,
    stock_code: r.stock_code,
    stock_name: r.stock_name,
    entry_price: r.entry_price,
    signaled_at: r.signaled_at,
    max_pct: r.max_pct,
    rank: r.rank,
    is_short: isShortWindow(r.signaled_at, r.tracking_until),
  }));

  return NextResponse.json({ rows, summary: summarize(rows) });
}
