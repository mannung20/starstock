-- =============================================================================
-- StarStock DB 07 — stocks "고정 10슬롯(rank)" → "종목(stock_code)" 모델 전환
-- 기준: prd-v3-매수신호이력-계획2.txt (v3.1) ■2.5 / ■8 선행개편
-- ★ 08_buy_signals.sql (트리거) 실행 전에 반드시 먼저 실행.
-- ⚠️ 스키마 변경. 실행 전 stocks 데이터 백업 권장 (되돌리기 대비).
--    되돌리기: unique(stock_code) drop, unique(rank) 재생성, change_rate drop.
-- =============================================================================

begin;

-- 1) placeholder(빈 종목) 행 정리 ──────────────────────────────────────────
--    04_seed 가 만든 rank 1~10 빈 행 등 stock_code 가 없는 행은 종목이 아님.
--    (고정 슬롯 개념 폐기 → 종목이 있을 때만 행 존재)
delete from public.stocks
 where stock_code is null or trim(stock_code) = '';

-- 2) rank UNIQUE 제약 제거 ────────────────────────────────────────────────
--    등락률 동적 재정렬 시 두 종목이 순위를 맞바꾸면 배치 upsert 가
--    유니크 위반을 일으킴 → 제거. CHECK(1~10) 와 idx_stocks_rank 인덱스는 유지.
alter table public.stocks drop constraint if exists stocks_rank_key;

-- 3) 등락률 컬럼 추가 ──────────────────────────────────────────────────────
--    엑셀에서 직접 수신(1차 정렬 기준). 시가(open_price)는 그대로 유지.
alter table public.stocks add column if not exists change_rate numeric(6,2) default 0;

-- 4) stock_code UNIQUE 추가 (upsert onConflict:"stock_code" 용) ────────────
--    1) 에서 빈값을 제거했으므로 중복 충돌 없음.
alter table public.stocks add constraint stocks_stock_code_key unique (stock_code);

-- 참고) entry_date 컬럼은 남기되 미사용(추천 N일째 기능 제거). drop 하지 않음.
--       display_config 의 'entry_date'(추천일) 표시열은 별도 결정 사항(현행 유지).

commit;
