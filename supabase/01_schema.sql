-- =============================================================================
-- StarStock DB 스키마 01 — 테이블 정의
-- 실행: Supabase Dashboard > SQL Editor 에 붙여넣고 Run
-- 순서: 01_schema → 02_rls → 03_functions_triggers → 04_seed
-- 기준: PRD v2.10 섹션 4 / 14 / 15 + tracker key_fields (최신)
-- =============================================================================

-- ── ① stocks (핵심 종목) ────────────────────────────────────────────────
create table if not exists public.stocks (
  id              serial primary key,
  rank            smallint not null unique check (rank between 1 and 10),
  stock_code      varchar(10) not null default '',
  stock_name      varchar(50) not null default '',
  current_price   integer default 0,
  open_price      integer default 0,
  high_price      integer default 0,
  low_price       integer default 0,
  target_price    integer default 0,
  stop_price      integer default 0,
  entry_price     integer default 0,          -- 매수기준가 (섹션 15-9)
  entry_confirmed boolean default false,      -- 매수기준가 확정 여부
  status          varchar(10) default 'hold' check (status in ('buy','hold','sell')),
  memo            text,
  is_visible      boolean default true,
  entry_date      date default current_date,
  updated_at      timestamptz default now()
);

-- ── ② profiles (회원, auth.users 확장) ──────────────────────────────────
create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  email          varchar(255) unique,
  display_name   varchar(100),
  avatar_url     text,
  role           varchar(20) default 'free' check (role in ('free','vip','admin')),
  is_banned      boolean default false,
  memo           text,
  joined_at      timestamptz default now(),
  last_login     timestamptz,
  referral_code  varchar(10) unique,          -- lazy 생성 (프로필 최초 접속 시)
  referred_by    uuid references public.profiles(id),
  email_verified boolean default false,       -- 섹션 16-7
  email_notify   boolean default true
);

-- ── ③ subscriptions (구독 이력) ─────────────────────────────────────────
create table if not exists public.subscriptions (
  id                 serial primary key,
  user_id            uuid references public.profiles(id) on delete cascade,
  plan               varchar(20) default 'vip',
  start_date         date not null default current_date,
  end_date           date,                     -- NULL = 무기한
  payment_method     varchar(50),
  payment_ref        varchar(100),
  amount_krw         integer,
  processed_by       uuid references public.profiles(id),
  expiry_d3_notified boolean default false,
  expiry_d0_notified boolean default false,
  created_at         timestamptz default now()
);

-- ── ④ notices (공지/시황) ───────────────────────────────────────────────
create table if not exists public.notices (
  id          serial primary key,
  title       varchar(200) not null,
  content     text,
  category    varchar(20) default 'notice' check (category in ('notice','market','performance','event')),
  is_pinned   boolean default false,
  is_hidden   boolean default false,
  view_count  integer default 0,
  author_id   uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── ⑤ upload_logs (엑셀 업로드 + 관리자 작업 로그 통합) ─────────────────
create table if not exists public.upload_logs (
  id          serial primary key,
  action_type varchar(20) default 'upload' check (action_type in ('upload','admin_action')),
  source_ip   varchar(50),
  uploaded_at timestamptz default now(),
  status      varchar(20) check (status in ('success','failed','partial')),
  records     smallint,
  error_msg   text,
  admin_id    uuid references public.profiles(id),
  action_desc text
);

-- ── ⑥ admin_whitelist (관리자 이메일) ───────────────────────────────────
create table if not exists public.admin_whitelist (
  id       serial primary key,
  email    varchar(255) unique not null,
  memo     text,
  added_at timestamptz default now()
);

-- ── ⑦ display_config (등급별 열 표시 설정, 섹션 14-2) ───────────────────
create table if not exists public.display_config (
  id            serial primary key,
  role          varchar(20) not null check (role in ('guest','free','vip')),
  column_key    varchar(50) not null,
  is_visible    boolean default true,
  display_order smallint default 0,
  label         varchar(50),
  updated_by    uuid references public.profiles(id),
  updated_at    timestamptz default now(),
  unique(role, column_key)
);

-- ── ⑧ site_config (사이트 설정 key-value, 섹션 14-8-2) ──────────────────
create table if not exists public.site_config (
  key        varchar(50) primary key,
  value      text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- ── ⑨ stock_history (추천 마감 이력, 선택) ──────────────────────────────
create table if not exists public.stock_history (
  id             serial primary key,
  stock_code     varchar(10) not null,
  stock_name     varchar(50),
  recommend_date date,
  close_date     date,
  entry_price    integer,
  exit_price     integer,
  return_rate    numeric(6,2),
  result         varchar(10) check (result in ('profit','loss','hold','cancel')),
  notes          text,
  created_at     timestamptz default now()
);

-- ── ⑩ referral_logs (추천 가입 이력, 선택) ──────────────────────────────
create table if not exists public.referral_logs (
  id            serial primary key,
  referrer_id   uuid references public.profiles(id) on delete cascade,
  referee_id    uuid references public.profiles(id) on delete cascade unique,
  referee_email varchar(255),                 -- 마스킹 저장 (nick***@g..)
  joined_at     timestamptz default now(),
  is_read       boolean default false
);

-- ── ⑪ referral_rewards (마일스톤 보상 이력, 선택) ───────────────────────
create table if not exists public.referral_rewards (
  id          serial primary key,
  referrer_id uuid references public.profiles(id) on delete cascade,
  milestone   smallint not null,             -- 1~3=단계, 4+=반복, 0=피추천인, 99+=수동
  reward_days integer not null,
  reward_type varchar(20) default 'milestone' check (reward_type in ('milestone','repeat','referee','manual')),
  rewarded_at timestamptz default now(),
  unique(referrer_id, milestone)
);

-- ── 인덱스 ──────────────────────────────────────────────────────────────
create index if not exists idx_stocks_rank        on public.stocks(rank);
create index if not exists idx_profiles_role      on public.profiles(role);
create index if not exists idx_subs_user          on public.subscriptions(user_id);
create index if not exists idx_subs_enddate       on public.subscriptions(end_date);
create index if not exists idx_notices_created    on public.notices(created_at desc);
create index if not exists idx_uploadlogs_time    on public.upload_logs(uploaded_at desc);
create index if not exists idx_reflogs_referrer   on public.referral_logs(referrer_id);
