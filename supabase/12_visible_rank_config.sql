-- =============================================================================
-- StarStock DB 스키마 12 — 등급별 공개 종목 수를 site_config 와 연동
-- =============================================================================
--   ★핵심: 기존 visible_rank_limit() 은 개수(비회원1/free3/vip10)가 하드코딩이라
--           관리자 '운영설정' 탭의 guest_visible_count·free_visible_count 값이
--           실제 노출 개수에 반영되지 않았음 → 이 파일로 연동.
--   ※전제: 01~04 를 이미 실행한 기존 프로젝트는 12 만 추가 Run(전 구문 idempotent).
--   ※주의: value 는 text 라 잘못된 입력(빈값·문자·음수)이 ::int 예외를 던질 수 있어
--           site_config_int() 헬퍼에서 정규식으로 방어하고 [1,10] 로 클램프.
-- =============================================================================

-- ── site_config 값을 안전하게 정수로 읽기 (없음/빈값/문자/음수 → 기본값) ──
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

-- ── 현재 사용자가 볼 수 있는 최대 rank (site_config 연동판) ──────────────
--     비회원 → guest_visible_count(기본1) / free·reseller → free_visible_count(기본3)
--     vip·admin → 10 고정(전체 공개)
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

-- ── (안전망) guest_visible_count·free_visible_count 키가 없으면 기본값 시드 ──
insert into public.site_config (key, value) values
  ('guest_visible_count', '1'),
  ('free_visible_count',  '3')
on conflict (key) do nothing;
