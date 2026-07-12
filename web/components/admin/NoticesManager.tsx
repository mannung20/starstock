"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminNotice } from "@/app/admin/notices/page";

const CATS = [
  { key: "notice", label: "공지" },
  { key: "market", label: "시황" },
  { key: "performance", label: "수익률" },
  { key: "event", label: "이벤트" },
];

function NoticeForm({ editing, onDone }: { editing: AdminNotice | null; onDone: () => void }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState(editing?.category ?? "notice");
  const [isPinned, setIsPinned] = useState(editing?.is_pinned ?? false);
  const [content, setContent] = useState(editing?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return setErr("제목을 입력하세요");
    setSaving(true);
    setErr(null);
    const url = editing ? `/api/admin/notices/${editing.id}` : "/api/admin/notices";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, is_pinned: isPinned, content }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "저장 실패");
      setSaving(false);
      return;
    }
    onDone();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="font-bold">{editing ? `공지 수정 #${editing.id}` : "새 공지사항 작성"}</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex gap-3">
            {CATS.map((c) => (
              <label key={c.key} className="flex items-center gap-1">
                <input type="radio" checked={category === c.key} onChange={() => setCategory(c.key as AdminNotice["category"])} />
                {c.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> 상단고정
          </label>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용 입력..."
          rows={6}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onDone}>취소</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "저장 중…" : editing ? "수정 저장" : "발행"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoticesManager({ notices }: { notices: AdminNotice[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "new" | AdminNotice>("list");

  async function toggleHide(n: AdminNotice) {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !n.is_hidden }),
    });
    router.refresh();
  }
  async function remove(n: AdminNotice) {
    if (!confirm(`"${n.title}" 공지를 삭제할까요?`)) return;
    await fetch(`/api/admin/notices/${n.id}`, { method: "DELETE" });
    router.refresh();
  }
  function done() {
    setMode("list");
    router.refresh();
  }

  const catLabel = (k: string) => CATS.find((c) => c.key === k)?.label ?? k;

  return (
    <div className="space-y-4">
      {mode === "list" ? (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setMode("new")}>+ 새 공지사항 작성</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">고정</th>
                  <th className="px-3 py-2 font-medium">분류</th>
                  <th className="px-3 py-2 font-medium">제목</th>
                  <th className="px-3 py-2 font-medium">작성일</th>
                  <th className="px-3 py-2 font-medium">조회</th>
                  <th className="px-3 py-2 font-medium">조작</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id} className={`border-t ${n.is_hidden ? "text-muted-foreground line-through" : ""}`}>
                    <td className="px-3 py-2">{n.is_pinned ? "📌" : ""}</td>
                    <td className="px-3 py-2">[{catLabel(n.category)}]</td>
                    <td className="px-3 py-2">{n.title}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{n.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2 tabular-nums">{n.view_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setMode(n)}>수정</Button>
                        <Button size="sm" variant="outline" onClick={() => toggleHide(n)}>{n.is_hidden ? "표시" : "숨김"}</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(n)}>삭제</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {notices.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">공지가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <NoticeForm editing={mode === "new" ? null : mode} onDone={done} />
      )}
    </div>
  );
}
