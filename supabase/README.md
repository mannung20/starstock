# StarStock — Supabase DB 셋업

Supabase Dashboard > **SQL Editor** 에서 아래 파일을 **순서대로** 붙여넣고 Run 하세요.

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `01_schema.sql` | 테이블 11개 + 인덱스 |
| 2 | `02_functions_triggers.sql` | 헬퍼 함수(`is_admin`, `visible_rank_limit`) + 가입 시 profiles 자동생성 트리거 |
| 3 | `03_rls.sql` | 전 테이블 RLS 활성화 + 정책 |
| 4 | `04_seed.sql` | stocks 1~10 빈 행, 관리자 이메일, display_config·site_config 기본값 |
| 5 | `05_referral_rpc.sql` | 추천 RPC: `process_referral`(가입 콜백 단일 트랜잭션) + `grant_vip_days`(구독 연장) + `mask_email`. 서버(service_role)만 실행 권한 |

> **01~04 를 이미 실행한 기존 프로젝트는 05 만 추가로 Run** 하면 됩니다(01~04 재실행 불필요).
> 추천 테이블/컬럼/RLS/site_config 키는 이미 01~04 에 포함, 05 는 함수만 추가합니다.

## 실행 후 대시보드에서 확인할 것
- [ ] **Authentication > Providers**: Email 가입 **비활성화**, Google **활성화** (구글 로그인만 허용)
- [ ] **Authentication > URL Configuration > Redirect URLs**: `https://starstock.vercel.app/auth/callback` 등록 (+ 로컬 `http://localhost:3000/auth/callback`)
- [ ] **Table Editor**: 각 테이블 RLS 토글이 **ON** 인지 확인
- [ ] **Settings > API**: `service_role` 키 복사 → Vercel 환경변수 `SUPABASE_SERVICE_ROLE_KEY` 에 입력

## RLS 요약 (등급별 stocks 공개 범위)
- 비회원(anon): `rank = 1`
- free: `rank <= 3`
- vip / admin: 전체 (`rank <= 10`)
- 쓰기(INSERT/UPDATE): service_role 키만 (엑셀 업로더·관리자 API 서버사이드)
