import { StockCardGrid } from "./StockCardGrid";
import { StockTable } from "./StockTable";
import { buildSlots, type ViewerRole } from "@/lib/stock-slots";
import type { StockRow } from "@/lib/types";

/** site_config.stock_layout('card'|'table')에 따라 카드/테이블 분기 (섹션 14-8-3). */
export function StockLayout({
  stocks,
  role,
  totalVisible,
  freeCount,
  layout,
}: {
  stocks: StockRow[];
  role: ViewerRole;
  totalVisible: number;
  freeCount: number;
  layout: "card" | "table";
}) {
  const slots = buildSlots(stocks, totalVisible, role, freeCount);
  if (slots.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        아직 공개된 추천 종목이 없습니다. 장중에 다시 확인해주세요.
      </p>
    );
  }
  // 카드 레이아웃: 그대로 카드 그리드
  if (layout !== "table") {
    return <StockCardGrid slots={slots} role={role} />;
  }
  // 테이블 레이아웃: 480px 이상은 테이블, 미만은 압축 카드로 자동 전환 (p2-9)
  return (
    <>
      <div className="hidden min-[480px]:block">
        <StockTable slots={slots} role={role} />
      </div>
      <div className="min-[480px]:hidden">
        <StockCardGrid slots={slots} role={role} />
      </div>
    </>
  );
}
