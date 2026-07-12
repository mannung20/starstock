import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { genReferralCode } from "@/lib/referral";
import type { ReferralLogRow, ReferralRewardRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REF_KEYS = [
  "referral_enabled",
  "referral_milestone_1_count", "referral_milestone_1_days",
  "referral_milestone_2_count", "referral_milestone_2_days",
  "referral_milestone_3_count", "referral_milestone_3_days",
  "referral_referee_days", "referral_repeat_count", "referral_repeat_days",
] as const;

/** profiles.referral_code 가 없으면 유니크 코드 생성해 저장(충돌 시 재시도). 최종 코드 반환. */
async function ensureReferralCode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  current: string | null
): Promise<string | null> {
  if (current) return current;
  for (let i = 0; i < 6; i++) {
    const candidate = genReferralCode();
    const { error } = await admin
      .from("profiles")
      .update({ referral_code: candidate })
      .eq("id", userId)
      .is("referral_code", null);
    if (!error) break; // 성공 or 이미 채워짐 → 아래서 재조회
    if (error.code !== "23505") break; // unique 위반 외 오류는 중단
  }
  const { data } = await admin
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();
  return (data as { referral_code: string | null } | null)?.referral_code ?? null;
}

/**
 * GET /api/referral/me — 내 추천 현황 (PRD api-11 / 섹션 17-7).
 * referral_code lazy 생성 + 누적/미읽음/로그/보상/다음 마일스톤/반복 안내.
 */
export async function GET() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();

  // 프로필(추천코드) + 설정 + 로그 + 보상 병렬 조회
  const [profileRes, cfgRes, logsRes, rewardsRes] = await Promise.all([
    admin.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
    admin.from("site_config").select("key, value").in("key", REF_KEYS as unknown as string[]),
    admin
      .from("referral_logs")
      .select("id, referee_email, joined_at, is_read")
      .eq("referrer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(100),
    admin
      .from("referral_rewards")
      .select("id, milestone, reward_days, reward_type, rewarded_at")
      .eq("referrer_id", user.id)
      .order("rewarded_at", { ascending: false }),
  ]);

  const cfg = new Map(
    ((cfgRes.data ?? []) as { key: string; value: string | null }[]).map((r) => [r.key, r.value])
  );
  const num = (k: string, d: number) => {
    const v = Number(cfg.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };

  const c1 = num("referral_milestone_1_count", 3);
  const d1 = num("referral_milestone_1_days", 14);
  const c2 = num("referral_milestone_2_count", 7);
  const d2 = num("referral_milestone_2_days", 30);
  const c3 = num("referral_milestone_3_count", 15);
  const d3 = num("referral_milestone_3_days", 60);
  const repeatCount = num("referral_repeat_count", 5);
  const repeatDays = num("referral_repeat_days", 14);

  const code = await ensureReferralCode(
    admin,
    user.id,
    (profileRes.data as { referral_code: string | null } | null)?.referral_code ?? null
  );

  const logs = (logsRes.data ?? []) as Pick<
    ReferralLogRow, "id" | "referee_email" | "joined_at" | "is_read"
  >[];
  const rewards = (rewardsRes.data ?? []) as Pick<
    ReferralRewardRow, "id" | "milestone" | "reward_days" | "reward_type" | "rewarded_at"
  >[];

  // milestone=0(피추천인 웰컴)은 추천 성과가 아니므로 추천인 카운트에서만 제외 (로그 기준)
  const totalCount = logs.length;
  const unreadCount = logs.filter((l) => !l.is_read).length;

  // 다음 마일스톤 계산
  const stages = [
    { stage: 1, count: c1, days: d1 },
    { stage: 2, count: c2, days: d2 },
    { stage: 3, count: c3, days: d3 },
  ];
  const nextStage = stages.find((s) => totalCount < s.count);
  const nextMilestone = nextStage
    ? { ...nextStage, remaining: nextStage.count - totalCount }
    : null;

  // 반복 지급(3단계 이후) 다음 도달 인원
  const repeatNextAt =
    totalCount >= c3
      ? c3 + repeatCount * (Math.floor((totalCount - c3) / repeatCount) + 1)
      : null;

  return NextResponse.json({
    enabled: (cfg.get("referral_enabled") ?? "true") === "true",
    referral_code: code,
    join_path: code ? `/join?ref=${code}` : null,
    total_count: totalCount,
    unread_count: unreadCount,
    logs,
    rewards,
    next_milestone: nextMilestone,
    repeat_info: { every: repeatCount, days: repeatDays, next_at: repeatNextAt },
  });
}
