import { createAdminClient } from "@/lib/supabase/admin";
import { HistoryManager } from "@/components/admin/HistoryManager";
import type { StockHistoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stock_history")
    .select("*")
    .order("close_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);

  return <HistoryManager rows={(data ?? []) as StockHistoryRow[]} />;
}
