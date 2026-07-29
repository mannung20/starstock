import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { gradeChangeEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/[id]/role — 회원 등급 변경 (FREE↔VIP) (PRD 5-3 / 9-3)
 * body: { role: 'free'|'vip'|'admin', end_date?: string|null, memo?: string }
 * VIP 승급 시 subscriptions 이력 INSERT. 모든 작업 upload_logs 기록.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { role?: string; end_date?: string | null; memo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role;
  if (role !== "free" && role !== "vip" && role !== "admin") {
    return NextResponse.json({ error: "role must be free/vip/admin" }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = params.id;

  // 대상 프로필 (로그 + 이메일 알림용)
  const { data: target } = await admin
    .from("profiles")
    .select("email, display_name, email_notify")
    .eq("id", userId)
    .maybeSingle();
  const tp = target as
    | { email?: string | null; display_name?: string | null; email_notify?: boolean }
    | null;
  const targetEmail = tp?.email ?? userId;

  const { error: updErr } = await admin
    .from("profiles")
    .update({ role, ...(body.memo != null ? { memo: body.memo } : {}) })
    .eq("id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // VIP 승급 시 구독 이력 기록
  if (role === "vip") {
    const { error: subErr } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan: "vip",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: body.end_date ?? null,
      payment_method: "manual",
      payment_ref: body.memo ?? null,
      processed_by: ctx.userId,
    });
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  await logAdminAction(
    ctx.userId,
    `등급변경 ${targetEmail} → ${role}${body.end_date ? ` (만료 ${body.end_date})` : ""}`
  );

  // p4-6: 등급변경 이메일 알림 (best-effort — provider 미설정/수신거부 시 조용히 생략, 등급변경 성공에는 영향 없음)
  if (tp?.email && tp.email_notify !== false) {
    try {
      const siteUrl = await getSiteUrl(); // 관리자 대표주소 우선 → env → 영구주소
      const tpl = gradeChangeEmail({
        name: tp.display_name ?? undefined,
        newRole: role,
        endDate: body.end_date ?? null,
        siteUrl,
      });
      await sendEmail({ to: tp.email, subject: tpl.subject, html: tpl.html, kind: "grade_change" });
    } catch {
      /* 알림 실패 무시 */
    }
  }

  return NextResponse.json({ success: true });
}
