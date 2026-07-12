/**
 * 환경변수 접근 헬퍼.
 * 공개 값(NEXT_PUBLIC_*)은 클라이언트/서버 공용, 나머지는 서버 전용.
 * service_role / upload token 등 비밀 값은 절대 NEXT_PUBLIC_ 접두사 금지.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

/** 서버 전용 비밀 값. 클라이언트 번들에 포함되면 안 됨. */
export function serverEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    uploadToken: requireEnv("UPLOAD_SECRET_TOKEN"),
    adminEmails: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  };
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`환경변수 ${key} 가 설정되지 않았습니다 (Vercel > Environment Variables 확인).`);
  }
  return v;
}
