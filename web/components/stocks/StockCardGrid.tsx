import { StockCard } from "./StockCard";
import { LoginLockedCard, VipLockedCard } from "./LockedCard";
import type { Slot, ViewerRole } from "@/lib/stock-slots";

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
