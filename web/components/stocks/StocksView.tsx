"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StockLayout } from "./StockLayout";
import { RefreshBar } from "./RefreshBar";
import { Button } from "@/components/ui/button";
import type { StockRow } from "@/lib/types";
import type { ViewerRole } from "@/lib/stock-slots";

export interface StocksApiResponse {
  role: ViewerRole;
  count: number;
  total_visible: number;
  stocks: StockRow[];
  server_time: string;
}

function newestDataISO(stocks: StockRow[]): string | null {
  if (stocks.length === 0) return null;
  return stocks.reduce((a, b) => (a > b.updated_at ? a : b.updated_at), stocks[0].updated_at);
}

/** 메인 종목 뷰: N분 주기 폴링(GET /api/stocks) + 레이아웃 렌더 (PRD 3-6 폴링 확정). */
export function StocksView({
  initial,
  freeCount,
  layout,
  intervalMs,
}: {
  initial: StocksApiResponse;
  freeCount: number;
  layout: "card" | "table";
  intervalMs: number;
}) {
  const [data, setData] = useState<StocksApiResponse>(initial);
  const [lastPollMs, setLastPollMs] = useState<number>(Date.now());
  const [stale, setStale] = useState(false);
  const [mobileView, setMobileView] = useState(false); // 모바일보기: 압축 카드 강제
  const busy = useRef(false);

  const effectiveLayout: "card" | "table" = mobileView ? "card" : layout;

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/stocks", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as StocksApiResponse;
      setData(json);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      setLastPollMs(Date.now());
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const t = setInterval(poll, intervalMs);
    return () => clearInterval(t);
  }, [poll, intervalMs]);

  return (
    <div className="space-y-4">
      <RefreshBar
        lastDataISO={newestDataISO(data.stocks)}
        lastPollMs={lastPollMs}
        intervalMs={intervalMs}
        stale={stale}
      />
      {layout === "table" && (
        <div className="container flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="sm:hidden"
            onClick={() => setMobileView((v) => !v)}
          >
            {mobileView ? "📊 표 보기" : "📱 모바일 보기"}
          </Button>
        </div>
      )}
      <div className="container">
        <StockLayout
          stocks={data.stocks}
          role={data.role}
          totalVisible={data.total_visible}
          freeCount={freeCount}
          layout={effectiveLayout}
        />
      </div>
    </div>
  );
}
