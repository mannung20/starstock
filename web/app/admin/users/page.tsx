import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "@/components/admin/UsersTable";
import type { ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export type AdminUser = Pick<
  ProfileRow,
  "id" | "email" | "role" | "is_banned" | "joined_at" | "last_login" | "memo"
>;

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, role, is_banned, joined_at, last_login, memo")
    .order("joined_at", { ascending: false })
    .limit(500);

  const users = (data ?? []) as AdminUser[];
  return <UsersTable users={users} />;
}
