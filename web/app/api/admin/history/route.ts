import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HistoryResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS: HistoryResult[] = ["profit", "loss", "hold", "cancel"];

function toIntOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** POST /api/admin/history — 추천 마감 이력(stock_history) 추가 */
export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const stockCode = String(body.stock_code ?? "").trim();
  if (!stockCode) return NextResponse.json({ error: "종목코드 필수" }, { status: 400 });

  const result = String(body.result ?? "") as HistoryResult;
  if (!RESULTS.includes(result))
    return NextResponse.json({ error: "결과는 profit/loss/hold/cancel 중 하나" }, { status: 400 });

  const entry = toIntOrNull(body.entry_price);
  const exit = toIntOrNull(body.exit_price);

  // 수익률: 진입가·청산가 둘 다 있으면 서버에서 계산 (일관성). 없으면 null.
  const returnRate =
    entry != null && entry > 0 && exit != null
      ? Math.round(((exit - entry) / entry) * 10000) / 100
      : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stock_history")
    .insert({
      stock_code: stockCode,
      stock_name: String(body.stock_name ?? "").trim() || null,
      recommend_date: (body.recommend_date as string) || null,
      close_date: (body.close_date as string) || null,
      entry_price: entry,
      exit_price: exit,
      return_rate: returnRate,
      result,
      notes: String(body.notes ?? "").trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `수익률이력 추가 ${stockCode} ${result}`);
  return NextResponse.json({ success: true, id: (data as { id?: number } | null)?.id });
}
