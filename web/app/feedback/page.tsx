import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const gate = await MaintenanceGate();
  if (gate) return gate;

  const [viewer, adminCtx] = await Promise.all([getViewer(), getAdminContext()]);
  const loggedIn = viewer.role !== "guest";

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <section className="container max-w-xl">
          <h1 className="text-2xl font-bold">기능개선요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            서비스 개선 아이디어나 버그를 알려주세요. 운영자에게 바로 전달됩니다.
          </p>

          <div className="mt-6">
            {loggedIn ? (
              <FeedbackForm />
            ) : (
              <div className="rounded-lg border bg-muted/30 p-6 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  로그인 후 이용 가능합니다.
                </p>
                <Link href="/login" className={buttonVariants({ size: "sm" })}>
                  구글 로그인
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
