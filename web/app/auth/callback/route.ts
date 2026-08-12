import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidRefCode } from "@/lib/referral";
import { sendEmail } from "@/lib/email";
import { referralRewardEmail, newSignupEmail } from "@/lib/email-templates";

type GrantedReward = { user: string; days: number; reason: string };

/**
 * 신규 가입(최초 로그인) 시 관리자에게 알림 메일 발송.
 * created_at이 60초 이내면 신규 가입으로 판정.
 * site_config의 notify_admin_on_signup=true 일 때만 발송 (best-effort).
 */
async function notifyAdminOnNewSignup(
  user: { email: string | null; created_at: string; user_metadata?: Record<string, unknown> },
  siteUrl: string
): Promise<void> {
  const diffMs = Date.now() - new Date(user.created_at).getTime();
  if (diffMs >= 60_000) return; // 기존 회원 → 건너뜀

  const admin = createAdminClient();
  const { data: cfgRows } = await admin
    .from("site_config")
    .select("key, value")
    .in("key", ["notify_admin_on_signup", "notify_admin_email"]);
  const cfg = Object.fromEntries(
    ((cfgRows ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value])
  );

  if (cfg.notify_admin_on_signup !== "true") return;
  const adminEmail = (cfg.notify_admin_email ?? "").trim();
  if (!adminEmail) return;

  const kst = new Date(user.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const tpl = newSignupEmail({
    userEmail: user.email ?? "알 수 없음",
    displayName: user.user_metadata?.full_name as string | undefined,
    joinedAt: `${kst} (KST)`,
    adminUrl: `${siteUrl}/admin/users`,
  });
  await sendEmail({ to: adminEmail, subject: tpl.subject, html: tpl.html, kind: "signup_notify" });
}

/**
 * p4-6: process_referral 이 반환한 이번 지급 보상(granted)을 수혜자에게 이메일 알림.
 * best-effort — provider 미설정/수신거부/개별 실패는 조용히 건너뜀(로그인 흐름 무방해).
 */
async function notifyReferralRewards(
  admin: ReturnType<typeof createAdminClient>,
  rpcData: unknown,
  siteUrl: string
): Promise<void> {
  const result = rpcData as { ok?: boolean; granted?: GrantedReward[] } | null;
  const granted = result?.ok ? result.granted : undefined;
  if (!granted || granted.length === 0) return;

  const ids = Array.from(new Set(granted.map((g) => g.user)));
  const { data: profs } = await admin
    .from("profiles")
    .select("id, email, display_name, email_notify")
    .in("id", ids);
  const pmap = new Map(
    (
      (profs ?? []) as {
        id: string;
        email: string | null;
        display_name: string | null;
        email_notify: boolean;
      }[]
    ).map((p) => [p.id, p])
  );

  for (const g of granted) {
    const p = pmap.get(g.user);
    if (!p?.email || p.email_notify === false) continue;
    const tpl = referralRewardEmail({
      name: p.display_name ?? undefined,
      rewardDays: g.days,
      reason: g.reason,
      siteUrl,
    });
    try {
      await sendEmail({ to: p.email, subject: tpl.subject, html: tpl.html, kind: "referral_reward" });
    } catch {
      /* 개별 발송 실패 무시 */
    }
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google OAuth 콜백. code → 세션 교환 후 홈(또는 next)으로 리다이렉트.
 * ※ Supabase Dashboard > Auth > Redirect URLs 에 이 경로 등록 필요.
 * 추천 처리(섹션 17-7): ref 쿠키가 있으면 process_referral RPC 를 서버사이드 호출.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  // OAuth 에러(user_banned, access_denied 등) → 팝업/일반 플로우 분기
  if (errorParam) {
    const msg =
      errorCode === "user_banned"
        ? "차단된 계정입니다. 관리자에게 문의하세요."
        : (searchParams.get("error_description")?.replace(/\+/g, " ") ?? errorParam);
    // 팝업 플로우: popup-close 에 에러 전달 → postMessage 로 부모에게 전파 후 닫힘
    if (next === "/auth/popup-close") {
      return NextResponse.redirect(`${origin}/auth/popup-close?error=${encodeURIComponent(msg)}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  const refCode = cookies().get("ref")?.value;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 신규 가입 알림 (best-effort — 로그인 흐름을 막지 않음)
      try {
        await notifyAdminOnNewSignup({ ...user, email: user.email ?? null }, origin);
      } catch { /* 발송 실패 무시 */ }

      // 추천 처리: ref 쿠키 + 로그인 사용자 → RPC (self/중복/차단은 RPC 내부에서 검증)
      if (isValidRefCode(refCode)) {
        try {
          const admin = createAdminClient();
          const { data: rpcData } = await admin.rpc("process_referral", {
            p_referee: user.id,
            p_ref_code: refCode,
          });
          // p4-6: 이번 지급된 보상(referee 웰컴 / 추천인 마일스톤)을 이메일 알림
          await notifyReferralRewards(admin, rpcData, origin);
        } catch {
          // 추천 처리 실패는 로그인 흐름을 막지 않는다 (best-effort)
        }
      }
    }
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  // 1회성 쿠키 → 성공/실패 무관 제거
  if (refCode) res.cookies.delete("ref");
  return res;
}
