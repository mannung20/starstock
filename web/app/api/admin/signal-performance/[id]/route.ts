import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/signal-performance/[id] — 자동 최고달성률 행 수정(관리자 보정).
 * 편집 가능: max_pct(최고달성률). numeric(6,2) 범위·소수2자리로 정규화.
 * ※ 자동계산값 수동보정 — finalized 행은 이후 추적이 건드리지 않아 값 고정.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "invalid id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const raw = (body as { max_pct?: unknown }).max_pct;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n))
    return NextResponse.json({ error: "max_pct 는 숫자여야 합니다" }, { status: 400 });

  // numeric(6,2): 정수부 4자리 → -9999.99 ~ 9999.99. 소수 2자리 반올림.
  const max_pct = Math.round(Math.min(Math.max(n, -9999.99), 9999.99) * 100) / 100;

  const admin = createAdminClient();
  const { error } = await admin.from("buy_signals").update({ max_pct }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `자동 최고달성률 수정 #${id} → ${max_pct}%`);
  return NextResponse.json({ success: true, max_pct });
}

/** DELETE /api/admin/signal-performance/[id] — 자동 최고달성률 행 삭제(매수신호 이력 1건 제거). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("buy_signals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `자동 최고달성률(매수신호) 삭제 #${id}`);
  return NextResponse.json({ success: true });
}
