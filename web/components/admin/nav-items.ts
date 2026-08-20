// ★핵심: 관리자 화면 명칭의 단일 출처(single source).
// 왼쪽 사이드바 탭과 위쪽 상단바 제목이 모두 이 목록의 label을 그대로 사용한다.
// ※전제: 이름을 여기서만 고치면 왼쪽·위쪽이 항상 같은 글자를 보게 된다.
export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean; // 대시보드(/admin)만 정확히 일치할 때 활성화
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "대시보드", icon: "📊", exact: true },
  { href: "/admin/users", label: "회원관리", icon: "👥" },
  { href: "/admin/stocks", label: "종목관리", icon: "📈" },
  { href: "/admin/history", label: "수익률 현황", icon: "🏁" },
  { href: "/admin/signals", label: "매수신호 이력", icon: "🔔" },
  { href: "/admin/notices", label: "공지사항", icon: "📢" },
  { href: "/admin/email", label: "이메일", icon: "📧" },
  { href: "/admin/display", label: "화면설정", icon: "🖥" },
  { href: "/admin/site", label: "사이트설정", icon: "⚙️" },
];

// 현재 경로에 해당하는 화면 명칭을 반환(위쪽 상단바 제목용).
// 긴 경로부터 매칭해 하위 경로도 올바른 상위 화면 이름을 얻는다.
export function adminTitleFor(pathname: string): string {
  const sorted = [...ADMIN_NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  const hit = sorted.find((it) =>
    it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/")
  );
  return hit?.label ?? "관리자";
}
