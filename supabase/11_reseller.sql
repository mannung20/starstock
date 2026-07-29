-- =============================================================================
-- StarStock DB 스키마 11 — 리셀러(총판) 운영 시스템
-- 기준: prd-v3-리셀러-업그레이드계획1.txt (v1.2, 결정 1~11) + 화면1/화면2 (v2)
-- 실행: 01~10 이미 실행된 프로젝트에 11 만 추가 Run. 전 구문 idempotent(재실행 안전).
-- 원칙: 리셀러 쓰기는 서버 API(service_role)에서 getResellerContext 로 소속 이중검증.
--       RLS 는 SELECT 방어선(1차). 섹션 9 참조.
-- 주의: PRD 는 파일명을 07_reseller 로 적었으나 07~10 이 이미 존재 → 11 로 채번.
-- =============================================================================

-- ── [1] role enum 확장: 'reseller' 추가 (섹션 3) ────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('free','vip','admin','reseller'));

-- ── [2] 신규 테이블 ① resellers (리셀러 마스터, 섹션 4-1) ────────────────
create table if not exists public.resellers (
  id              serial primary key,
  owner_id        uuid unique references public.profiles(id) on delete restrict,
  code            varchar(12) unique not null,   -- 승인 시 서버가 자동발급 (결정3)
  display_name    varchar(100) not null,
  contact         varchar(100),
  commission_rate numeric(5,2),                  -- NULL = 글로벌 기본율 사용 (개별>글로벌)
  settlement_bank varchar(200),                  -- 마스킹 저장 (결정2)
  status          varchar(20) default 'pending'
                  check (status in ('pending','active','suspended','rejected')),
  apply_note      text,
  memo            text,                            -- 본사 메모
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz default now()
);

-- ── [3] 신규 테이블 ② reseller_settlements (정산 이력, 섹션 4-2) ──────────
create table if not exists public.reseller_settlements (
  id                serial primary key,
  reseller_id       integer references public.resellers(id) on delete cascade,
  period            varchar(7) not null,           -- 정산 기간 'YYYY-MM'
  gross_amount      integer default 0,             -- Σ subscriptions.amount_krw
  commission_amount integer default 0,             -- FLOOR(gross × rate/100)
  commission_rate   numeric(5,2),                  -- 확정 시점 스냅샷(과거 정산 불변)
  member_count      smallint default 0,            -- 확정 구독(subscriptions) 행수 (결정5)
  status            varchar(20) default 'pending'
                    check (status in ('pending','requested','approved','paid')),
  requested_at      timestamptz,
  processed_at      timestamptz,
  processed_by      uuid references public.profiles(id),
  note              text,
  created_at        timestamptz default now(),
  unique(reseller_id, period)                       -- 기간당 1행
);

-- ── [4] profiles 컬럼 추가 (섹션 4-3 + 결정1,10) ────────────────────────
alter table public.profiles add column if not exists reseller_id integer
     references public.resellers(id) on delete set null;         -- NULL=본사 직영
alter table public.profiles add column if not exists reseller_memo text;            -- 결정1(본사 memo와 분리)
alter table public.profiles add column if not exists delete_requested_at timestamptz; -- 결정10
alter table public.profiles add column if not exists delete_requested_by uuid
     references public.profiles(id);

-- ── [5] subscriptions 컬럼 추가 (모델A pending 흐름 + 결정4,8) ───────────
--   실제 스키마엔 status/confirmed_at 이 없어 신규 추가. 기존 행은 전부 확정건으로 간주.
alter table public.subscriptions add column if not exists reseller_id integer
     references public.resellers(id) on delete set null;         -- 판매 당시 리셀러 스탬프
alter table public.subscriptions add column if not exists status varchar(20)
     default 'confirmed' check (status in ('pending','confirmed','rejected'));
alter table public.subscriptions add column if not exists confirmed_at timestamptz; -- 결정8 정산기준일
alter table public.subscriptions add column if not exists note text;               -- 반려 사유 등
-- 기존 구독은 모두 확정건 → confirmed_at 백필(created_at 기준). 신규 pending 은 확인 시 채움.
update public.subscriptions
   set confirmed_at = created_at
 where confirmed_at is null and status = 'confirmed';

-- ── [6] upload_logs 컬럼 추가: actor_role (결정4) ───────────────────────
alter table public.upload_logs add column if not exists actor_role varchar(10)
     check (actor_role in ('master','reseller'));

