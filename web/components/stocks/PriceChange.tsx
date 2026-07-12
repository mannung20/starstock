"use client";

import { useEffect, useRef, useState } from "react";
import { intradayChangePercent } from "@/lib/stock-calc";
import { formatKRW, formatPercent, cn } from "@/lib/utils";

/**
 * 현재가 + 당일 등락률(▲/▼) 표시. 현재가 변동 시 상승=빨강/하락=파랑 깜빡임 애니메이션.
 * (한국 증시 관례 색상)
 */
export function PriceChange({
  current,
  open,
  showPrice = true,
}: {
  current: number;
  open: number;
  showPrice?: boolean;
}) {
  const change = intradayChangePercent(current, open);
  const prev = useRef(current);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const previous = prev.current;
    if (current > previous) setFlash("up");
    else if (current < previous) setFlash("down");
    prev.current = current;
  }, [current]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [flash]);

  const up = change != null && change > 0;
  const down = change != null && change < 0;
  const colorCls = up ? "text-up" : down ? "text-down" : "text-muted-foreground";
  const arrow = up ? "▲" : down ? "▼" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1",
        flash === "up" && "animate-flash-up",
        flash === "down" && "animate-flash-down"
      )}
    >
      {showPrice && <span className="font-bold tabular-nums">{formatKRW(current)}원</span>}
      {change != null && (
        <span className={cn("text-sm font-semibold tabular-nums", colorCls)}>
          {arrow} {formatPercent(change)}
        </span>
      )}
    </span>
  );
}
