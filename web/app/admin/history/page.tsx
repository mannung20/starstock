import { createAdminClient } from "@/lib/supabase/admin";
import { HistoryManager } from "@/components/admin/HistoryManager";
import type { StockHistoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  const admin = createAdminClient();
  const [{ data }, { data: cfg }, { data: bridgeCfg }] = await Promise.all([
    admin
      .from("stock_history")
      .select("*")
      .order("close_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("site_config").select("value").eq("key", "home_performance_visible").maybeSingle(),
    admin
      .from("site_config")
      .select("key, value")
      .in("key", ["auto_bridge_enabled", "auto_bridge_min_pct", "auto_bridge_full_only"]),
  ]);

  // 기본값: 표시(true). 명시적으로 "false"일 때만 숨김.
  const homeVisible = (cfg as { value?: string } | null)?.value !== "false";

  // 자동 승격(브릿지) 설정 — 10_signal_bridge.sql seed. 기본 off/5/full.
  const bmap = new Map(
    ((bridgeCfg ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value])
  );
  const bridge = {
    enabled: bmap.get("auto_bridge_enabled") === "true",
    minPct: Number(bmap.get("auto_bridge_min_pct") ?? "5") || 5,
    fullOnly: bmap.get("auto_bridge_full_only") !== "false",
  };

  return (
    <HistoryManager
      rows={(data ?? []) as StockHistoryRow[]}
      homeVisible={homeVisible}
      bridge={bridge}
    />
  );
}
