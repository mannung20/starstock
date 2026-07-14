import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockRow, StockStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/stocks/[code] — 종목 인라인 편집 (비상용)
 * [code] = stock_code (v3.1 식별키). body: { status?, memo?, target_price?, stop_price? }
 * ⚠️ 가격·종목코드는 엑셀 업로드가 덮어씀. status/memo/target/stop 은 유지됨.
 */
export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Partial<{ status: string; memo: string; target_price: number; stop_price: number }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !["buy", "hold", "sell"].includes(body.status)) {
    return NextResponse.json({ error: "status must be buy/hold/sell" }, { status: 400 });
  }

  const patch: Partial<StockRow> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) patch.status = body.status as StockStatus;
  if (body.memo !== undefined) patch.memo = body.memo;
  if (body.target_price !== undefined) patch.target_price = Math.max(0, Math.trunc(body.target_price));
  if (body.stop_price !== undefined) patch.stop_price = Math.max(0, Math.trunc(body.stop_price));

  const admin = createAdminClient();
  const { error } = await admin.from("stocks").update(patch).eq("stock_code", params.code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `종목 ${params.code} 수동편집`);
  return NextResponse.json({ success: true });
}
