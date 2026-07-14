import { getSiteConfig } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import { MaintenanceScreen } from "./MaintenanceScreen";

/**
 * 운영모드 게이트(페이지 레벨). maintenance_mode==="true" && 비관리자면 점검화면 요소 반환, 아니면 null.
 * ※ config/adminCtx 는 cache() 로 dedupe → 페이지가 이미 로드해도 추가 왕복 없음.
 * ※ /login·/auth/callback·/admin 은 이 게이트를 적용하지 않음(관리자 진입 경로).
 * ※ /api/* 는 게이트하지 않음(업로드·트리거·홈 폴링 동작 유지).
 *
 * 사용: 공개 page.tsx 상단에서
 *   const gate = await MaintenanceGate();
 *   if (gate) return gate;
 */
export async function MaintenanceGate(): Promise<React.ReactElement | null> {
  const [config, ctx] = await Promise.all([getSiteConfig(), getAdminContext()]);
  if (config.maintenance_mode === "true" && !ctx.isAdmin) {
    return <MaintenanceScreen message={config.maintenance_message} />;
  }
  return null;
}
