import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["notice", "market", "performance", "event"];

/** POST /api/admin/notices — 공지 작성 */
export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { title?: string; category?: string; content?: string; is_pinned?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title?.trim()) return NextResponse.json({ error: "제목 필수" }, { status: 400 });
  const category = CATEGORIES.includes(body.category ?? "") ? body.category! : "notice";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notices")
    .insert({
      title: body.title.trim(),
      category: category as "notice" | "market" | "performance" | "event",
      content: body.content ?? null,
      is_pinned: body.is_pinned === true,
      is_hidden: false,
      author_id: ctx.userId,
    })
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `공지작성 "${body.title.trim().slice(0, 30)}"`);
  return NextResponse.json({ success: true, id: (data as { id?: number } | null)?.id });
}
