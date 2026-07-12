-- =============================================================================
-- StarStock DB 05 — 추천 시스템 RPC (process_referral) + VIP 구독 연장 함수
-- 실행 순서: 01_schema → 02_functions_triggers → 03_rls → 04_seed → (여기) 05
-- PRD 섹션 17-4 명세를 단일 트랜잭션 RPC 로 구현.
--   referral_logs INSERT + referral_rewards INSERT + subscriptions 연장 원자성 보장.
-- 전제(이미 01~04 에 존재): profiles.referral_code/referred_by, referral_logs,
--   referral_rewards, subscriptions, site_config 추천 10개 키.
-- =============================================================================

-- ── 이메일 마스킹 (referral_logs.referee_email 저장용: nick***@g..) ──────────
create or replace function public.mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then p_email
    else left(split_part(p_email, '@', 1), 2) || '***@'
         || left(split_part(p_email, '@', 2), 1) || '..'
  end;
$$;

-- ── [A] VIP 구독 연장 공통 함수 (PRD 17-4 [A]) ──────────────────────────────
--   기존 유한 구독 있음 : end_date = MAX(오늘, 최신 end_date) + p_days (새 이력 행 INSERT)
--   기존 구독 없음/만료 : start=오늘, end=오늘 + p_days
--   무기한(end_date IS NULL) 활성 구독: 연장 불필요(무기한 유지), role 만 보장
create or replace function public.grant_vip_days(
  p_user   uuid,
  p_days   int,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest_end date;
begin
  -- 무기한 활성 구독이 있으면 일수 연장 무의미 → role 만 보장하고 종료
  if exists (
    select 1 from subscriptions
    where user_id = p_user and end_date is null and start_date <= current_date
  ) then
    update profiles set role = 'vip' where id = p_user and role <> 'admin';
    return;
  end if;

  -- 기존 최신 종료일(없으면 NULL). base = MAX(오늘, 최신 종료일)
  select max(end_date) into v_latest_end from subscriptions where user_id = p_user;

  insert into subscriptions (user_id, plan, start_date, end_date, payment_method)
  values (
    p_user,
    'vip',
    current_date,
    greatest(current_date, coalesce(v_latest_end, current_date)) + p_days,
    p_reason
  );

  update profiles set role = 'vip' where id = p_user and role <> 'admin';
end;
$$;

-- ── process_referral: 가입 콜백에서 호출되는 단일 트랜잭션 RPC ────────────────
--   p_referee  : 방금 가입한 피추천인 UUID (auth.uid)
--   p_ref_code : 추천 URL 의 ref 코드 (profiles.referral_code)
--   반환: jsonb { ok, reason?, referrer?, referee_days?, referrer_count? }
create or replace function public.process_referral(
  p_referee  uuid,
  p_ref_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer    uuid;
  v_email       text;
  v_count       int;
  v_referee_days int;
  v_c1 int; v_d1 int;
  v_c2 int; v_d2 int;
  v_c3 int; v_d3 int;
  v_repeat_c int; v_repeat_d int;
  v_repeat_seq int;
  v_mnum int;
  v_granted jsonb := '[]'::jsonb;  -- 이번 호출에서 지급된 보상 목록(이메일 알림용)
begin
  -- 0) 추천 시스템 비활성화면 종료
  if coalesce((select value from site_config where key = 'referral_enabled'), 'true') <> 'true' then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  -- 1) 이미 추천받은 이력(referred_by) 있으면 종료 (1인 1회)
  if exists (select 1 from profiles where id = p_referee and referred_by is not null) then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;

  -- 2) 추천인 조회 (유효 코드 + 차단 아님)
  select id into v_referrer
  from profiles
  where referral_code = p_ref_code and is_banned = false;

  if v_referrer is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  -- 3) 자기추천 방지
  if v_referrer = p_referee then
    return jsonb_build_object('ok', false, 'reason', 'self_referral');
  end if;

  -- 4) site_config 보상 설정 로드 (기본값 방어)
  select coalesce(value::int, 7)  into v_referee_days from site_config where key = 'referral_referee_days';
  select coalesce(value::int, 3)  into v_c1 from site_config where key = 'referral_milestone_1_count';
  select coalesce(value::int, 14) into v_d1 from site_config where key = 'referral_milestone_1_days';
  select coalesce(value::int, 7)  into v_c2 from site_config where key = 'referral_milestone_2_count';
  select coalesce(value::int, 30) into v_d2 from site_config where key = 'referral_milestone_2_days';
  select coalesce(value::int, 15) into v_c3 from site_config where key = 'referral_milestone_3_count';
  select coalesce(value::int, 60) into v_d3 from site_config where key = 'referral_milestone_3_days';
  select coalesce(value::int, 5)  into v_repeat_c from site_config where key = 'referral_repeat_count';
  select coalesce(value::int, 14) into v_repeat_d from site_config where key = 'referral_repeat_days';
  v_referee_days := coalesce(v_referee_days, 7);
  v_c1 := coalesce(v_c1, 3);   v_d1 := coalesce(v_d1, 14);
  v_c2 := coalesce(v_c2, 7);   v_d2 := coalesce(v_d2, 30);
  v_c3 := coalesce(v_c3, 15);  v_d3 := coalesce(v_d3, 60);
  v_repeat_c := coalesce(v_repeat_c, 5); v_repeat_d := coalesce(v_repeat_d, 14);

  -- 5) referred_by 기록
  update profiles set referred_by = v_referrer where id = p_referee;

  -- 6) referral_logs INSERT (referee_id UNIQUE 로 중복 방지, 이메일 마스킹 저장)
  select email into v_email from profiles where id = p_referee;
  insert into referral_logs (referrer_id, referee_id, referee_email)
  values (v_referrer, p_referee, public.mask_email(v_email))
  on conflict (referee_id) do nothing;

  -- 7) [B] 피추천인 웰컴 보상 (referrer_id = 피추천인 본인, milestone=0)
  insert into referral_rewards (referrer_id, milestone, reward_days, reward_type)
  values (p_referee, 0, v_referee_days, 'referee')
  on conflict (referrer_id, milestone) do nothing;
  perform public.grant_vip_days(p_referee, v_referee_days, 'referral_referee');
  v_granted := v_granted || jsonb_build_object('user', p_referee, 'days', v_referee_days, 'reason', '가입 환영');

  -- 8) 추천인 누적 추천 수
  select count(*) into v_count from referral_logs where referrer_id = v_referrer;

  -- 9) [C] 추천인 마일스톤 1~3 (각 번호 1회만, unique(referrer_id,milestone) 이중 방어)
  if v_count >= v_c1 and not exists (
       select 1 from referral_rewards where referrer_id = v_referrer and milestone = 1) then
    insert into referral_rewards (referrer_id, milestone, reward_days, reward_type)
    values (v_referrer, 1, v_d1, 'milestone');
    perform public.grant_vip_days(v_referrer, v_d1, 'referral_milestone_1');
    v_granted := v_granted || jsonb_build_object('user', v_referrer, 'days', v_d1, 'reason', '추천 ' || v_c1 || '명 달성');
  end if;

  if v_count >= v_c2 and not exists (
       select 1 from referral_rewards where referrer_id = v_referrer and milestone = 2) then
    insert into referral_rewards (referrer_id, milestone, reward_days, reward_type)
    values (v_referrer, 2, v_d2, 'milestone');
    perform public.grant_vip_days(v_referrer, v_d2, 'referral_milestone_2');
    v_granted := v_granted || jsonb_build_object('user', v_referrer, 'days', v_d2, 'reason', '추천 ' || v_c2 || '명 달성');
  end if;

  if v_count >= v_c3 and not exists (
       select 1 from referral_rewards where referrer_id = v_referrer and milestone = 3) then
    insert into referral_rewards (referrer_id, milestone, reward_days, reward_type)
    values (v_referrer, 3, v_d3, 'milestone');
    perform public.grant_vip_days(v_referrer, v_d3, 'referral_milestone_3');
    v_granted := v_granted || jsonb_build_object('user', v_referrer, 'days', v_d3, 'reason', '추천 ' || v_c3 || '명 달성');
  end if;

  -- 10) [D] 3단계 초과 후 반복 지급 (repeat_count 명마다, milestone 4,5,6...)
  if v_count > v_c3 then
    v_repeat_seq := floor((v_count - v_c3)::numeric / v_repeat_c);
    if v_repeat_seq >= 1 then
      v_mnum := 3 + v_repeat_seq;
      if not exists (
           select 1 from referral_rewards where referrer_id = v_referrer and milestone = v_mnum) then
        insert into referral_rewards (referrer_id, milestone, reward_days, reward_type)
        values (v_referrer, v_mnum, v_repeat_d, 'repeat');
        perform public.grant_vip_days(v_referrer, v_repeat_d, 'referral_repeat');
        v_granted := v_granted || jsonb_build_object('user', v_referrer, 'days', v_repeat_d, 'reason', '추천 ' || v_count || '명 달성');
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'referrer', v_referrer,
    'referee_days', v_referee_days,
    'referrer_count', v_count,
    'granted', v_granted   -- [{user, days, reason}] 이번 지급분 (이메일 알림용)
  );
end;
$$;

-- ── 실행 권한 잠금: 보상 지급 함수는 서버(service_role)만 호출 가능 ──────────
--   가입 콜백이 admin(service_role) 클라이언트로 RPC 호출. anon/authenticated 차단.
revoke all on function public.process_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_vip_days(uuid, int, text) from public, anon, authenticated;
grant execute on function public.process_referral(uuid, text) to service_role;
grant execute on function public.grant_vip_days(uuid, int, text) to service_role;
