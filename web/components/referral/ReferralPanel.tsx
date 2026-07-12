"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KakaoShareButton } from "./KakaoShareButton";

interface RefLog { id: number; referee_email: string | null; joined_at: string; is_read: boolean }
interface RefReward { id: number; milestone: number; reward_days: number; reward_type: string; rewarded_at: string }
interface MeData {
  enabled: boolean;
  referral_code: string | null;
  join_path: string | null;
  total_count: number;
  unread_count: number;
  logs: RefLog[];
  rewards: RefReward[];
  next_milestone: { stage: number; count: number; days: number; remaining: number } | null;
  repeat_info: { every: number; days: number; next_at: number | null };
}

const REWARD_LABEL: Record<string, string> = {
  referee: "가입 웰컴", milestone: "마일스톤", repeat: "반복 보상", manual: "관리자 지급",
};

export function ReferralPanel({ loggedIn }: { loggedIn: boolean }) {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(loggedIn);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  async function load() {
    const res = await fetch("/api/referral/me", { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (loggedIn) load();
  }, [loggedIn]);

  useEffect(() => {
    if (data?.join_path) setUrl(`${window.location.origin}${data.join_path}`);
  }, [data?.join_path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 미지원 무시 */
    }
  }

  async function markAllRead() {
    await fetch("/api/referral/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setData((d) => (d ? { ...d, unread_count: 0, logs: d.logs.map((l) => ({ ...l, is_read: true })) } : d));
  }

  // ── 비로그인: 가입 CTA ──────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <section className="container mt-8">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="text-xl font-bold">지금 가입하고 친구를 추천하세요</div>
            <p className="max-w-md text-sm text-muted-foreground">
              구글로 3초 만에 가입하면 나만의 추천 링크가 생깁니다. 친구가 가입하면
              친구도, 나도 VIP 혜택을 받습니다.
            </p>
            <Link href="/login" className={buttonVariants({ size: "lg" })}>구글로 시작하기</Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (loading) {
    return <section className="container mt-8 text-sm text-muted-foreground">불러오는 중…</section>;
  }

  if (data && !data.enabled) {
    return (
      <section className="container mt-8 text-sm text-muted-foreground">
        추천 이벤트가 현재 일시 중지되었습니다.
      </section>
    );
  }

  if (!data) {
    return <section className="container mt-8 text-sm text-muted-foreground">현황을 불러오지 못했습니다.</section>;
  }

  const next = data.next_milestone;
  const progressPct = next ? Math.min(100, Math.round((data.total_count / next.count) * 100)) : 100;

  return (
    <section className="container mt-8 space-y-4">
      {/* 추천 URL + 공유 */}
      <Card>
        <CardHeader><div className="font-bold">내 추천 링크</div></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
              {url || "링크 생성 중…"}
            </code>
            <Button size="sm" onClick={copy} disabled={!url}>{copied ? "복사됨 ✓" : "링크 복사"}</Button>
            <KakaoShareButton url={url} title="StarStock에서 오늘의 추천 종목을 확인하세요" />
          </div>
          <div className="text-xs text-muted-foreground">
            추천 코드: <span className="font-mono font-semibold text-foreground">{data.referral_code}</span>
          </div>
        </CardContent>
      </Card>

      {/* 진행 현황 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="font-bold">내 추천 현황</div>
          <div className="text-sm text-muted-foreground">누적 <span className="font-bold text-foreground">{data.total_count}</span>명</div>
        </CardHeader>
        <CardContent className="space-y-2">
          {next ? (
            <>
              <div className="flex justify-between text-sm">
                <span>{next.stage}단계까지 <b>{next.remaining}명</b> 남음 → VIP {next.days}일</span>
                <span className="text-muted-foreground">{data.total_count}/{next.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          ) : (
            <div className="text-sm">
              🎉 모든 단계 달성! 다음 반복 보상까지{" "}
              <b>{data.repeat_info.next_at ? data.repeat_info.next_at - data.total_count : data.repeat_info.every}명</b> 남음
              → VIP {data.repeat_info.days}일
            </div>
          )}
        </CardContent>
      </Card>

      {/* 알람(추천 가입 이력) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="font-bold">추천 가입 알람 {data.unread_count > 0 && <Badge variant="vip">{data.unread_count}</Badge>}</div>
          {data.unread_count > 0 && <Button size="sm" variant="outline" onClick={markAllRead}>모두 읽음</Button>}
        </CardHeader>
        <CardContent>
          {data.logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">아직 추천으로 가입한 친구가 없습니다.</div>
          ) : (
            <ul className="divide-y text-sm">
              {data.logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span className={l.is_read ? "text-muted-foreground" : "font-medium"}>
                    {!l.is_read && "🔵 "}{l.referee_email ?? "친구"} 님 가입
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(l.joined_at).toLocaleDateString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 보상 이력 */}
      {data.rewards.length > 0 && (
        <Card>
          <CardHeader><div className="font-bold">받은 보상</div></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{REWARD_LABEL[r.reward_type] ?? r.reward_type}{r.milestone >= 1 && r.reward_type === "milestone" ? ` ${r.milestone}단계` : ""}</span>
                  <span className="font-semibold text-primary">VIP {r.reward_days}일</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
