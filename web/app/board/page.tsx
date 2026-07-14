import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GiscusComments } from "@/components/board/GiscusComments";
import { getViewer } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const gate = await MaintenanceGate();
  if (gate) return gate;

  const [viewer, adminCtx] = await Promise.all([getViewer(), getAdminContext()]);

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <section className="container">
          <h1 className="text-2xl font-bold">게시판</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            자유롭게 의견을 나눠보세요. 댓글은 GitHub 계정으로 작성됩니다.
          </p>
          <div className="mt-6">
            <GiscusComments />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
