import { createAdminClient } from "@/lib/supabase/admin";
import { SiteManager } from "@/components/admin/SiteManager";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const admin = createAdminClient();
  const { data } = await admin.from("site_config").select("key, value");
  const rows = (data ?? []) as { key: string; value: string }[];
  const config = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return <SiteManager config={config} />;
}
