import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * 서버 컴포넌트/라우트 핸들러용 Supabase 클라이언트.
 * 세션 쿠키를 읽어 로그인 상태를 반영하며 RLS가 적용된다(등급별 필터링).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 set 호출 시 무시 (미들웨어가 세션 갱신 담당)
          }
        },
      },
    }
  );
}
