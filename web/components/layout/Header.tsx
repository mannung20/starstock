"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/notice", label: "공지사항" },
  { href: "/referral", label: "추천하기" },
  { href: "/board", label: "게시판" },
  { href: "/history", label: "수익률 현황" },
];

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
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) {
        setRole("guest");
        setEmail(null);
        setIsAdmin(false);
        return;
      }
      setEmail(session.user.email ?? null);
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      setRole(((data as { role: UserRole } | null)?.role) ?? "free");
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

  const shortEmail = email ? email.replace(/@.*/, "@…") : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1 font-bold">
          <span aria-hidden>★</span> StarStock
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => (
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
              <span className="hidden text-xs text-muted-foreground sm:inline">{shortEmail}</span>
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
            {NAV.map((n) => (
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
