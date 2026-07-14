import Link from "next/link";
import { formatPercent } from "@/lib/utils";
import type { StockHistoryRow, HistoryResult } from "@/lib/types";
import type { PerformanceSummary } from "@/lib/server-data";

function returnTone(rate: number | null): string {
  if (rate == null) return "text-muted-foreground";
  if (rate > 0) return "text-up";
  if (rate < 0) return "text-down";
  return "";
}

const RESULT: Record<HistoryResult, { label: string; cls: string }> = {
  profit: { label: "이익", cls: "text-up" },
  loss: { label: "손실", cls: "text-down" },
  hold: { label: "진행중", cls: "text-muted-foreground" },
  cancel: { label: "취소", cls: "text-muted-foreground" },
};

/**
 * 홈 하단 수익률 현황 미리보기 (공지사항 아래).
 * 요약 지표 한 줄 + 최근 마감 종목 리스트. 이력 0건이면 상위(page)에서 렌더 생략.
 */
export function PerformancePreview({
  summary,
  rows,
}: {
  summary: PerformanceSummary;
  rows: StockHistoryRow[];
}) {
  return (
    <section className="container mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">📈 수익률 현황</h2>
        <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">
          전체 보기 →
        </Link>
      </div>

      {/* 요약 지표 한 줄 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
        <span>
          승률 <b className="tabular-nums">{summary.winRate != null ? `${summary.winRate.toFixed(0)}%` : "-"}</b>
          {summary.closed > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({summary.wins}승 {summary.losses}패)
            </span>
          )}
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          평균{" "}
          <b className={`tabular-nums ${returnTone(summary.avgReturn)}`}>
            {formatPercent(summary.avgReturn)}
          </b>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          마감 <b className="tabular-nums">{summary.closed}건</b>
        </span>
      </div>

      {/* 최근 마감 종목 (오늘의 매매종목 표와 동일 스타일) */}
      <div className="w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["종목", "마감일", "수익률", "결과", "비고"].map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = r.result ? RESULT[r.result] : null;
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{r.stock_name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{r.stock_code}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.close_date ?? "-"}</td>
                  <td className={`px-3 py-2 font-semibold tabular-nums ${returnTone(r.return_rate)}`}>
                    {formatPercent(r.return_rate)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-medium ${meta?.cls ?? ""}`}>{meta?.label ?? "-"}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ※ 투자 참고용이며 미래 수익을 보장하지 않습니다.
      </p>
    </section>
  );
}
