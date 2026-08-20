import { Card, CardContent } from "@/components/ui/card";
import { StatusSignal } from "./StatusSignal";
import { PriceChange } from "./PriceChange";
import { EnergyGauge } from "./EnergyGauge";
import {
  upEnergy,
  remainingUpPercent,
  downRiskPercent,
  recommendDays,
} from "@/lib/stock-calc";
import { formatKRW, formatPercent } from "@/lib/utils";
import type { StockRow } from "@/lib/types";
import type { ViewerRole } from "@/lib/stock-slots";

/**
 * 역할별 가격 표시 기준
 * guest → 목표가/손절가/매수기준가 모두 🔒 (서버에서도 null 처리됨)
 * free  → 금액만 표시, % 없음
 * vip   → 금액 + 남은상승률/하락위험 %
 * admin → vip 동일 (isVip=true 처리)
 */
function PriceTargets({ stock, role }: { stock: StockRow; role: ViewerRole }) {
  const isVip = role === "vip" || role === "admin"; // admin도 VIP 수준 정보 표시
  const rem = remainingUpPercent(stock.current_price, stock.target_price);
  const risk = downRiskPercent(stock.current_price, stock.stop_price);

  const cell = (label: string, value: number | null, pct: number | null, tone: string) => (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value == null ? (
        <span aria-label="잠김">🔒</span>
      ) : (
        <span className="tabular-nums font-medium">
          {formatKRW(value)}원
          {isVip && pct != null && <span className={`ml-1 ${tone}`}>({formatPercent(pct)})</span>}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-1 border-t pt-2">
      {cell("목표가", stock.target_price, rem, "text-up")}
      {cell("손절가", stock.stop_price, risk, "text-down")}
      {/* 매수기준가(=전일고가): guest=🔒, free/vip=확정 시 값·미확정 시 빈칸 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">매수기준가</span>
        {role === "guest" ? (
          <span aria-label="잠김">🔒</span>
        ) : (
          <span className="tabular-nums font-medium">
            {stock.entry_confirmed ? `${formatKRW(stock.entry_price)}원` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function StockCard({ stock, role }: { stock: StockRow; role: ViewerRole }) {
  const isVip = role === "vip" || role === "admin"; // admin도 VIP 수준 정보 표시
  const energy = isVip ? upEnergy(stock) : null;

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${
        stock.is_visible === false
          ? "border-dashed opacity-60"                                   // 관리자에게만 오는 숨김 종목
          : stock.status === "buy"
            ? "animate-pulse border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            : ""
      }`}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-muted-foreground">#{stock.rank}</span>
            <span className="text-base font-bold">{stock.stock_name}</span>
            {stock.is_visible === false && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">숨김</span>
            )}
          </div>
          <PriceChange current={stock.current_price} open={stock.open_price} changeRate={stock.change_rate} showPrice={false} />
        </div>

        <div className="text-lg font-bold tabular-nums">{formatKRW(stock.current_price)}원</div>

        {isVip && (
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
            <span>시가 {formatKRW(stock.open_price)}</span>
            <span>고가 {formatKRW(stock.high_price)}</span>
            <span>저가 {formatKRW(stock.low_price)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <StatusSignal status={stock.status} />
          {role !== "guest" && (
            <span className="text-xs text-muted-foreground">추천 {recommendDays(stock.entry_date)}일째</span>
          )}
        </div>

        <PriceTargets stock={stock} role={role} />

        {isVip && energy != null && (
          <div className="border-t pt-2">
            <EnergyGauge pct={energy} />
          </div>
        )}

        {stock.memo && <p className="border-t pt-2 text-sm text-muted-foreground">{stock.memo}</p>}
      </CardContent>
    </Card>
  );
}
