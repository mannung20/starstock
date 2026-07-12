import type { StockRow, UserRole } from "@/lib/types";

export type ViewerRole = UserRole | "guest";

/** 화면에 뿌릴 슬롯 1개: 실제 종목 / 로그인 유도(무료) / VIP 유도 */
export type Slot =
  | { kind: "real"; rank: number; stock: StockRow }
  | { kind: "login"; rank: number }
  | { kind: "vip"; rank: number };

/**
 * 등급·전체 공개 종목 수를 바탕으로 rank 1..totalVisible 슬롯 배열 생성.
 * - 데이터에 있으면 real
 * - 없고 guest이면서 rank<=freeCount → login (로그인하면 무료 공개)
 * - 그 외 → vip (VIP 전용)
 */
export function buildSlots(
  stocks: StockRow[],
  totalVisible: number,
  role: ViewerRole,
  freeCount: number
): Slot[] {
  const byRank = new Map(stocks.map((s) => [s.rank, s]));
  const n = Math.max(totalVisible, stocks.length);
  const slots: Slot[] = [];
  for (let r = 1; r <= n; r++) {
    const stock = byRank.get(r);
    if (stock) {
      slots.push({ kind: "real", rank: r, stock });
    } else if (role === "guest" && r <= freeCount) {
      slots.push({ kind: "login", rank: r });
    } else {
      slots.push({ kind: "vip", rank: r });
    }
  }
  return slots;
}

/** 잠긴 VIP 슬롯 개수 (유도 배너 문구용) */
export function lockedVipCount(slots: Slot[]): number {
  return slots.filter((s) => s.kind === "vip").length;
}
