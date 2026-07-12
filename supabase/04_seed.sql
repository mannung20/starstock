-- =============================================================================
-- StarStock DB 스키마 04 — 초기 시드 데이터
-- 기준: PRD 섹션 4-5 / 14-3 / 14-8-2
-- =============================================================================

-- ── stocks: rank 1~10 빈 행 미리 생성 ───────────────────────────────────
insert into public.stocks (rank)
select g from generate_series(1, 10) as g
on conflict (rank) do nothing;

-- ── admin_whitelist: 운영자 이메일 ──────────────────────────────────────
insert into public.admin_whitelist (email, memo)
values ('kwk1020kr@gmail.com', '초기 운영자')
on conflict (email) do nothing;

-- ── display_config: 등급별 열 표시 기본값 (섹션 4-5 / 14-3) ─────────────
insert into public.display_config (role, column_key, is_visible, display_order, label) values
  -- guest (target/stop_price는 열 표시하되 API가 null 반환 → 🔒)
  ('guest','rank',          true,  1, '순위'),
  ('guest','stock_name',    true,  2, '종목명'),
  ('guest','current_price', true,  3, '현재가'),
  ('guest','status',        true,  4, '상태'),
  ('guest','target_price',  true,  5, '목표가'),
  ('guest','stop_price',    true,  6, '손절가'),
  ('guest','memo',          true,  7, '투자포인트'),
  ('guest','entry_date',    false, 8, '추천일'),
  -- free
  ('free','rank',           true,  1, '순위'),
  ('free','stock_name',     true,  2, '종목명'),
  ('free','current_price',  true,  3, '현재가'),
  ('free','status',         true,  4, '상태'),
  ('free','target_price',   true,  5, '목표가'),
  ('free','stop_price',     true,  6, '손절가'),
  ('free','memo',           true,  7, '투자포인트'),
  ('free','entry_date',     true,  8, '추천일'),
  -- vip
  ('vip','rank',            true,  1, '순위'),
  ('vip','stock_name',      true,  2, '종목명'),
  ('vip','current_price',   true,  3, '현재가'),
  ('vip','open_price',      true,  4, '시가'),
  ('vip','high_price',      true,  5, '고가'),
  ('vip','low_price',       true,  6, '저가'),
  ('vip','status',          true,  7, '상태'),
  ('vip','target_price',    true,  8, '목표가'),
  ('vip','stop_price',      true,  9, '손절가'),
  ('vip','memo',            true, 10, '투자포인트'),
  ('vip','entry_date',      true, 11, '추천일')
on conflict (role, column_key) do update set
  is_visible = excluded.is_visible,
  display_order = excluded.display_order,
  label = excluded.label;

-- ── site_config: 사이트/추천 설정 기본값 (섹션 14-8-2) ──────────────────
insert into public.site_config (key, value) values
  -- 레이아웃 & 기본 정보
  ('stock_layout',              'card'),        -- 'card' | 'table'
  ('service_name',              'StarStock'),
  ('theme',                     'light'),
  ('guest_visible_count',       '1'),
  ('free_visible_count',        '3'),
  ('upload_interval_default',   '5'),           -- 분
  ('maintenance_mode',          'false'),
  ('maintenance_message',       ''),
  ('footer_text',               '본 정보는 투자 참고용이며 투자 책임은 본인에게 있습니다.'),
  ('nav_show_notice',           'true'),
  ('nav_show_board',            'true'),
  ('nav_show_history',          'true'),
  -- 추천인 시스템
  ('referral_enabled',            'true'),
  ('referral_milestone_1_count',  '3'),
  ('referral_milestone_1_days',   '14'),
  ('referral_milestone_2_count',  '7'),
  ('referral_milestone_2_days',   '30'),
  ('referral_milestone_3_count',  '15'),
  ('referral_milestone_3_days',   '60'),
  ('referral_referee_days',       '7'),
  ('referral_repeat_count',       '5'),
  ('referral_repeat_days',        '14')
on conflict (key) do nothing;
