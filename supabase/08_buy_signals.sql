-- =============================================================================
-- StarStock DB 08 — 매수신호 발생 이력 (buy_signals)
-- 기준: prd-v3-매수신호이력-계획2.txt (v3.1) ■4 / ■11
-- ★ 07_stocks_migration.sql (stock_code 식별 전환) 실행 뒤에 실행.
-- =============================================================================

-- ── 테이블 ───────────────────────────────────────────────────────────────
create table if not exists public.buy_signals (
  id           bigserial primary key,
  stock_code   varchar(10) not null default '',
  stock_name   varchar(50) not null default '',
  entry_price  integer     default 0,   -- 발생 당시 매수기준가(전일고가)
  signal_price integer     default 0,   -- 발생 당시 현재가(current_price)
  rank         smallint,                -- 발생 당시 순위(참고)
  signaled_at  timestamptz not null default now(),
  trade_date   date        not null default (now() at time zone 'Asia/Seoul')::date, -- KST 거래일
  note         text                     -- 재생 신호 표식('[replay]'), 실운영=null
);

create index if not exists idx_buy_signals_signaled_at on public.buy_signals (signaled_at desc);
create index if not exists idx_buy_signals_trade_date  on public.buy_signals (trade_date);

-- ── 트리거 함수: status→'buy' 전환 시 1건 기록 (stock_code 기준) ──────────
--    upsert 키가 stock_code 이므로 OLD = "그 종목 자신의 직전 상태"
--    → OLD.status is distinct from 'buy' 가 곧 그 종목의 진짜 전환(유령신호 없음).
create or replace function public.log_buy_signal() returns trigger as $$
begin
  if NEW.status = 'buy'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'buy') then
    -- 쿨다운: 같은 종목 최근 10분 내 신호 있으면 생략(반복 진동 폭주 방지)
    if exists (
      select 1 from public.buy_signals
       where stock_code = NEW.stock_code
         and signaled_at > now() - interval '10 minutes'
    ) then
      return NEW;
    end if;
    insert into public.buy_signals (stock_code, stock_name, entry_price, signal_price, rank)
    values (NEW.stock_code, NEW.stock_name, NEW.entry_price, NEW.current_price, NEW.rank);
  end if;
  return NEW;
end; $$ language plpgsql security definer;

-- UPDATE·INSERT 양쪽 감지 (upsert 는 신규=INSERT경로 / 기존=UPDATE경로, 중복 없음)
drop trigger if exists trg_log_buy_signal_upd on public.stocks;
create trigger trg_log_buy_signal_upd
  after update of status on public.stocks
  for each row execute function public.log_buy_signal();

drop trigger if exists trg_log_buy_signal_ins on public.stocks;
create trigger trg_log_buy_signal_ins
  after insert on public.stocks
  for each row execute function public.log_buy_signal();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- ★공개 SELECT 는 실운영 신호(note is null)만 허용 → 재생([replay]) 은 anon 미노출(DB 레벨 안전망).
--   관리자(서버 admin client = service_role)는 RLS 우회로 전체 조회/삭제/재생-태깅.
--   INSERT/UPDATE/DELETE 정책 없음 → service_role 전용(트리거는 security definer 로 기록).
alter table public.buy_signals enable row level security;

drop policy if exists buy_signals_public_read on public.buy_signals;
create policy buy_signals_public_read on public.buy_signals
  for select using (note is null);

-- 참고) 10분 쿨다운은 추후 site_config 값으로 뺄 수 있음.
