import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuySignalRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/signals?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=N — 관리자 조회(전용).
 * - from/to 있으면 trade_date(KST) 범위 필터, 없으면 최신 limit 건.
 * - 재생([replay]) 포함 전체(admin client=service_role, RLS 우회).
 */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 500, 1), 2000);

  const admin = createAdminClient();
  let q = admin.from("buy_signals").select("*").order("signaled_at", { ascending: false });
  if (from) q = q.gte("trade_date", from);
  if (to) q = q.lte("trade_date", to);
  q = q.limit(limit);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const signals = (data ?? []) as BuySignalRow[];
  return NextResponse.json({ signals, count: signals.length });
}

/**
 * DELETE /api/admin/signals?note=replay — 재생신호 일괄삭제(note='[replay]').
 * note=replay 일 때만 동작(실운영 신호 오삭제 방지).
 */
export async function DELETE(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const note = req.nextUrl.searchParams.get("note");
  if (note !== "replay") {
    return NextResponse.json({ error: "note=replay 만 일괄삭제 허용" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("buy_signals")
    .delete({ count: "exact" })
    .eq("note", "[replay]");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `재생신호 일괄삭제 ${count ?? 0}건`);
  return NextResponse.json({ success: true, deleted: count ?? 0 });
}
