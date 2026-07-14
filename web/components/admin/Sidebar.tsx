"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
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

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-52 shrink-0 border-r bg-muted/30 md:block">
      <div className="sticky top-0 flex h-full flex-col gap-1 p-3">
        <div className="mb-2 px-2 py-3">
          <div className="font-bold">★ StarStock</div>
          <div className="text-xs font-semibold text-amber-600">ADMIN</div>
        </div>
        {ITEMS.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span aria-hidden>{it.icon}</span> {it.label}
            </Link>
          );
        })}
        <div className="my-2 border-t" />
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <span aria-hidden>🌐</span> 사이트 미리보기 ↗
        </Link>
      </div>
    </aside>
  );
}
