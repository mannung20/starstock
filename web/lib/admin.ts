import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminContext {
  userId: string | null;
  email: string | null;
  loggedIn: boolean;
  isAdmin: boolean;
}

function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * 관리자 여부 서버단 검증 (PRD 6-3 / 관리자 접근 보안).
 * admin 판정: profiles.role='admin' OR admin_whitelist 이메일 OR ADMIN_EMAILS 환경변수.
 * 프론트 분기만으론 불충분 → 페이지·API 모두 이 함수로 이중 검증.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, email: null, loggedIn: false, isAdmin: false };

  const email = (user.email ?? "").toLowerCase();
  let isAdmin = envAdminEmails().includes(email);

  if (!isAdmin) {
    // service_role 로 화이트리스트 + 역할 확인 (RLS 우회)
    const admin = createAdminClient();
    const [{ data: wl }, { data: profile }] = await Promise.all([
      admin.from("admin_whitelist").select("email").eq("email", email).maybeSingle(),
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);
    isAdmin = !!wl || (profile as { role?: string } | null)?.role === "admin";
  }

  return { userId: user.id, email: user.email ?? null, loggedIn: true, isAdmin };
});

/** 관리자 작업 감사 로그 (upload_logs, action_type='admin_action'). */
export async function logAdminAction(adminId: string | null, desc: string) {
  try {
    const admin = createAdminClient();
    await admin.from("upload_logs").insert({
      action_type: "admin_action",
      admin_id: adminId,
      action_desc: desc.slice(0, 500),
    });
  } catch {
    // 로깅 실패는 본 작업을 막지 않음
  }
}
