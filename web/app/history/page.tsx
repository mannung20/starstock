import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer, getPerformanceData } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import { formatKRW, formatPercent } from "@/lib/utils";
import type { HistoryResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const RESULT: Record<HistoryResult, { label: string; cls: string }> = {
  profit: { label: "이익", cls: "text-up" },
  loss: { label: "손실", cls: "text-down" },
  hold: { label: "진행중", cls: "text-muted-foreground" },
  cancel: { label: "취소", cls: "text-muted-foreground" },
};

function returnTone(rate: number | null): string {
  if (rate == null) return "text-muted-foreground";
  if (rate > 0) return "text-up";
  if (rate < 0) return "text-down";
  return "";
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default async function HistoryPage() {
  const [viewer, adminCtx, { rows, summary }] = await Promise.all([
    getViewer(),
    getAdminContext(),
    getPerformanceData(),
  ]);

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <section className="container">
          <h1 className="text-2xl font-bold">과거 수익률 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            추천했던 종목들의 마감 성과입니다. 투자 참고용이며 미래 수익을 보장하지 않습니다.
          </p>
        </section>

        {/* 요약 통계 */}
        <section className="container mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="전체 추천" value={`${summary.total}건`} sub={`마감 ${summary.closed}건`} />
          <StatCard
            label="승률"
            value={summary.winRate != null ? `${summary.winRate.toFixed(0)}%` : "-"}
            sub={`${summary.wins}승 ${summary.losses}패`}
          />
          <StatCard
            label="평균 수익률"
            value={summary.avgReturn != null ? formatPercent(summary.avgReturn) : "-"}
          />
          <StatCard label="진행중" value={`${summary.total - summary.closed}건`} />
        </section>

        {/* 이력 테이블 */}
        <section className="container mt-6">
          {rows.length === 0 ? (
            <p className="rounded-lg border py-12 text-center text-muted-foreground">
              아직 마감된 추천 이력이 없습니다.
            </p>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {["종목", "추천일", "마감일", "진입가", "청산가", "수익률", "결과", "비고"].map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const meta = r.result ? RESULT[r.result] : null;
                    return (
                      <tr key={r.id} className="border-b hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.stock_name ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{r.stock_code}</div>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.recommend_date ?? "-"}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.close_date ?? "-"}</td>
                        <td className="px-3 py-2 tabular-nums">{formatKRW(r.entry_price)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatKRW(r.exit_price)}</td>
                        <td className={`px-3 py-2 font-semibold tabular-nums ${returnTone(r.return_rate)}`}>
                          {r.return_rate != null ? formatPercent(r.return_rate) : "-"}
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
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
