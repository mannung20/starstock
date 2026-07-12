import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { activeEmailProvider, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/email-test — 현재 활성 이메일 provider 진단(발송 안 함) */
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({
    provider: activeEmailProvider(),
    from: process.env.EMAIL_FROM ?? null,
    hint: "provider=none 이면 RESEND_API_KEY 또는 GMAIL_USER+GMAIL_APP_PASSWORD 를 설정하세요.",
  });
}

/** POST /api/admin/email-test — 관리자 본인에게 테스트 메일 발송 */
export async function POST() {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ctx.email) return NextResponse.json({ error: "관리자 이메일 없음" }, { status: 400 });

  const result = await sendEmail({
    to: ctx.email,
    subject: "[StarStock] 이메일 발송 테스트",
    html: "<p>이 메일이 보이면 이메일 발송이 정상 작동합니다. ✅</p>",
    text: "이 메일이 보이면 이메일 발송이 정상 작동합니다.",
    kind: "test",
  });
  return NextResponse.json(result);
}
