import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { featureRequestEmail } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/feedback — 기능개선요청(MVP): 관리자에게 이메일 전달, DB 저장 없음.
 * 게이팅: 로그인 필수(401) + 분당 3회 rate-limit(429). 입력 검증/이스케이프 후 sendEmail.
 */

const CATEGORIES = ["기능개선", "버그신고", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // 1) 로그인 필수
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) rate-limit (분당 3회/유저)
  const rl = rateLimit(`feedback:${user.id}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해주세요.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // 3) 입력 파싱 + 검증
  let body: {
    category?: unknown;
    title?: unknown;
    content?: unknown;
    email?: unknown;
    contact?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const category = String(body.category ?? "").trim() as Category;
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const contactEmail = String(body.email ?? "").trim();
  const contact = String(body.contact ?? "").trim();

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "분류를 선택해주세요." }, { status: 400 });
  }
  if (!title || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `제목을 1~${TITLE_MAX}자로 입력해주세요.` },
      { status: 400 }
    );
  }
  if (!content || content.length > CONTENT_MAX) {
    return NextResponse.json(
      { error: `내용을 1~${CONTENT_MAX}자로 입력해주세요.` },
      { status: 400 }
    );
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (contact.length > CONTACT_MAX) {
    return NextResponse.json(
      { error: `연락처는 ${CONTACT_MAX}자 이내로 입력해주세요.` },
      { status: 400 }
    );
  }

  // 4) 수신 관리자 주소 파싱 (envAdminEmails 미export → env 직접 파싱)
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (admins.length === 0) {
    console.error("[feedback] ADMIN_EMAILS 미설정 → 수신자 없음");
    return NextResponse.json(
      { error: "관리자 수신 설정이 없어 접수할 수 없습니다." },
      { status: 500 }
    );
  }

  // 5) 요청자 등급 조회(표시용, best-effort)
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const requesterRole = (prof as { role?: string } | null)?.role ?? "free";

  const submittedAtKst =
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()) + " (KST)";

  // 6) 본문 조립(이스케이프는 featureRequestEmail 내부에서 처리)
  const { subject, html } = featureRequestEmail({
    category,
    title,
    content,
    requesterEmail: user.email ?? "(이메일 없음)",
    requesterRole,
    contactEmail: contactEmail || undefined,
    contact: contact || undefined,
    submittedAtKst,
  });

  const text =
    `[기능개선요청] ${category} - ${title}\n` +
    `요청자: ${user.email ?? "(없음)"} (${requesterRole})\n` +
    (contactEmail ? `회신 이메일: ${contactEmail}\n` : "") +
    (contact ? `연락처: ${contact}\n` : "") +
    `접수: ${submittedAtKst}\n\n${content}`;

  // 7) 발송 (Reply-To = 입력한 회신 이메일 우선, 없으면 계정 이메일)
  const result = await sendEmail({
    to: admins,
    subject,
    html,
    text,
    replyTo: contactEmail || user.email || undefined,
    kind: "feedback",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "전송에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
