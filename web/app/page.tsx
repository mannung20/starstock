import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StocksView } from "@/components/stocks/StocksView";
import { NoticesPreview } from "@/components/home/NoticesPreview";
import { PerformancePreview } from "@/components/home/PerformancePreview";
import { SignalHistory } from "@/components/home/SignalHistory";
import { buttonVariants } from "@/components/ui/button";
import {
  getViewer,
  getStocksPayload,
  getSiteConfig,
  getNoticesPreview,
  getPerformanceData,
  getBuySignals,
} from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const gate = await MaintenanceGate();
  if (gate) return gate;

  const [viewer, payload, config, notices, adminCtx, perf, signals] = await Promise.all([
    getViewer(),
    getStocksPayload(),
    getSiteConfig(),
    getNoticesPreview(5),
    getAdminContext(),
    getPerformanceData(),
    getBuySignals(5),
  ]);

  // 홈 미리보기: 수익률이 확정된(마감) 최근 종목 3개만. 관리자 설정으로 숨김 가능(기본 표시).
  const showPerf = config.home_performance_visible !== "false";
  const perfRows = showPerf ? perf.rows.filter((r) => r.return_rate != null).slice(0, 3) : [];

  // 매수신호 이력: 관리자 표시설정(기본 표시) && 신호 1건 이상일 때만.
  const showSignals = config.home_signals_visible !== "false";

  const layout = config.stock_layout === "table" ? "table" : "card";
  const freeCount = Number(config.free_visible_count ?? "3");   // free 역할 공개 종목 수 (관리자 설정)
  const intervalMin = Number(config.upload_interval_default ?? "5");

  // lockedCount: 현재 역할에서 잠긴 종목 수 → VIP 배너 문구 "VIP 전용 N개 잠김"에 사용
  //   total_visible = is_visible=true AND rank≤10 전체 수 (vip/admin 기준 전체 풀)
  //   payload.count = 현재 역할 RLS로 실제 받은 수
  const lockedCount = Math.max(0, payload.total_visible - payload.count);

  // isMember: vip와 admin을 동일하게 취급 → VIP 배너 숨김 기준
  // (admin은 관리 목적으로 로그인하므로 VIP 구독 유도 배너 불필요)
  const isMember = viewer.role === "vip" || viewer.role === "admin";

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-4">
        {/* 비회원 상단 유도 배너 */}
        {viewer.role === "guest" && (
          <div className="container">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/50 px-4 py-3 text-sm">
              <span>🔔 무료 로그인하면 {freeCount}개 종목이 즉시 공개됩니다</span>
              <Link href="/login" className={buttonVariants({ size: "sm" })}>구글로 로그인</Link>
            </div>
          </div>
        )}

        <StocksView
          initial={payload}
          freeCount={freeCount}
          layout={layout}
          intervalMs={intervalMin * 60_000}
          buyAlert={{
            imageEnabled: config.buy_alert_image_enabled === "true",
            imageUrl: config.buy_alert_image_url ?? "",
            imageDuration: Number(config.buy_alert_image_duration ?? "30") || 30,
            soundEnabled: config.buy_alert_sound_enabled === "true",
            soundUrl: config.buy_alert_sound_url ?? "",
          }}
        />

        {/* VIP 유도 배너 (비회원/무료회원) */}
        {!isMember && lockedCount > 0 && (
          <div className="container mt-6" id="vip">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm dark:bg-amber-950/20">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                ⭐ VIP 전용 {lockedCount}개 종목이 잠겨 있습니다
              </span>
              <Link href="/notice" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                VIP 구독 안내
              </Link>
            </div>
          </div>
        )}

        <NoticesPreview notices={notices} />

        {perfRows.length > 0 && (
          <PerformancePreview summary={perf.summary} rows={perfRows} />
        )}

        {showSignals && signals.length > 0 && (
          <SignalHistory initial={signals} isAdmin={adminCtx.isAdmin} />
        )}
      </main>
      <Footer />
    </>
  );
}
