import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/users/[id]/ban — 회원 차단/해제 body: { is_banned: boolean } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { is_banned?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const isBanned = body.is_banned === true;

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("email").eq("id", params.id).maybeSingle();
  const targetEmail = (target as { email?: string } | null)?.email ?? params.id;

  const { error } = await admin.from("profiles").update({ is_banned: isBanned }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `${isBanned ? "차단" : "차단해제"} ${targetEmail}`);
  return NextResponse.json({ success: true });
}
