import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/admin/signals/[id] — 개별 매수신호 삭제(관리자 전용). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("buy_signals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `매수신호 삭제 id=${id}`);
  return NextResponse.json({ success: true });
}
