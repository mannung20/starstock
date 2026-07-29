/**
 * Supabase DB 타입 (PRD v2.10 섹션 4 스키마 기준 수기 정의).
 * 추후 `supabase gen types typescript` 로 자동 생성 대체 가능.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "free" | "vip" | "admin";
export type StockStatus = "buy" | "hold" | "sell";
export type NoticeCategory = "notice" | "market" | "performance" | "event";
export type ConfigRole = "guest" | "free" | "vip";

export type StockRow = {
  id: number;
  rank: number; // 1~10 (등락률 동적순위, v3.1부터 UNIQUE 아님)
  stock_code: string; // ★식별키(UNIQUE)
  stock_name: string;
  current_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  target_price: number;
  stop_price: number;
  entry_price: number;
  entry_confirmed: boolean;
  change_rate: number; // 등락률(%) numeric(6,2) — 엑셀 직접 수신
  status: StockStatus;
  memo: string | null;
  is_visible: boolean;
  entry_date: string; // date (유지·미사용)
  updated_at: string; // timestamptz
}

export type ProfileRow = {
  id: string; // uuid
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_banned: boolean;
  memo: string | null;
  joined_at: string;
  last_login: string | null;
  referral_code: string | null;
  referred_by: string | null;
  email_verified: boolean;
  email_notify: boolean;
}

export type SubscriptionRow = {
  id: number;
  user_id: string;
  plan: string;
  start_date: string;
  end_date: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  amount_krw: number | null;
  processed_by: string | null;
  expiry_d3_notified: boolean;
  expiry_d0_notified: boolean;
  created_at: string;
}

export type NoticeRow = {
  id: number;
  title: string;
  content: string | null;
  category: NoticeCategory;
  is_pinned: boolean;
  is_hidden: boolean;
  view_count: number;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type UploadLogRow = {
  id: number;
  action_type: "upload" | "admin_action";
  source_ip: string | null;
  uploaded_at: string;
  status: "success" | "failed" | "partial" | null;
  records: number | null;
  error_msg: string | null;
  admin_id: string | null;
  action_desc: string | null;
}

export type AdminWhitelistRow = {
  id: number;
  email: string;
  memo: string | null;
  added_at: string;
}

export type DisplayConfigRow = {
  id: number;
  role: ConfigRole;
  column_key: string;
  is_visible: boolean;
  display_order: number;
  label: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type SiteConfigRow = {
  key: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type HistoryResult = "profit" | "loss" | "hold" | "cancel";

export type StockHistoryRow = {
  id: number;
  stock_code: string;
  stock_name: string | null;
  recommend_date: string | null; // date
  close_date: string | null;     // date
  entry_price: number | null;
  exit_price: number | null;
  return_rate: number | null;    // numeric(6,2)
  result: HistoryResult | null;
  notes: string | null;
  created_at: string;
  // 10_signal_bridge.sql — 승격행 링크(자동 최고달성률에서 복사). null=수동행.
  signal_id: number | null;      // → buy_signals.id (UNIQUE, ON DELETE CASCADE)
}

// 08_buy_signals.sql — 매수신호 발생 이력 (status→'buy' 전환 시 트리거 자동 기록)
export type BuySignalRow = {
  id: number;
  stock_code: string;
  stock_name: string;
  entry_price: number;   // 발생 당시 매수기준가(전일고가)
  signal_price: number;  // 발생 당시 현재가
  rank: number | null;   // 발생 당시 순위(참고)
  signaled_at: string;   // timestamptz
  trade_date: string;    // date (KST 거래일)
  note: string | null;   // '[replay]' 재생신호 표식, 실운영=null
  // 09_signal_performance.sql — 자동 최고달성률 추적 (신호 후 tracking_until 까지)
  max_pct: number;              // 최고달성률(%) numeric(6,2), 트리거가 신호시점값으로 초기화
  max_price: number;            // 최고 표본가(참고) integer
  max_at: string | null;        // 최고 도달 시각 timestamptz
  tracking_until: string | null;// 추적창 종료 = min(신호+60분, 당일15:30 KST)
  finalized: boolean;           // 추적 종료 확정
}

export type RewardType = "milestone" | "repeat" | "referee" | "manual";

export type ReferralLogRow = {
  id: number;
  referrer_id: string;
  referee_id: string;
  referee_email: string | null; // 마스킹 저장 (ni***@g..)
  joined_at: string;
  is_read: boolean;
}

export type ReferralRewardRow = {
  id: number;
  referrer_id: string; // 피추천인 보상(milestone=0)일 때는 피추천인 본인 UUID
  milestone: number;   // 0=피추천인, 1~3=단계, 4+=반복
  reward_days: number;
  reward_type: RewardType;
  rewarded_at: string;
}

export type EmailKind = "grade_change" | "referral_reward" | "vip_expiry" | "feedback" | "test" | "other";
export type EmailStatus = "sent" | "skipped" | "failed";
// 06_email_logs.sql — 이메일 발송 로그 (관리자 확인용, 발송 본문 전문 저장)
export type EmailLogRow = {
  id: number;
  kind: EmailKind;
  recipient: string | null;
  subject: string | null;
  body: string | null;          // 발송 HTML 전문
  provider: string | null;
  status: EmailStatus | null;
  error: string | null;
  created_at: string;
}

// nullable 컬럼(T | null)은 INSERT 시 자동 optional 처리 (Supabase 생성 타입과 동일 동작)
type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

type TableShape<Row, InsertOmit extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, InsertOmit | NullableKeys<Row>> &
    Partial<Pick<Row, (InsertOmit | NullableKeys<Row>) & keyof Row>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      // InsertOmit = 자동생성/DB 기본값 컬럼 → INSERT 시 optional 처리
      stocks: TableShape<
        StockRow,
        | "id" | "updated_at" | "current_price" | "open_price" | "high_price" | "low_price"
        | "target_price" | "stop_price" | "entry_price" | "entry_confirmed" | "change_rate" | "status"
        | "is_visible" | "entry_date"
      >;
      profiles: TableShape<ProfileRow, "role" | "is_banned" | "joined_at" | "email_verified" | "email_notify">;
      subscriptions: TableShape<
        SubscriptionRow,
        "id" | "created_at" | "plan" | "start_date" | "expiry_d3_notified" | "expiry_d0_notified"
      >;
      notices: TableShape<
        NoticeRow,
        "id" | "created_at" | "updated_at" | "view_count" | "is_pinned" | "is_hidden"
      >;
      upload_logs: TableShape<UploadLogRow, "id" | "uploaded_at">;
      admin_whitelist: TableShape<AdminWhitelistRow, "id" | "added_at">;
      display_config: TableShape<DisplayConfigRow, "id" | "updated_at" | "is_visible" | "display_order">;
      site_config: TableShape<SiteConfigRow, "updated_at">;
      referral_logs: TableShape<ReferralLogRow, "id" | "joined_at" | "is_read">;
      referral_rewards: TableShape<ReferralRewardRow, "id" | "rewarded_at" | "reward_type">;
      stock_history: TableShape<StockHistoryRow, "id" | "created_at">;
      email_logs: TableShape<EmailLogRow, "id" | "created_at" | "kind">;
      buy_signals: TableShape<
        BuySignalRow,
        | "id" | "signaled_at" | "trade_date" | "entry_price" | "signal_price"
        | "max_pct" | "max_price" | "finalized"  // not-null + DB default → INSERT optional
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      // 05_referral_rpc.sql — 가입 콜백 단일 트랜잭션 (service_role 전용)
      process_referral: {
        Args: { p_referee: string; p_ref_code: string };
        Returns: Json;
      };
      // 05_referral_rpc.sql — VIP 구독 연장 공통 함수 (service_role 전용). 관리자 수동 보상에서 호출.
      grant_vip_days: {
        Args: { p_user: string; p_days: number; p_reason: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
