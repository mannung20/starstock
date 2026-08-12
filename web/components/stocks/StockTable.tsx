import Link from "next/link";
import { StatusSignal } from "./StatusSignal";
import { PriceChange } from "./PriceChange";
import { buttonVariants } from "@/components/ui/button";
import {
  upEnergy,
  remainingUpPercent,
  downRiskPercent,
  recommendDays,
  energyBand,
} from "@/lib/stock-calc";
import { formatKRW, formatPercent } from "@/lib/utils";
import type { StockRow } from "@/lib/types";
import type { Slot, ViewerRole } from "@/lib/stock-slots";

function headers(role: ViewerRole): string[] {
  if (role === "vip")
    return ["순위", "종목명", "현재가", "시가", "고가", "저가", "상태", "목표가", "손절가", "매수기준가", "상승에너지", "투자포인트", "추천일"];
  const base = ["순위", "종목명", "현재가", "상태", "목표가", "손절가", "매수기준가", "투자포인트"];
  if (role === "free") base.push("추천일");
  return base;
}

function priceCell(value: number | null, pct: number | null, showPct: boolean, tone: string) {
  if (value == null) return <span aria-label="잠김">🔒</span>;
  return (
    <span className="tabular-nums">
      {formatKRW(value)}
      {showPct && pct != null && <span className={`ml-1 text-xs ${tone}`}>({formatPercent(pct)})</span>}
    </span>
  );
}

function RealRow({ stock, role }: { stock: StockRow; role: ViewerRole }) {
  const isVip = role === "vip";
  const rem = remainingUpPercent(stock.current_price, stock.target_price);
  const risk = downRiskPercent(stock.current_price, stock.stop_price);
  const energy = isVip ? upEnergy(stock) : null;

  return (
    <tr
      className={`border-b hover:bg-accent/40 ${
        stock.status === "buy" ? "animate-pulse bg-emerald-50 dark:bg-emerald-950/30" : ""
      }`}
    >
      <td className="px-3 py-2 font-bold text-muted-foreground">#{stock.rank}</td>
      <td className="px-3 py-2 font-semibold">{stock.stock_name}</td>
      <td className="px-3 py-2">
        <PriceChange current={stock.current_price} open={stock.open_price} changeRate={stock.change_rate} />
      </td>
      {isVip && <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatKRW(stock.open_price)}</td>}
      {isVip && <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatKRW(stock.high_price)}</td>}
      {isVip && <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatKRW(stock.low_price)}</td>}
      <td className="px-3 py-2"><StatusSignal status={stock.status} /></td>
      <td className="px-3 py-2">{priceCell(stock.target_price, rem, isVip, "text-up")}</td>
      <td className="px-3 py-2">{priceCell(stock.stop_price, risk, isVip, "text-down")}</td>
      {/* 매수기준가(=전일고가): guest=🔒, free/vip=확정 시 값·미확정 시 빈칸 */}
      <td className="px-3 py-2">
        {role === "guest" ? (
          <span aria-label="잠김">🔒</span>
        ) : (
          <span className="tabular-nums">{stock.entry_confirmed ? formatKRW(stock.entry_price) : ""}</span>
        )}
      </td>
      {isVip && (
        <td className="px-3 py-2 tabular-nums">
          {energy != null ? `${Math.round(energy)}% ${energyBand(energy).badge}` : "-"}
        </td>
      )}
      <td className="px-3 py-2 text-muted-foreground">{stock.memo}</td>
      {role !== "guest" && (
        <td className="px-3 py-2 text-muted-foreground">{recommendDays(stock.entry_date)}일째</td>
      )}
    </tr>
  );
}

export function StockTable({ slots, role }: { slots: Slot[]; role: ViewerRole }) {
  const cols = headers(role);
  const loginCount = slots.filter((s) => s.kind === "login").length;
  let firstVipShown = false;

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            if (slot.kind === "real") return <RealRow key={slot.rank} stock={slot.stock} role={role} />;
            if (slot.kind === "login" && slot.rank === slots.find((s) => s.kind === "login")?.rank) {
              return (
                <tr key={`login-${slot.rank}`} className="border-b bg-secondary/40">
                  <td colSpan={cols.length} className="px-3 py-3 text-center text-sm">
                    🔒 로그인하면 {loginCount}개 종목 더 무료 공개{" "}
                    <Link href="/login" className={buttonVariants({ size: "sm", className: "ml-2" })}>구글 로그인</Link>
                  </td>
                </tr>
              );
            }
            if (slot.kind === "login") return null; // 나머지 login 행은 첫 행에 합침
            const showCta = !firstVipShown;
            firstVipShown = true;
            return (
              <tr key={`vip-${slot.rank}`} className="border-b">
                <td className="px-3 py-2 font-bold text-muted-foreground">#{slot.rank}</td>
                <td colSpan={cols.length - 1} className="px-3 py-2">
                  <span className="mr-2 select-none blur-[3px]">░░░░░░░░ ░░░░░ ░░░░ ░░░</span>
                  <span className="font-semibold text-amber-600">⭐ VIP 전용</span>
                  {showCta && (
                    <Link href="/#vip" className={buttonVariants({ size: "sm", variant: "secondary", className: "ml-2" })}>구독 안내 →</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
