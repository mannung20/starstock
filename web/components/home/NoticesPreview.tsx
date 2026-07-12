import Link from "next/link";
import type { NoticeRow } from "@/lib/types";

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

/** 하단 공지사항 최신 5개 미리보기 */
export function NoticesPreview({ notices }: { notices: Pick<NoticeRow, "id" | "title" | "category" | "created_at">[] }) {
  return (
    <section className="container mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">📢 공지사항</h2>
        <Link href="/notice" className="text-sm text-muted-foreground hover:text-foreground">
          전체 보기 →
        </Link>
      </div>
      <ul className="divide-y rounded-lg border">
        {notices.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</li>
        )}
        {notices.map((n) => (
          <li key={n.id}>
            <Link
              href={`/notice/${n.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/40"
            >
              <span className="truncate">
                <span className="mr-2 text-xs text-muted-foreground">[{n.category}]</span>
                {n.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{ymd(n.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