-- ── [7] notices category 에 'reseller' 추가 (섹션 5-6, 공지 재사용) ──────
alter table public.notices drop constraint if exists notices_category_check;
alter table public.notices
  add constraint notices_category_check
  check (category in ('notice','market','performance','event','reseller'));

-- ── [8] 인덱스 ──────────────────────────────────────────────────────────
create index if not exists idx_profiles_reseller   on public.profiles(reseller_id);
create index if not exists idx_profiles_delete_req  on public.profiles(delete_requested_at);
create index if not exists idx_subs_reseller        on public.subscriptions(reseller_id);
create index if not exists idx_subs_status          on public.subscriptions(status);
create index if not exists idx_resellers_status     on public.resellers(status);
create index if not exists idx_settlements_reseller on public.reseller_settlements(reseller_id);

-- ── [9] site_config 키 (섹션 4-4 + 결정11) — 값은 관리자 화면에서 변경 ───
--   ON CONFLICT DO NOTHING: 이미 있으면 유지(운영자가 화면에서 넣은 값 보존).
insert into public.site_config (key, value) values
  ('reseller_enabled',            'true'),    -- 리셀러 기능 전체 ON/OFF + 사이드바 메뉴 토글
  ('reseller_default_commission', '20'),      -- 기본 수수료율 % [입력필요]
  ('reseller_price_1m',           '30000'),   -- VIP 1개월 정가(원) [입력필요]
  ('reseller_price_3m',           '80000'),   -- VIP 3개월 정가(원) [입력필요]
  ('reseller_price_12m',          '300000'),  -- VIP 12개월 정가(원) [입력필요]
  ('reseller_apply_open',         'true'),    -- 리셀러 신청 접수 ON/OFF
  ('reseller_deposit_info',       ''),        -- 본사 입금계좌 안내 문구(회원 전달용) [입력필요]
  ('reseller_tab_settlement',     'true'),    -- 리셀러 콘솔 '정산' 탭 표시
  ('reseller_tab_recruit',        'true'),    -- 리셀러 콘솔 '모집' 탭 표시
  ('reseller_tab_notices',        'true')     -- 리셀러 콘솔 '공지' 탭 표시
on conflict (key) do nothing;

-- ── [10] 헬퍼 함수: 내 활성 리셀러 id (RLS + 서버 공용) ─────────────────
--   security definer + search_path 고정 → RLS 재귀/우회 이슈 없이 조회.
create or replace function public.my_reseller_id()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select id from public.resellers
   where owner_id = auth.uid() and status = 'active'
   limit 1;
$$;

-- ── [11] RLS 정책 (섹션 9 — 이중 방어의 1차 SELECT 방어선) ──────────────
-- resellers: 본인(owner) + 관리자 SELECT. 쓰기는 service_role(승인/수수료율/상태).
alter table public.resellers enable row level security;
drop policy if exists resellers_select on public.resellers;
create policy resellers_select on public.resellers
  for select using (owner_id = auth.uid() or public.is_admin());

-- reseller_settlements: 리셀러 본인 것 + 관리자 SELECT. 쓰기 service_role.
alter table public.reseller_settlements enable row level security;
drop policy if exists settlements_select on public.reseller_settlements;
create policy settlements_select on public.reseller_settlements
  for select using (reseller_id = public.my_reseller_id() or public.is_admin());

-- profiles: 기존(본인/admin) SELECT + "리셀러는 자기 소속 회원" 추가.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (public.my_reseller_id() is not null and reseller_id = public.my_reseller_id())
  );

-- subscriptions: 기존(본인/admin) SELECT + "리셀러 소속 구독" 추가.
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.my_reseller_id() is not null and reseller_id = public.my_reseller_id())
  );

-- =============================================================================
-- [참고] 이 마이그레이션에 포함하지 않은 것 (애플리케이션/서버 레벨 처리)
--  · 리셀러 회원 등급변경(free↔vip)/차단/메모/삭제요청, 입금확인요청, 정산요청:
--    전부 서버 API(service_role) + getResellerContext 소속 재검증. (섹션 9-1)
--    RLS UPDATE 로 컬럼 화이트리스트 강제는 어려워 서버 이중검증에 위임.
--  · resellers.code 자동발급: 승인 API 에서 유니크 코드 생성 후 INSERT (결정3).
--  · 가입 시 profiles.reseller_id 세팅: auth 콜백(서버)에서 쿠키 rs 판독 (섹션 14-5).
--    → DB 트리거 아님(브라우저 쿠키를 DB 가 못 읽음).
--  · reseller_visits(유입로그): 선택/MVP 밖 (섹션 4-5).
-- =============================================================================
