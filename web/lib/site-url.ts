import { getSiteConfig } from "@/lib/server-data";

/**
 * 이메일 링크·대표 URL 에 사용할 절대 도메인(끝 슬래시 제거).
 *
 * 우선순위(외부 우선):
 *   1) site_config.site_url            — 관리자 "도메인" 탭 입력값 (있으면 최우선)
 *   2) process.env.NEXT_PUBLIC_SITE_URL
 *   3) PERMANENT_FALLBACK              — 영구주소(삭제 불가). 짧은주소 사라져도 링크 안 죽음
 *
 * ※ 세션 비의존: site_config 는 공개 SELECT(RLS) 라 인증 없이 읽힘 → CRON(세션 없음)에서도 안전.
 *   (향후 이 테이블 RLS 를 인증필수로 바꾸면 CRON 메일 URL 이 깨지므로 공개 SELECT 유지가 전제)
 * ※ 읽기 실패(RLS 변경·네트워크 등) 시 예외를 삼키고 env → 영구주소 로 강등
 *   → 메일 발송 자체가 죽지 않도록(폴백은 "값이 비었을 때/못 읽을 때"만 작동).
 */
const PERMANENT_FALLBACK = "https://starstock-zionks-projects.vercel.app";

/** https:// 로 시작하는 값만 채택하고 끝 슬래시 제거. 아니면 null(→ 다음 폴백). */
function normalize(url: string | undefined | null): string | null {
  const u = (url ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\//i.test(u) ? u : null;
}

export async function getSiteUrl(): Promise<string> {
  let configured: string | null = null;
  try {
    const cfg = await getSiteConfig();
    configured = normalize(cfg.site_url);
  } catch {
    // site_config 읽기 실패 → 폴백으로 강등(예외 전파 금지)
  }
  return configured ?? normalize(process.env.NEXT_PUBLIC_SITE_URL) ?? PERMANENT_FALLBACK;
}
