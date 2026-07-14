import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getViewer, getNotice } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import type { NoticeCategory } from "@/lib/types";
import { MaintenanceGate } from "@/components/layout/MaintenanceGate";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  notice: "공지",
  market: "시황",
  performance: "수익률",
  event: "이벤트",
};

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const gate = await MaintenanceGate();
  if (gate) return gate;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [viewer, adminCtx, notice] = await Promise.all([
    getViewer(),
    getAdminContext(),
    getNotice(id),
  ]);

  if (!notice) notFound();

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <article className="container max-w-3xl">
          <div className="mb-4">
            <Link href="/notice" className="text-sm text-muted-foreground hover:text-foreground">
              ← 목록으로
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {notice.is_pinned && <span className="font-semibold text-up">📌 고정</span>}
            <span className="rounded bg-muted px-1.5 py-0.5">{CATEGORY_LABEL[notice.category]}</span>
            <span>{ymd(notice.created_at)}</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold">{notice.title}</h1>

          <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {notice.content?.trim() ? notice.content : "내용이 없습니다."}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
