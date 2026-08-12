/**
 * 역할(role) 체계 및 레이어별 필터링 흐름
 *
 * ┌───────┬──────────────┬────────────────────────────────────────────┐
 * │ 역할  │ DB rank 한도 │ 표시 내용                                   │
 * ├───────┼──────────────┼────────────────────────────────────────────┤
 * │ guest │ ≤ 1          │ 가격 🔒, login 유도 슬롯                    │
 * │ free  │ ≤ 3          │ 가격 공개, 목표가/손절가 (% 없음)            │
 * │ vip   │ ≤ 10         │ 전체 공개 + 시/고/저가, 에너지게이지        │
 * │ admin │ ≤ 10         │ vip 동일 (관리 권한은 별도 admin_whitelist) │
 * └───────┴──────────────┴────────────────────────────────────────────┘
 *
 * 필터링 레이어 순서:
 *   1. DB RLS      (supabase/03_rls.sql)      → rank 상한 + is_visible 차단
 *   2. server-data (이 파일)                  → guest 가격 null 마스킹
 *   3. stock-slots (lib/stock-slots.ts)       → UI 슬롯 배치 (real/login/vip)
 *   4. StockCard   (components/stocks/)       → 카드 내 정보 차등 표시
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockRow, NoticeRow, UserRole, StockHistoryRow, BuySignalRow } from "@/lib/types";
import type { ViewerRole } from "@/lib/stock-slots";

export interface StocksPayload {
  role: ViewerRole;
  count: number;
  total_visible: number;
  stocks: StockRow[];
  server_time: string;
}

/**
 * 현재 요청자의 등급 판별 (세션 없으면 guest).
 * 판별 순서: auth.getUser → profiles.role 조회 → 없으면 "free" 기본값.
 * React cache()로 감싸 동일 요청 렌더 내 중복 호출을 1회로 dedupe
 * (page.tsx 와 getStocksPayload 가 각각 호출해도 auth.getUser/profiles 왕복 1회).
 */
export const getViewer = cache(
  async (): Promise<{ userId: string | null; email: string | null; role: ViewerRole }> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, email: null, role: "guest" };

    const { data } = await supabase.from("profiles").select("role, is_banned").eq("id", user.id).maybeSingle();
    const profile = data as { role: UserRole; is_banned: boolean } | null;
    if (profile?.is_banned) return { userId: null, email: null, role: "guest" };
    const role = profile?.role ?? "free";
    return { userId: user.id, email: user.email ?? null, role };
  },
);

/**
 * GET /api/stocks 와 홈 SSR 이 공유하는 등급별 종목 페이로드.
 *
 * stocks 조회: createClient(일반, RLS 적용) → is_visible=true AND rank≤visible_rank_limit()
 *   + 명시적 .eq("is_visible", true) 이중 방어 (rank>10 잔류 데이터 오산정 방지)
 * count 조회: createAdminClient(service_role, RLS 우회) → is_visible=true AND rank≤10
 *   → total_visible: VIP/admin 기준 전체 공개 종목 수 (free/guest의 잠금 수 계산용)
 *   → count(=stocks.length)와 total_visible 차이 = 현재 역할에서 잠긴 종목 수
 */
