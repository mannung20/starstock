import { StockCard } from "./StockCard";
import { LoginLockedCard, VipLockedCard } from "./LockedCard";
import type { Slot, ViewerRole } from "@/lib/stock-slots";

/**
 * 슬롯 종류 → 렌더링 컴포넌트 대응
 *   real  → StockCard        (실제 종목, 역할별 정보 차등은 StockCard 내부 처리)
 *   login → LoginLockedCard  (비회원 무료구간 잠금, 로그인 버튼)
 *   vip   → VipLockedCard    (VIP 전용 잠금, 첫 번째 카드에만 구독 안내 CTA 표시)
 */
export function StockCardGrid({ slots, role }: { slots: Slot[]; role: ViewerRole }) {
  let firstVipShown = false;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((slot) => {
        if (slot.kind === "real")
          return <StockCard key={slot.rank} stock={slot.stock} role={role} />;
        if (slot.kind === "login")
          return <LoginLockedCard key={slot.rank} rank={slot.rank} />;
        const showCta = !firstVipShown;
        firstVipShown = true;
        return <VipLockedCard key={slot.rank} rank={slot.rank} showCta={showCta} />;
      })}
    </div>
  );
}
