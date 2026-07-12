import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidRefCode } from "@/lib/referral";
import { sendEmail } from "@/lib/email";
import { referralRewardEmail } from "@/lib/email-templates";

type GrantedReward = { user: string; days: number; reason: string };

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

  const refCode = cookies().get("ref")?.value;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // 추천 처리: ref 쿠키 + 로그인 사용자 → RPC (self/중복/차단은 RPC 내부에서 검증)
    if (isValidRefCode(refCode)) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
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
