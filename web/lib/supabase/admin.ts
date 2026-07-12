import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * service_role 키를 사용하는 관리자 클라이언트.
 * ⚠️ RLS를 우회하므로 서버사이드(라우트 핸들러)에서만 사용.
 * 엑셀 업로드(Upsert All), 관리자 API 등 권한 필요 작업 전용.
 */
export function createAdminClient() {
  const { supabaseUrl, serviceRoleKey } = serverEnv();
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Next.js 는 서버 fetch 를 URL 단위로 캐싱한다(Data Cache). supabase-js 도 fetch 를
    // 쓰므로, 캐싱되면 관리자 조회가 stale 데이터를 반환한다(예: /api/stocks/status 가
    // 빈 테이블 시점 응답을 계속 재사용). admin 클라이언트는 항상 실시간이어야 하므로
    // no-store 로 강제해 Data Cache 를 우회한다.
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
