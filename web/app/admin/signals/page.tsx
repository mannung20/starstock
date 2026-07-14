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
    admin
      .from("buy_signals")
      .select("*")
      .eq("trade_date", today)
      .order("signaled_at", { ascending: false })
      .limit(500),
    getSiteConfig(),
  ]);

  // 기본값: 표시(true). 명시적으로 "false"일 때만 숨김.
  const homeVisible = config.home_signals_visible !== "false";

  return (
    <SignalsManager
      initial={(data ?? []) as BuySignalRow[]}
      today={today}
      homeVisible={homeVisible}
    />
  );
}
