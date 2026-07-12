import { energyBand } from "@/lib/stock-calc";

/**
 * 상승에너지 게이지 바 (VIP 전용, entry_confirmed=true 일 때만 렌더 호출).
 * 색상 구간: 0~50 파랑 / 50~80 노랑 / 80~100 빨강🔥 / 100+ 금색🎯 (섹션 15-10).
 */
export function EnergyGauge({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const { color, badge } = energyBand(pct);
  const isPeak = pct >= 80 && pct <= 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>상승 에너지</span>
        <span className="font-semibold text-foreground">
          {Math.round(pct)}% {badge}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={isPeak ? "h-full animate-pulse rounded-full" : "h-full rounded-full"}
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            transition: "width 0.8s ease, background-color 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
