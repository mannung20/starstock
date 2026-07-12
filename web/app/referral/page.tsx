import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RewardStructure, type RewardConfig } from "@/components/referral/RewardStructure";
import { ReferralPanel } from "@/components/referral/ReferralPanel";
import { getViewer, getSiteConfig } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ReferralPage() {
  const [viewer, config, adminCtx] = await Promise.all([
    getViewer(),
    getSiteConfig(),
    getAdminContext(),
  ]);

  const n = (k: string, d: number) => {
    const v = Number(config[k]);
    return Number.isFinite(v) && v > 0 ? v : d;
  };

  const cfg: RewardConfig = {
    refereeDays: n("referral_referee_days", 7),
    milestones: [
      { stage: 1, count: n("referral_milestone_1_count", 3), days: n("referral_milestone_1_days", 14) },
      { stage: 2, count: n("referral_milestone_2_count", 7), days: n("referral_milestone_2_days", 30) },
      { stage: 3, count: n("referral_milestone_3_count", 15), days: n("referral_milestone_3_days", 60) },
    ],
    repeat: { every: n("referral_repeat_count", 5), days: n("referral_repeat_days", 14) },
  };

  const loggedIn = viewer.role !== "guest";
  const enabled = (config.referral_enabled ?? "true") === "true";

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <section className="container">
          <h1 className="text-2xl font-bold">친구 추천하고 VIP 받기</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            내 링크로 친구가 가입하면 친구도 나도 VIP 혜택. 많이 추천할수록 보상이 커집니다.
          </p>
        </section>

        {enabled ? (
          <>
            <ReferralPanel loggedIn={loggedIn} />
            <RewardStructure cfg={cfg} />
          </>
        ) : (
          <section className="container mt-8 text-sm text-muted-foreground">
            추천 이벤트가 현재 일시 중지되었습니다.
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
