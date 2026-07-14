import { createAdminClient } from "@/lib/supabase/admin";
import { HistoryManager } from "@/components/admin/HistoryManager";
import type { StockHistoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  const admin = createAdminClient();
  const [{ data }, { data: cfg }] = await Promise.all([
    admin
      .from("stock_history")
      .select("*")
      .order("close_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("site_config").select("value").eq("key", "home_performance_visible").maybeSingle(),
  ]);

  // 기본값: 표시(true). 명시적으로 "false"일 때만 숨김.
  const homeVisible = (cfg as { value?: string } | null)?.value !== "false";

  return <HistoryManager rows={(data ?? []) as StockHistoryRow[]} homeVisible={homeVisible} />;
}
