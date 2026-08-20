import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/server-data";
import { SignalsManager } from "@/components/admin/SignalsManager";
import type { BuySignalRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSignalsPage() {
  // KST 오늘 (Vercel UTC 런타임 보정)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  const admin = createAdminClient();
  const [{ data }, config] = await Promise.all([
    // 기본 프리셋 '전체'와 일치: 날짜 필터 없이 최신 500건(재생/유령 note=null 포함).
    admin
      .from("buy_signals")
      .select("*")
      .order("signaled_at", { ascending: false })
      .limit(500),
    getSiteConfig(),
  ]);

  // 기본값: 표시(true). 명시적으로 "false"일 때만 숨김.
  const homeVisible = config.home_signals_visible !== "false";
  // 홈 공개 기간·건수(관리자 설정). 미설정 시 현행 유지(전체·5건).
  const homeRange = config.home_signals_range ?? "all";
  const homeLimit = Number(config.home_signals_limit ?? "5") || 5;

  return (
    <SignalsManager
      initial={(data ?? []) as BuySignalRow[]}
      today={today}
      homeVisible={homeVisible}
      homeRange={homeRange}
      homeLimit={homeLimit}
    />
  );
}
