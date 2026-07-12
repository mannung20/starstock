import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NoticeRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/notices/[id] — 수정/숨김 토글 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Partial<{ title: string; category: string; content: string; is_pinned: boolean; is_hidden: boolean }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Partial<NoticeRow> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.category !== undefined) patch.category = body.category as NoticeRow["category"];
  if (body.content !== undefined) patch.content = body.content;
  if (body.is_pinned !== undefined) patch.is_pinned = body.is_pinned;
  if (body.is_hidden !== undefined) patch.is_hidden = body.is_hidden;

  const admin = createAdminClient();
  const { error } = await admin.from("notices").update(patch).eq("id", Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `공지수정 #${params.id}`);
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/notices/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from("notices").delete().eq("id", Number(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `공지삭제 #${params.id}`);
  return NextResponse.json({ success: true });
}
