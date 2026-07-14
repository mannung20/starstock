import "server-only";
import type { EmailKind } from "@/lib/types";

/**
 * Provider 무관 이메일 발송 어댑터.
 * 우선순위: RESEND_API_KEY → Resend(HTTP) / GMAIL_USER+GMAIL_APP_PASSWORD → Gmail(SMTP) / 없으면 no-op.
 * 운영자는 택한 provider 의 키만 넣으면 됨. 미설정 시 발송을 조용히 건너뛰어(앱 흐름 안 막음) 개발 가능.
 *
 * 필요한 환경변수(.env.local / Vercel):
 *   - Resend: RESEND_API_KEY  (+ EMAIL_FROM="StarStock <noreply@yourdomain>")
 *   - Gmail : GMAIL_USER=you@gmail.com, GMAIL_APP_PASSWORD=앱비밀번호(2FA)  (+ EMAIL_FROM 선택)
 */

export type EmailProvider = "resend" | "gmail" | "none";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[]; // 답장 수신 주소(관리자→요청자 직접 회신용). Resend reply_to 필드로 전달.
  kind?: EmailKind; // email_logs 분류용 (미지정 시 'other')
}

export interface SendResult {
  ok: boolean;
  provider: EmailProvider;
  skipped?: boolean; // provider 미설정으로 발송 생략
  id?: string;
  error?: string;
}

/** 현재 활성 provider (환경변수 기준). */
export function activeEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  return "none";
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.GMAIL_USER ||
    "StarStock <onboarding@resend.dev>"
  );
}

/** 이메일 발송(디스패처). 실패해도 throw 하지 않고 SendResult 로 반환. 매 발송을 email_logs 에 기록. */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const provider = activeEmailProvider();
  const toList = Array.isArray(input.to) ? input.to : [input.to];
  let result: SendResult;
  try {
    if (provider === "resend") result = await sendViaResend(input, toList);
    else if (provider === "gmail") result = await sendViaGmail(input, toList);
    else {
      // 미설정 → no-op (개발/미배포): 로깅만 하고 성공 취급(skipped)
      console.log(
        `[email:skip] provider 미설정 → 발송 생략 (to=${toList.join(",")}, subject="${input.subject}")`
      );
      result = { ok: true, provider: "none", skipped: true };
    }
  } catch (e) {
    const error = (e as Error).message ?? "unknown";
    console.error(`[email:error] provider=${provider} ${error}`);
    result = { ok: false, provider, error };
  }
  await logEmail(input, toList, result);
  return result;
}

/** 발송 로그 저장 (email_logs, best-effort). 본문 HTML 전문 저장 → 관리자 페이지에서 확인. */
async function logEmail(input: SendEmailInput, to: string[], result: SendResult): Promise<void> {
  try {
    const status = result.skipped ? "skipped" : result.ok ? "sent" : "failed";
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient()
      .from("email_logs")
      .insert({
        kind: input.kind ?? "other",
        recipient: to.join(", ").slice(0, 255),
        subject: input.subject,
        body: input.html,
        provider: result.provider,
        status,
        error: result.error ?? null,
      });
  } catch {
    // 로그 실패는 발송 결과에 영향 없음
  }
}

async function sendViaResend(input: SendEmailInput, to: string[]): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, provider: "resend", id: data.id };
}

async function sendViaGmail(input: SendEmailInput, to: string[]): Promise<SendResult> {
  // nodemailer 는 Gmail 경로에서만 동적 로드 (Resend 전용 배포는 불필요)
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
  const info = await transport.sendMail({
    from: fromAddress(),
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { ok: true, provider: "gmail", id: info.messageId };
}
