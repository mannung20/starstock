import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/stocks/[rank]/visibility — 종목 행 숨김 토글 (PRD 14-5)
 * body: { is_visible: boolean }. 엑셀 업로드가 이 값을 덮어쓰지 않음.
 */
export async function PATCH(req: NextRequest, { params }: { params: { rank: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { is_visible?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("stocks")
    .update({ is_visible: body.is_visible === true, updated_at: new Date().toISOString() })
    .eq("rank", Number(params.rank));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `종목 rank${params.rank} 표시=${body.is_visible === true}`);
  return NextResponse.json({ success: true });
}
