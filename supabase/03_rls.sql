-- =============================================================================
-- StarStock DB 스키마 03 — RLS(행 수준 보안) 활성화 + 정책
-- 기준: PRD 섹션 4-3 / 14-7 + tracker rls_policies
-- 참고: service_role 키는 RLS를 자동 우회하므로 쓰기 정책은 대부분 불필요
--       (엑셀 업로드/관리자 API는 서버사이드 service_role 사용)
-- =============================================================================

-- ── stocks: 등급별 rank 제한 SELECT, 쓰기는 service_role 전용 ───────────
alter table public.stocks enable row level security;
drop policy if exists stocks_select on public.stocks;
create policy stocks_select on public.stocks
  for select using (is_visible and rank <= public.visible_rank_limit());

-- ── profiles: 본인 or 관리자 ────────────────────────────────────────────
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ── subscriptions: 본인 or 관리자 SELECT (쓰기 service_role) ────────────
alter table public.subscriptions enable row level security;
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- ── notices: 공개 SELECT(숨김 제외), 쓰기 service_role ──────────────────
alter table public.notices enable row level security;
drop policy if exists notices_select on public.notices;
create policy notices_select on public.notices
  for select using (is_hidden = false or public.is_admin());

-- ── upload_logs: 관리자만 SELECT (INSERT service_role) ──────────────────
alter table public.upload_logs enable row level security;
drop policy if exists upload_logs_select on public.upload_logs;
create policy upload_logs_select on public.upload_logs
  for select using (public.is_admin());

-- ── admin_whitelist: 정책 없음 = service_role 전용 접근 ─────────────────
alter table public.admin_whitelist enable row level security;

-- ── display_config: 공개 SELECT, 쓰기 service_role ─────────────────────
alter table public.display_config enable row level security;
drop policy if exists display_config_select on public.display_config;
create policy display_config_select on public.display_config
  for select using (true);

-- ── site_config: 공개 SELECT, 쓰기 service_role ────────────────────────
alter table public.site_config enable row level security;
drop policy if exists site_config_select on public.site_config;
create policy site_config_select on public.site_config
  for select using (true);

-- ── stock_history: 공개 SELECT ─────────────────────────────────────────
alter table public.stock_history enable row level security;
drop policy if exists stock_history_select on public.stock_history;
create policy stock_history_select on public.stock_history
  for select using (true);

-- ── referral_logs: 추천인 본인만 SELECT/UPDATE (INSERT service_role) ────
alter table public.referral_logs enable row level security;
drop policy if exists reflogs_select on public.referral_logs;
create policy reflogs_select on public.referral_logs
  for select using (referrer_id = auth.uid());
drop policy if exists reflogs_update on public.referral_logs;
create policy reflogs_update on public.referral_logs
  for update using (referrer_id = auth.uid())
  with check (referrer_id = auth.uid());

-- ── referral_rewards: 추천인 본인만 SELECT (INSERT service_role) ────────
alter table public.referral_rewards enable row level security;
drop policy if exists refrewards_select on public.referral_rewards;
create policy refrewards_select on public.referral_rewards
  for select using (referrer_id = auth.uid());
