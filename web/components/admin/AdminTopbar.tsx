"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MaintenanceToggle } from "./MaintenanceToggle";

const TITLES: Record<string, string> = {
  "/admin": "대시보드",
  "/admin/users": "회원 관리",
  "/admin/stocks": "종목 수동 관리",
  "/admin/history": "수익률 이력 관리",
  "/admin/notices": "공지사항 관리",
  "/admin/email": "이메일 발송 로그",
  "/admin/display": "화면 설정",
  "/admin/site": "사이트 설정",
};

function titleFor(pathname: string): string {
  const keys = Object.keys(TITLES).sort((a, b) => b.length - a.length);
  return TITLES[keys.find((k) => pathname === k || pathname.startsWith(k + "/")) ?? "/admin"] ?? "관리자";
}

export function AdminTopbar({ email, maintenanceOn }: { email: string | null; maintenanceOn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
      <h1 className="text-lg font-bold">{titleFor(pathname)}</h1>
      <div className="flex items-center gap-3 text-sm">
        <MaintenanceToggle initialOn={maintenanceOn} />
        <span className="hidden text-muted-foreground sm:inline">{email}</span>
        <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
      </div>
    </div>
  );
}
