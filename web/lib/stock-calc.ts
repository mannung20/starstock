import type { StockRow, StockStatus } from "@/lib/types";

/** 상승에너지(%) = (현재가-매수기준가)/(목표가-매수기준가)×100. entry_confirmed && target>entry 일 때만. */
export function upEnergy(
  s: Pick<StockRow, "current_price" | "entry_price" | "target_price" | "entry_confirmed">
): number | null {
  if (!s.entry_confirmed) return null;
  const denom = s.target_price - s.entry_price;
  if (denom <= 0) return null;
  const v = ((s.current_price - s.entry_price) / denom) * 100;
  return Math.max(0, v); // 0% 미만은 0
}

/** 남은 상승에너지(%) = (목표가-현재가)/현재가×100 → 목표가 옆 (+N%) */
export function remainingUpPercent(current: number, target: number | null): number | null {
  if (target == null || current <= 0) return null;
  return ((target - current) / current) * 100;
}

/** 하락 위험(%) = (현재가-손절가)/현재가×100 → 손절가 옆 (-N%) */
export function downRiskPercent(current: number, stop: number | null): number | null {
  if (stop == null || current <= 0) return null;
  return ((current - stop) / current) * 100;
}

/** 당일 등락률(%) = (현재가-시가)/시가×100. 시가 0이면 null. */
export function intradayChangePercent(current: number, open: number): number | null {
  if (open <= 0) return null;
  return ((current - open) / open) * 100;
}

/** 추천 N일째 (entry_date 기준, 오늘 포함 1일째). */
export function recommendDays(entryDate: string): number {
  const start = new Date(entryDate + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export interface StatusMeta {
  emoji: string;
  label: string;
  /** tailwind text 색상 클래스 */
  className: string;
}

export function statusMeta(status: StockStatus): StatusMeta {
  switch (status) {
    case "buy":
      return { emoji: "🟢", label: "매수적기", className: "text-emerald-600" };
    case "sell":
      return { emoji: "🔴", label: "손절조심", className: "text-red-600" };
    case "hold":
    default:
      return { emoji: "🟡", label: "관망유지", className: "text-amber-600" };
  }
}

/** 상승에너지 게이지 색상 구간 (섹션 15-10). */
export function energyBand(pct: number): { color: string; badge: string } {
  if (pct > 100) return { color: "#f59e0b", badge: "🎯" };
  if (pct >= 80) return { color: "#ef4444", badge: "🔴🔥" };
  if (pct >= 50) return { color: "#f59e0b", badge: "🟡" };
  return { color: "#3b82f6", badge: "🔵" };
}
