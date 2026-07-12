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

-- ── 현재 사용자가 볼 수 있는 최대 rank (비회원1 / free3 / vip·admin10) ──
create or replace function public.visible_rank_limit()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then 1
    else coalesce(
      (select case role when 'vip' then 10 when 'admin' then 10 else 3 end
         from public.profiles where id = auth.uid()),
      3)
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
