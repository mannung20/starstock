import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockRow, NoticeRow, UserRole, StockHistoryRow } from "@/lib/types";
import type { ViewerRole } from "@/lib/stock-slots";

export interface StocksPayload {
  role: ViewerRole;
  count: number;
  total_visible: number;
  stocks: StockRow[];
  server_time: string;
}

/** 현재 요청자의 등급 판별 (세션 없으면 guest). */
export async function getViewer(): Promise<{ userId: string | null; email: string | null; role: ViewerRole }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, role: "guest" };

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = ((data as { role: UserRole } | null)?.role) ?? "free";
  return { userId: user.id, email: user.email ?? null, role };
}

/** GET /api/stocks 와 홈 SSR 이 공유하는 등급별 종목 페이로드. */
export async function getStocksPayload(): Promise<StocksPayload> {
  const supabase = createClient();
  const { role } = await getViewer();

  const { data } = await supabase.from("stocks").select("*").order("rank", { ascending: true });
  let stocks = (data ?? []) as StockRow[];

  if (role === "guest") {
    stocks = stocks.map((s) => ({
      ...s,
      target_price: null as unknown as number,
      stop_price: null as unknown as number,
    }));
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("stocks")
    .select("rank", { count: "exact", head: true })
    .eq("is_visible", true);

  return {
    role,
    count: stocks.length,
    total_visible: count ?? stocks.length,
    stocks,
    server_time: new Date().toISOString(),
  };
}

/** site_config 전체를 key→value 맵으로. RLS 공개 SELECT. */
export async function getSiteConfig(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.from("site_config").select("key, value");
  const rows = (data ?? []) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

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
