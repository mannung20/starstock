-- =============================================================================
-- StarStock DB 09 — 자동 수익률(최고달성률) 이력 기록
-- 기준: prd-v3-자동수익률이력기록-계획1.txt (rev2)
-- ★ 08_buy_signals.sql 실행 뒤에 실행. (buy_signals 테이블/트리거 존재 전제)
-- 내용: (1) buy_signals 컬럼 추가  (2) 활성신호 부분인덱스
--       (3) log_buy_signal() 재정의 — INSERT 시 tracking_until + max_pct 초기값 세팅
-- =============================================================================

-- ── (1) 컬럼 추가 ──────────────────────────────────────────────────────────
alter table public.buy_signals
  add column if not exists max_pct        numeric(6,2) not null default 0,  -- 최고달성률(%)
  add column if not exists max_price      integer      not null default 0,  -- 최고 표본가(참고)
  add column if not exists max_at         timestamptz,                       -- 최고 도달 시각
  add column if not exists tracking_until timestamptz,                       -- 추적창 종료 = min(신호+60분, 당일15:30 KST)
  add column if not exists finalized      boolean      not null default false; -- 최고달성률 확정(finalize)

-- ── (2) 활성 신호 조회 인덱스 (부분 인덱스: 추적 SELECT 대상만) ─────────────
--   서버 추적 쿼리 = WHERE finalized=false AND note is null → 활성행만 인덱싱해 효율↑
drop index if exists public.idx_buy_signals_active;
create index if not exists idx_buy_signals_active
  on public.buy_signals (tracking_until)
  where finalized = false and note is null;

-- ── (3) 트리거 함수 재정의: 기존 로직 + tracking_until·max_pct 초기값 ────────
--   변경점: buy_signals INSERT 시 아래 2개 컬럼을 함께 세팅.
--     · tracking_until = least(신호+60분, 당일 15:30 KST)  ← 마감 이후엔 표본 없으므로 창 단축
--     · max_pct = greatest(0, (signal_price-entry_price)/entry_price*100)  ← 신호시점값(+0~2%)에서 출발
--         (entry_price=0/null → nullif 로 division NULL → greatest(0,NULL)=0 fallback)
--   ※ finalized 는 컬럼 default(false) 사용. 나머지(cooldown·전환감지)는 08 과 동일.
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
    insert into public.buy_signals
      (stock_code, stock_name, entry_price, signal_price, rank, tracking_until, max_pct)
    values
      (NEW.stock_code, NEW.stock_name, NEW.entry_price, NEW.current_price, NEW.rank,
       least( now() + interval '60 minutes',
              ((now() at time zone 'Asia/Seoul')::date + time '15:30') at time zone 'Asia/Seoul' ),
       greatest( 0, round( (NEW.current_price - NEW.entry_price)::numeric
                           / nullif(NEW.entry_price, 0) * 100, 2 ) ));
  end if;
  return NEW;
end; $$ language plpgsql security definer;

-- 트리거 자체(trg_log_buy_signal_ins/upd)는 08 에서 이미 이 함수를 바라보므로 재생성 불필요.

-- ── RLS 참고 ───────────────────────────────────────────────────────────────
-- 신규 컬럼은 기존 buy_signals_public_read(note is null) 정책으로 함께 공개됨.
-- 서버/관리자는 service_role(RLS 우회)로 UPDATE(max_pct 갱신·최고달성률 확정(finalize)) 수행.
