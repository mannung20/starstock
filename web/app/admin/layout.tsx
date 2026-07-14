import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { getSiteConfig } from "@/lib/server-data";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();

  // 미로그인 → 로그인 페이지
  if (!ctx.loggedIn) redirect("/login?next=/admin");

  // 로그인했으나 관리자 아님 → 403
  if (!ctx.isAdmin) {
    return (
      <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">🚫</div>
        <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.email} 계정은 관리자 화이트리스트에 없습니다.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>홈으로</Link>
      </main>
    );
  }

  const config = await getSiteConfig();
  const maintenanceOn = config.maintenance_mode === "true";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar email={ctx.email} maintenanceOn={maintenanceOn} />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
