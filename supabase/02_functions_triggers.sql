-- =============================================================================
-- StarStock DB 스키마 02 — 헬퍼 함수 + Auth 트리거
-- (RLS 정책이 이 함수들을 참조하므로 03_rls 보다 먼저 실행)
-- =============================================================================

-- ── 관리자 여부 (SECURITY DEFINER: profiles 정책 재귀 방지) ──────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── site_config 값을 안전하게 정수로 읽기 (없음/빈값/문자/음수 → 기본값) ──
--   ★핵심: value 는 text 라 잘못된 입력이 ::int 캐스트 예외를 던질 수 있어 정규식으로 방어.
--   greatest/least 로 rank 유효범위 [1,10] 클램프. SECURITY DEFINER 라 site_config RLS 우회.
create or replace function public.site_config_int(p_key text, p_default int)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select greatest(1, least(10, value::int))
       from public.site_config
      where key = p_key
        and value ~ '^\s*\d+\s*$'),   -- 순수 숫자만 통과(음수·빈값·문자 → 무시 → 기본값)
    p_default);
$$;

-- ── 현재 사용자가 볼 수 있는 최대 rank ──────────────────────────────────
--   ★핵심: 개수는 site_config 에서 읽음(관리자 '운영설정' 탭과 연동)
--     비회원 → guest_visible_count(기본1) / free·reseller → free_visible_count(기본3)
--     vip·admin → 10 고정(전체 공개). ※전제: rank 최대 10
create or replace function public.visible_rank_limit()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then public.site_config_int('guest_visible_count', 1)
    else coalesce(
      (select case role
                when 'vip'   then 10
                when 'admin' then 10
                else public.site_config_int('free_visible_count', 3)
              end
         from public.profiles where id = auth.uid()),
      public.site_config_int('free_visible_count', 3))
  end;
$$;

-- ── 신규 가입 시 profiles 자동 생성 (섹션 9-2) ──────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role, last_login)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'free',
    now()
  )
  on conflict (id) do update set last_login = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
