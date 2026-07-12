import { createAdminClient } from "@/lib/supabase/admin";
import { NoticesManager } from "@/components/admin/NoticesManager";
import type { NoticeRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export type AdminNotice = Pick<
  NoticeRow,
  "id" | "title" | "category" | "is_pinned" | "is_hidden" | "view_count" | "created_at" | "content"
>;

export default async function AdminNoticesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notices")
    .select("id, title, category, is_pinned, is_hidden, view_count, created_at, content")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return <NoticesManager notices={(data ?? []) as AdminNotice[]} />;
}
