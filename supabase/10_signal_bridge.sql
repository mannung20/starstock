-- =============================================================================
-- StarStock DB 10 — 자동 최고달성률 → 수동(홈) 조건부 자동 승격 브릿지
-- 기준: prd-v3-자동홈승격브릿지-계획1.txt (rev2)
-- ★ 08_buy_signals.sql, 09_signal_performance.sql 실행 뒤에 실행.
-- 내용: (1) stock_history.signal_id 컬럼  (2) FK ON DELETE CASCADE  (3) 부분 UNIQUE
--       (4) site_config 브릿지 기본값 3키
-- 재실행 안전(idempotent).
-- =============================================================================

-- ── (1) 승격 링크 컬럼 ──────────────────────────────────────────────────────
--   signal_id != null = '승격행'(buy_signals 에서 자동 복사). null = 기존 수동행.
--   buy_signals.id 는 bigserial → bigint 로 참조.
alter table public.stock_history
  add column if not exists signal_id bigint;

-- ── (2) FK: 자동신호 삭제 시 승격행도 함께 삭제(CASCADE, 사용자결정 D) ────────
--   add constraint 는 IF NOT EXISTS 미지원 → duplicate_object 예외로 멱등 처리.
do $$ begin
  alter table public.stock_history
    add constraint stock_history_signal_id_fkey
    foreign key (signal_id) references public.buy_signals(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- ── (3) 멱등키(부분 UNIQUE): 한 신호당 승격행 1개만 ─────────────────────────
--   승격행만 유일성 강제. 수동행(signal_id null)은 부분인덱스 대상 밖 → 다중 허용.
--   서버 브릿지의 upsert(onConflict=signal_id, ignoreDuplicates)가 이 인덱스에 의존.
create unique index if not exists uq_stock_history_signal_id
  on public.stock_history (signal_id)
  where signal_id is not null;

-- ── (4) site_config 브릿지 기본값 (없을 때만; 관리자 UI 에서 조정) ───────────
--   auto_bridge_enabled  : 활성 스위치(기본 off — 켜야 승격 시작)
--   auto_bridge_min_pct  : 최소 최고달성률(%) 기본 5
--   auto_bridge_full_only: 완주창만(단축창 제외) 기본 true
insert into public.site_config (key, value) values
  ('auto_bridge_enabled',   'false'),
  ('auto_bridge_min_pct',   '5'),
  ('auto_bridge_full_only', 'true')
on conflict (key) do nothing;

-- ── RLS 참고 ───────────────────────────────────────────────────────────────
-- stock_history 는 이미 공개 read(홈 노출) → 승격행도 함께 공개됨(의도).
-- 승격 INSERT 는 서버 service_role(RLS 우회). 신규 컬럼 별도 정책 불필요.

-- ── 적용 후 검증(참고) ──────────────────────────────────────────────────────
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='stock_history' and column_name='signal_id';
-- select conname from pg_constraint where conname='stock_history_signal_id_fkey';
-- select indexname from pg_indexes where indexname='uq_stock_history_signal_id';
-- select key, value from public.site_config where key like 'auto_bridge_%' order by key;