export async function getStocksPayload(): Promise<StocksPayload> {
  const supabase = createClient();
  const { role } = await getViewer();

  const { data } = await supabase.from("stocks").select("*").eq("is_visible", true).order("rank", { ascending: true });
  let stocks = (data ?? []) as StockRow[];

  // guest: 서버에서도 가격 null 처리 (RLS로 데이터는 왔지만 F12 개발자도구 우회 차단)
  // free/vip/admin은 그대로 전달 → 카드 컴포넌트(StockCard)에서 역할별 표시 차등
  if (role === "guest") {
    stocks = stocks.map((s) => ({
      ...s,
      target_price: null as unknown as number,
      stop_price: null as unknown as number,
      entry_price: null as unknown as number,   // 매수기준가: guest 에겐 payload 에서도 제거(화면 🔒 + 유출 차단)
    }));
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("stocks")
    .select("rank", { count: "exact", head: true })
    .eq("is_visible", true)
    .lte("rank", 10);

  return {
    role,
    count: stocks.length,
    total_visible: count ?? stocks.length,
    stocks,
    server_time: new Date().toISOString(),
  };
}

/**
 * 매수신호 이력(공개) — 최신순 limit 건. RLS 로 실운영 신호(note is null)만 반환
 * (재생 '[replay]' 제외). 홈 SSR·폴링에서 사용.
 */
export async function getBuySignals(limit = 5): Promise<BuySignalRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("buy_signals")
    .select("*")
    .is("note", null)
    .order("signaled_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as BuySignalRow[];
}

/** site_config 전체를 key→value 맵으로. RLS 공개 SELECT. (요청당 1회 dedupe) */
export const getSiteConfig = cache(async (): Promise<Record<string, string>> => {
  const supabase = createClient();
  const { data } = await supabase.from("site_config").select("key, value");
  const rows = (data ?? []) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

export interface PerformanceSummary {
  total: number;      // 전체 이력 수
  closed: number;     // 마감(profit/loss) 수
  wins: number;
  losses: number;
  winRate: number | null;   // 승률 % (마감 기준)
  avgReturn: number | null; // 평균 수익률 % (return_rate 있는 행 기준)
}

/** 과거 수익률 현황 (stock_history, 공개 SELECT). 마감 이력 + 요약 통계. */
export async function getPerformanceData(): Promise<{
  rows: StockHistoryRow[];
  summary: PerformanceSummary;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_history")
    .select("*")
    .order("close_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as StockHistoryRow[];

  const wins = rows.filter((r) => r.result === "profit").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const closed = wins + losses;
  const withReturn = rows.filter((r) => r.return_rate != null);
  const avgReturn = withReturn.length
    ? withReturn.reduce((a, r) => a + (r.return_rate as number), 0) / withReturn.length
    : null;

  return {
    rows,
    summary: {
      total: rows.length,
      closed,
      wins,
      losses,
      winRate: closed ? (wins / closed) * 100 : null,
      avgReturn,
    },
  };
}

export type ReferralStats = {
  totalReferrals: number; // 총 추천 가입수 (referral_logs 전체)
  monthReferrals: number; // 이번달 추천 가입수
  rewardCount: number;    // 지급 보상 건수 (referral_rewards 전체)
  rewardDays: number;     // 지급 보상 총 일수
  topReferrers: { email: string | null; count: number }[]; // 상위 추천인 TOP5
};

/** 관리자 대시보드 추천 통계 (PRD 17-8). service_role 로 전 회원 집계. */
export async function getReferralStats(): Promise<ReferralStats> {
  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [logsRes, rewardsRes] = await Promise.all([
    admin.from("referral_logs").select("referrer_id, joined_at"),
    admin.from("referral_rewards").select("reward_days"),
  ]);
  const logs = (logsRes.data ?? []) as { referrer_id: string; joined_at: string }[];
  const rewards = (rewardsRes.data ?? []) as { reward_days: number }[];

  const monthReferrals = logs.filter((l) => l.joined_at >= monthStart).length;
  const rewardDays = rewards.reduce((a, r) => a + (r.reward_days ?? 0), 0);

  // 추천인별 가입 수 집계 → 상위 5명
  const byRef = new Map<string, number>();
  for (const l of logs) byRef.set(l.referrer_id, (byRef.get(l.referrer_id) ?? 0) + 1);
  const top = [...byRef.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  let topReferrers: { email: string | null; count: number }[] = [];
  if (top.length) {
    const ids = top.map((t) => t[0]);
    const { data: profs } = await admin.from("profiles").select("id, email").in("id", ids);
    const emailMap = new Map(((profs ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email]));
    topReferrers = top.map(([id, count]) => ({ email: emailMap.get(id) ?? null, count }));
  }

  return {
    totalReferrals: logs.length,
    monthReferrals,
    rewardCount: rewards.length,
    rewardDays,
    topReferrers,
  };
}

/** 하단 미리보기용 최신 공지 N개. */
export async function getNoticesPreview(limit = 5) {
  const supabase = createClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, category, created_at, is_pinned")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Pick<NoticeRow, "id" | "title" | "category" | "created_at">[];
}

/** 공개 공지 목록(숨김은 RLS가 자동 제외). 고정글 우선 → 최신순. */
export async function getNotices() {
  const supabase = createClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, category, is_pinned, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Pick<
    NoticeRow,
    "id" | "title" | "category" | "is_pinned" | "created_at"
  >[];
}

/** 공개 공지 단건. 없거나 숨김(RLS 차단)이면 null. */
export async function getNotice(id: number) {
  const supabase = createClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, content, category, is_pinned, view_count, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Pick<
    NoticeRow,
    "id" | "title" | "content" | "category" | "is_pinned" | "view_count" | "created_at"
  > | null;
}
