"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "기능개선", label: "기능개선" },
  { value: "버그신고", label: "버그신고" },
  { value: "기타", label: "기타" },
] as const;

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FeedbackForm() {
  const [category, setCategory] = useState<string>("기능개선");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const t = title.trim();
    const c = content.trim();
    const em = email.trim();
    const ct = contact.trim();
    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");
    if (t.length > TITLE_MAX) return setError(`제목은 ${TITLE_MAX}자 이내로 입력해주세요.`);
    if (c.length > CONTENT_MAX) return setError(`내용은 ${CONTENT_MAX}자 이내로 입력해주세요.`);
    if (em && !EMAIL_RE.test(em)) return setError("이메일 형식이 올바르지 않습니다.");
    if (ct.length > CONTACT_MAX) return setError(`연락처는 ${CONTACT_MAX}자 이내로 입력해주세요.`);

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title: t, content: c, email: em, contact: ct }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "전송에 실패했습니다.");
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <div className="mb-2 text-2xl">✅</div>
        <p className="font-semibold">접수되었습니다. 검토 후 반영하겠습니다.</p>
        <Button
          className="mt-4"
          variant="outline"
          size="sm"
          onClick={() => {
            setDone(false);
            setTitle("");
            setContent("");
            setEmail("");
            setContact("");
            setCategory("기능개선");
          }}
        >
          추가로 요청하기
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">분류</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">제목</label>
        <input
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="한 줄로 요약해주세요"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="text-right text-xs text-muted-foreground">
          {title.length}/{TITLE_MAX}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">내용</label>
        <textarea
          value={content}
          maxLength={CONTENT_MAX}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="개선 아이디어나 버그 상황을 자세히 적어주세요."
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="text-right text-xs text-muted-foreground">
          {content.length}/{CONTENT_MAX}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            이메일주소 <span className="text-xs font-normal text-muted-foreground">(선택)</span>
          </label>
          <input
            type="email"
            value={email}
            maxLength={100}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="회신받을 이메일"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            연락처 <span className="text-xs font-normal text-muted-foreground">(선택)</span>
          </label>
          <input
            type="tel"
            value={contact}
            maxLength={CONTACT_MAX}
            onChange={(e) => setContact(e.target.value)}
            placeholder="전화번호 등"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "전송 중…" : "보내기"}
      </Button>
    </form>
  );
}
