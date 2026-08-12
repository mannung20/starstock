"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

// cfg 가 있는 항목은 site_config 의 해당 키가 "false" 면 메뉴에서 숨김(관리자 "네비게이션" 탭).
// cfg 없는 항목(홈·추천하기·기능개선요청)은 항상 표시.
const NAV: { href: string; label: string; cfg?: string }[] = [
  { href: "/", label: "홈" },
  { href: "/notice", label: "공지사항", cfg: "nav_show_notice" },
  { href: "/referral", label: "추천하기" },
  { href: "/board", label: "게시판", cfg: "nav_show_board" },
  { href: "/history", label: "수익률 현황", cfg: "nav_show_history" },
  { href: "/feedback", label: "기능개선요청" },
];
const NAV_CFG_KEYS = NAV.map((n) => n.cfg).filter((k): k is string => !!k);

function GradeBadge({ role }: { role: UserRole | "guest" }) {
  if (role === "vip") return <Badge variant="vip">⭐VIP</Badge>;
  if (role === "admin") return <Badge variant="vip">ADMIN</Badge>;
  if (role === "free") return <Badge variant="secondary">FREE</Badge>;
  return <Badge variant="outline">GUEST</Badge>;
}

export function Header({
  initialRole = "guest",
  initialEmail = null,
  initialIsAdmin = false,
}: {
  initialRole?: UserRole | "guest";
  initialEmail?: string | null;
  initialIsAdmin?: boolean;
}) {
  const router = useRouter();
  // createClient()를 렌더마다 새로 만들면 [supabase] effect가 무한 재구독됨 → 최초 1회만 생성
  const [supabase] = useState(() => createClient());
  const [role, setRole] = useState<UserRole | "guest">(initialRole);
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hiddenNav, setHiddenNav] = useState<Set<string>>(new Set()); // nav_show_*=false 인 cfg 키

  // 관리자 "네비게이션" 탭 설정(site_config 공개 SELECT) 반영 → 해당 메뉴 숨김.
  // ※ 초기엔 전부 표시(SSR) 후 값 로드 시 숨김 반영(관리자가 끈 항목만 잠깐 보였다 사라질 수 있음).
  useEffect(() => {
    let alive = true;
    supabase
      .from("site_config")
      .select("key, value")
      .in("key", NAV_CFG_KEYS)
      .then(({ data }) => {
        if (!alive) return;
        const hide = new Set<string>();
        for (const row of (data ?? []) as { key: string; value: string }[]) {
          if (row.value === "false") hide.add(row.key);
        }
        setHiddenNav(hide);
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const nav = NAV.filter((n) => !n.cfg || !hiddenNav.has(n.cfg));

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) {
        setRole("guest");
        setEmail(null);
        setDisplayName(null);
        setIsAdmin(false);
        return;
      }
      setEmail(session.user.email ?? null);
      setDisplayName((session.user.user_metadata?.full_name as string | undefined) ?? null);
      const { data } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", session.user.id)
        .maybeSingle();
      const profile = data as { role: UserRole; is_banned: boolean } | null;
      if (profile?.is_banned) {
        await supabase.auth.signOut(); // 즉시 클라이언트 세션 파기 → SIGNED_OUT 이벤트 재발화
        return;
      }
      const userRole = profile?.role ?? "free";
      setRole(userRole);
      setIsAdmin(userRole === "admin");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // 추천 미읽음 알람 수 (로그인 시)
  useEffect(() => {
    if (!email) {
      setUnread(0);
      return;
    }
    fetch("/api/referral/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnread(d.unread_count ?? 0))
      .catch(() => {});
  }, [email]);

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  const displayIdentifier = displayName ?? (email ? email.replace(/@.*/, "@…") : null);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1 font-bold">
          <span aria-hidden>★</span> StarStock
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="메뉴"
            aria-expanded={menuOpen}
            className="text-xl leading-none md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
          <GradeBadge role={role} />
          {email ? (
            <>
              <Link
                href="/referral"
                aria-label="추천 알람"
                className="relative text-lg leading-none"
                title="추천 현황"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <span className="max-w-[80px] truncate text-xs text-muted-foreground sm:max-w-none">{displayIdentifier}</span>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  관리자 페이지
                </Link>
              )}
              <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>구글 로그인</Link>
          )}
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <nav className="border-t bg-background md:hidden">
          <ul className="container flex flex-col py-2 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="block py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
