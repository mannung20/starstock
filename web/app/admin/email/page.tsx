import { createAdminClient } from "@/lib/supabase/admin";
import { activeEmailProvider } from "@/lib/email";
import { EmailManager } from "@/components/admin/EmailManager";
import type { EmailLogRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * /admin/email — 이메일 발송 로그 (p4-6 확인용).
 * 발송 건수(오늘/전체) + 최근 100건 + 발송 본문 전문 확인. provider 상태 + 테스트 발송.
 */
export default async function AdminEmailPage() {
  const admin = createAdminClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [{ data: rows }, { count: total }, { count: today }] = await Promise.all([
    admin.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("email_logs").select("*", { count: "exact", head: true }),
    admin.from("email_logs").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
  ]);

  return (
    <EmailManager
      rows={(rows ?? []) as EmailLogRow[]}
      total={total ?? 0}
      today={today ?? 0}
      provider={activeEmailProvider()}
      from={process.env.EMAIL_FROM ?? null}
    />
  );
}
