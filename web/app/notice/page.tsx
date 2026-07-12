import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getViewer, getNotices } from "@/lib/server-data";
import { getAdminContext } from "@/lib/admin";
import type { NoticeCategory } from "@/lib/types";

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

export default async function NoticeListPage() {
  const [viewer, adminCtx, notices] = await Promise.all([
    getViewer(),
    getAdminContext(),
    getNotices(),
  ]);

  return (
    <>
      <Header initialRole={viewer.role} initialEmail={viewer.email} initialIsAdmin={adminCtx.isAdmin} />
      <main className="py-6">
        <section className="container">
          <h1 className="text-2xl font-bold">공지사항</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            서비스 소식과 시황·이벤트 안내를 확인하세요.
          </p>

          <ul className="mt-6 divide-y rounded-lg border">
            {notices.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-muted-foreground">
                등록된 공지가 없습니다.
              </li>
            )}
            {notices.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notice/${n.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {n.is_pinned && <span className="shrink-0 text-xs font-semibold text-up">📌</span>}
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {CATEGORY_LABEL[n.category]}
                    </span>
                    <span className="truncate">{n.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ymd(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
