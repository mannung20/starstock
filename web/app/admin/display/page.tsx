import { createAdminClient } from "@/lib/supabase/admin";
import { DisplayManager } from "@/components/admin/DisplayManager";
import type { DisplayConfigRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDisplayPage() {
  const admin = createAdminClient();
  const [{ data: dc }, { data: sc }] = await Promise.all([
    admin.from("display_config").select("*").order("display_order"),
    admin.from("site_config").select("value").eq("key", "stock_layout").maybeSingle(),
  ]);
  const layout = ((sc as { value?: string } | null)?.value === "table" ? "table" : "card") as "card" | "table";
  return <DisplayManager rows={(dc ?? []) as DisplayConfigRow[]} layout={layout} />;
}
