import { Card, CardContent } from "@/components/ui/card";

export interface RewardConfig {
  refereeDays: number;
  milestones: { stage: number; count: number; days: number }[];
  repeat: { every: number; days: number };
}

/** 보상 구조 시각화 (비로그인 포함 공개). PRD 섹션 17-4 요약 카드. */
export function RewardStructure({ cfg }: { cfg: RewardConfig }) {
  return (
    <section className="container mt-8">
      <h2 className="mb-3 text-lg font-bold">보상 구조</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">친구(피추천인)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">
              VIP {cfg.refereeDays}일
            </div>
            <div className="mt-1 text-xs text-muted-foreground">가입 즉시 지급</div>
          </CardContent>
        </Card>

        {cfg.milestones.map((m) => (
          <Card key={m.stage}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{m.stage}단계 · 추천 {m.count}명</div>
              <div className="mt-1 text-2xl font-bold text-primary">VIP {m.days}일</div>
              <div className="mt-1 text-xs text-muted-foreground">누적 달성 시 (잔여일 합산)</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        🔁 {cfg.milestones.at(-1)?.count ?? 15}명 달성 후에는{" "}
        <span className="font-semibold text-foreground">{cfg.repeat.every}명마다 VIP {cfg.repeat.days}일</span> 을
        무한 반복 지급합니다.
      </p>
    </section>
  );
}
