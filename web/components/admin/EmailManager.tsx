"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { EmailLogRow, EmailKind, EmailStatus } from "@/lib/types";

const KIND_LABEL: Record<EmailKind, string> = {
  grade_change: "등급변경",
  referral_reward: "추천보상",
  vip_expiry: "VIP만료",
  feedback: "기능개선요청",
  signup_notify: "신규가입알림",
  test: "테스트",
  other: "기타",
};

const STATUS_META: Record<EmailStatus, { label: string; cls: string }> = {
  sent: { label: "발송됨", cls: "bg-green-100 text-green-700" },
  skipped: { label: "생략", cls: "bg-gray-100 text-gray-600" },
  failed: { label: "실패", cls: "bg-red-100 text-red-700" },
};

/** 수신자 마스킹: nick***@gmail.com */
function maskEmail(e: string | null): string {
  if (!e) return "-";
  const first = e.split(",")[0].trim();
  const at = first.indexOf("@");
  if (at < 1) return first;
  return `${first.slice(0, Math.min(3, at))}***${first.slice(at)}`;
}

function fmt(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function EmailManager({
  rows,
  total,
  today,
  provider,
  from,
}: {
  rows: EmailLogRow[];
  total: number;
  today: number;
  provider: "resend" | "gmail" | "none";
  from: string | null;
}) {
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  async function sendTest() {
    setSending(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/admin/email-test", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; provider?: string; skipped?: boolean; error?: string };
      if (data.skipped) setTestMsg("⚠️ provider 미설정 → 발송 생략됨 (RESEND_API_KEY 등 설정 필요)");
      else if (data.ok) setTestMsg(`✅ 테스트 발송 성공 (provider=${data.provider}) — 관리자 메일함 확인`);
      else setTestMsg(`❌ 실패: ${data.error ?? "unknown"}`);
    } catch (e) {
      setTestMsg(`❌ 요청 오류: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  const providerBadge =
    provider === "none"
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-700";

  return (
    <div className="space-y-6 p-4">
      {/* 상태 카드 */}
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">발송 연동 상태</span>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${providerBadge}`}>
            provider: {provider}
          </span>
          <span className="text-xs text-muted-foreground">
            발신주소: {from ?? "미설정 → 폴백 onboarding@resend.dev (샌드박스: 계정 소유자에게만 발송)"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={sendTest} disabled={sending}>
            {sending ? "발송 중…" : "관리자 본인에게 테스트 발송"}
          </Button>
          {testMsg && <span className="text-xs">{testMsg}</span>}
        </div>
        {provider === "resend" && !from && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠️ 실제 회원에게 발송하려면 resend.com 도메인 인증 후 EMAIL_FROM 을 그 도메인 주소로 설정하세요.
          </p>
        )}
      </div>

      {/* 집계 */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">오늘 발송</div>
          <div className="text-2xl font-bold">{today}건</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">전체 발송</div>
          <div className="text-2xl font-bold">{total}건</div>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-semibold">최근 발송 로그 (최대 100건)</div>
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">아직 발송된 이메일이 없습니다.</div>
        ) : (
          <div className="divide-y">
            <div className="hidden grid-cols-[110px_80px_1fr_130px_70px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>시각</span>
              <span>종류</span>
              <span>제목</span>
              <span>수신자</span>
              <span>상태</span>
            </div>
            {rows.map((r) => {
              const st = r.status ? STATUS_META[r.status] : { label: "-", cls: "bg-gray-100 text-gray-600" };
              const isOpen = openId === r.id;
              return (
                <div key={r.id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                    className="grid w-full grid-cols-2 gap-2 px-4 py-2 text-left text-sm hover:bg-accent sm:grid-cols-[110px_80px_1fr_130px_70px]"
                  >
                    <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
                    <span className="text-xs">{KIND_LABEL[r.kind] ?? r.kind}</span>
                    <span className="truncate">{r.subject ?? "-"}</span>
                    <span className="text-xs text-muted-foreground">{maskEmail(r.recipient)}</span>
                    <span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t bg-muted/20 p-4">
                      {r.error && <p className="mb-2 text-xs text-red-600">오류: {r.error}</p>}
                      <div className="mb-1 text-xs text-muted-foreground">발송 본문:</div>
                      <iframe
                        title={`email-${r.id}`}
                        srcDoc={r.body ?? ""}
                        sandbox=""
                        className="h-64 w-full rounded border bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
