import type { StockRow, UserRole } from "@/lib/types";

export type ViewerRole = UserRole | "guest";

/**
 * 화면에 뿌릴 슬롯 1개: 실제 종목 / 로그인 유도(무료) / VIP 유도
 *   real  → StockCard 렌더 (역할별 정보 차등은 StockCard 내부에서 처리)
 *   login → LoginLockedCard (비회원, rank≤freeCount 구간 — 로그인하면 무료 공개)
 *   vip   → VipLockedCard  (비회원/free, rank>freeCount 구간 OR free의 rank>3)
 */
export type Slot =
  | { kind: "real"; rank: number; stock: StockRow }
  | { kind: "login"; rank: number }
  | { kind: "vip"; rank: number };

/**
 * 등급·전체 공개 종목 수를 바탕으로 rank 1..n 슬롯 배열 생성.
 *
 * 슬롯 배치 기준:
 * ┌──────────────────────────────┬──────────────────────────────────────┐
 * │ 조건                          │ 슬롯 종류                             │
 * ├──────────────────────────────┼──────────────────────────────────────┤
 * │ DB에 해당 rank 종목 있음      │ real (모든 역할)                      │
 * │ 없음 + admin/vip             │ 슬롯 미생성 (권한 내 빈 rank는 무시)  │
 * │ 없음 + guest + rank≤freeCount│ login (로그인 유도)                   │
 * │ 없음 + 그 외(free/guest 초과)│ vip (VIP 구독 유도)                   │
 * └──────────────────────────────┴──────────────────────────────────────┘
 *
 * n = max(totalVisible, stocks.length)
 *   totalVisible: is_visible=true AND rank≤10 전체 수 (service_role 집계)
 *   stocks.length: 현재 역할 RLS로 실제 받은 수
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
      slots.push({ kind: "real", rank: r, stock });           // 데이터 있음 → 실제 카드
    } else if (role === "admin" || role === "vip") {
      continue;                                                // 권한 내 빈 rank → 슬롯 미생성 (vip 잠금 오표시 방지)
    } else if (role === "guest" && r <= freeCount) {
      slots.push({ kind: "login", rank: r });                 // 비회원 무료구간 → 로그인 유도
    } else {
      slots.push({ kind: "vip", rank: r });                   // free/guest 초과 → VIP 구독 유도
    }
  }
  return slots;
}

/** 잠긴 VIP 슬롯 개수 (유도 배너 문구용) */
export function lockedVipCount(slots: Slot[]): number {
  return slots.filter((s) => s.kind === "vip").length;
}
