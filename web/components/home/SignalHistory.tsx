"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import { formatAchieved } from "@/lib/signal-performance";
import type { BuySignalRow } from "@/lib/types";

/** 발생시각 → "N분 전" 상대 표기(KST 무관, 경과시간 기준). */
function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 홈 매수신호 발생 이력 미리보기 (수익률 현황 아래). 10초 폴링.
 * - 신호 0건이면 렌더 생략.
 * - 표시여부(home_signals_visible) 게이팅은 상위(page.tsx)에서 처리.
 * - 재생신호는 API(RLS)가 제외 → 실운영 신호만 표시.
 */
export function SignalHistory({
  initial,
  isAdmin = false,
}: {
  initial: BuySignalRow[];
  isAdmin?: boolean;
}) {
  const [signals, setSignals] = useState<BuySignalRow[]>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/signals", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { signals: BuySignalRow[] };
        if (alive && Array.isArray(json.signals)) setSignals(json.signals);
      } catch {
        /* 폴링 실패는 조용히 무시(다음 주기 재시도) */
      }
    };
    const id = setInterval(tick, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (signals.length === 0) return null;

  return (
    <section className="container mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">🔔 매수신호 발생 이력</h2>
        {isAdmin && (
          <Link href="/admin/signals" className="text-sm text-muted-foreground hover:text-foreground">
            전체 보기 →
          </Link>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {([
                { h: "종목" }, { h: "발생시각" }, { h: "매수기준가", r: true }, { h: "달성률", r: true },
              ] as { h: string; r?: boolean }[]).map(({ h, r }, i) => (
                <th key={i} className={`whitespace-nowrap px-3 py-2 font-medium${r ? " text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2">
                  <div className="font-semibold">{s.stock_name || "-"}</div>
                  <div className="text-xs text-muted-foreground">{s.stock_code}</div>
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{timeAgo(s.signaled_at)}</td>
                <td className="px-3 py-2 tabular-nums font-semibold text-right">{formatKRW(s.entry_price)}</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  {s.finalized
                    ? <span className="font-semibold text-up">{formatAchieved(s.max_pct)}</span>
                    : <span className="text-muted-foreground text-xs">추적 중 {s.max_pct > 0 ? `+${s.max_pct.toFixed(1)}%` : ""}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">※ 매수신호는 투자 참고용입니다.</p>
    </section>
  );
}
