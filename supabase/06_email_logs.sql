-- =============================================================================
-- StarStock DB 06 — 이메일 발송 로그 (p4-6 관리자 확인용)
-- 실행 순서: 01~05 이후 (여기) 06. create-if-not-exists 라 재실행 안전.
--   sendEmail() 이 매 발송마다 이 테이블에 기록 → 관리자 페이지(/admin/email)에서
--   발송 건수 + 발송 내용(본문 전문) 확인.
-- 전제(이미 02 에 존재): public.is_admin() 함수.
-- =============================================================================

create table if not exists public.email_logs (
  id          serial primary key,
  kind        varchar(30) not null default 'other',  -- grade_change/referral_reward/vip_expiry/test/other
  recipient   varchar(255),                            -- 수신자(전체 주소, 관리자만 열람)
  subject     text,
  body        text,                                    -- 발송 HTML 전문
  provider    varchar(10),                             -- resend/gmail/none
  status      varchar(10) check (status in ('sent','skipped','failed')),
  error       text,
  created_at  timestamptz default now()
);

create index if not exists email_logs_created_idx on public.email_logs (created_at desc);

-- RLS: 관리자만 SELECT (service_role 은 RLS 우회하여 INSERT/조회)
alter table public.email_logs enable row level security;
drop policy if exists email_logs_admin_read on public.email_logs;
create policy email_logs_admin_read on public.email_logs
  for select using (public.is_admin());
