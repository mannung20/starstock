import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StocksView } from "@/components/stocks/StocksView";
import { NoticesPreview } from "@/components/home/NoticesPreview";
import { buttonVariants } from "@/components/ui/button";
import {
  getViewer,
  getStocksPayload,
  getSiteConfig,
  getNoticesPreview,
} from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [viewer, payload, config, notices, adminCtx] = await Promise.all([
    getViewer(),
    getStocksPayload(),
    getSiteConfig(),
    getNoticesPreview(5),
    getAdminContext(),
  ]);

  const layout = config.stock_layout === "table" ? "table" : "card";
  const freeCount = Number(config.free_visible_count ?? "3");
  const intervalMin = Number(config.upload_interval_default ?? "5");
  const lockedCount = Math.max(0, payload.total_visible - payload.count);
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
      </main>
      <Footer />
    </>
  );
}
