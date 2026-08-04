# -*- coding: utf-8 -*-
"""레벨2 시뮬레이션 — 3분봉 엑셀 Python 재생 (로컬 전용, ★git 제외).

  ── [2026-07-16] 단일 돌파선 → "밴드 + 활성화" 방식 ──
  ── [2026-07-26] 3구역 → 4구역 이식: 실운영 starstock_uploader.py 와 판정 로직 동일화 ──
  목적 : 웹의 매수적기/관망유지/손절조심(🟢🟡🔴)을 3분봉 '종가' 위치로 자동 판정·표시.
         시뮬은 실제 봉 종가로 돌려 실운영(현재가 스냅샷)과 같은 판정을 사전검증하는 것이 가치이므로,
         경계선·구역·연속확정 규칙은 band_logic.py 공통 모듈을 통해 업로더와 공유한다.

  용어 (매수기준가 = 전일고가, 아래 4개 선의 기준점):
    · 매수활성화선 = 기준가×(1+breakout_ratio/100), 기본 ×1.015 — 웹에 '켜는' 문턱.
    · 상한밴드(관망유지 경계) = 기준가×(1+band_upper_ratio/100), 기본 ×1.02
    · 매도활성화선 = 기준가×(1−sell_breakout_ratio/100), 기본 ×0.985 — 손절조심 '켜는' 선.
    · 하한밴드(관심끊음 경계) = 기준가×(1−band_lower_ratio/100), 기본 ×0.98

  표시기준:
    · 활성화 = '종가 ≥ 매수활성화선' 이 consecutive_candles 연속 → 최초 1회 돌파확정. 그 전엔 대기(웹 미표시).
    · 활성화 後 4구역(종가 기준):
        종가 > 상한밴드                        → 🟡 관망유지(hold)
        매도활성화선 ≤ 종가 ≤ 상한밴드          → 🟢 매수적기(buy)
        종가 < 매도활성화선(sell연속 미확정)     → 🟢 매수적기 유지(깜빡임 방지)
        하한밴드 ≤ 종가 < 매도활성화선(확정)     → 🔴 손절조심(sell)
        종가 < 하한밴드(확정)                   → ⚫ 관심끊음(cutoff) = 웹숨김(is_visible=false)
    · 손절조심·관심끊음은 매도활성화선 아래 sell_consecutive_candles 연속 확정돼야 적용.
    · ※ 실운영의 min_change_rate(등락률<N% 후보제외)는 시뮬 입력(A~F 봉데이터)에 등락률이 없어 미적용.
       — 활성화선 문턱 판정은 동일하므로 결과 영향은 제한적(등락률 낮은 종목까지 재생될 뿐).

  처리흐름: 캔들 종가 주입 → 활성화 판정 → 4구역 status → stocks upsert(관심끊음=is_visible false)
           → DB 트리거가 buy_signals 자동 기록(status=buy 전환 시) → 재생 신호는 note='[replay]' 태깅.
  ★운영정지(maintenance_mode='true') 필수 — 실 stocks 를 변경하므로.
  정리 : 관리자 [재생신호 일괄삭제] + 이 스크립트가 stocks 원복(스냅샷 복원/임시종목 삭제).

  입력 엑셀(A~F): 날짜 · 시간 · 시가 · 고가 · 저가 · 종가 (3분봉). 시간 내림차순이어도 자동 정렬.
  사용: python3 replay_3min.py [엑셀경로]   (경로 생략 시 프롬프트)
  접속: web/.env.local 의 SUPABASE_SERVICE_ROLE_KEY 재사용. config.json 의 entry_price(감도) 공유.
"""
import os
import sys
import json
import datetime
import requests
import openpyxl
from typing import Any, Dict, List, Optional, Tuple
import band_logic

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ENV = os.path.join(ROOT, "web", ".env.local")
CFG = os.path.join(HERE, "config.json")


# ── 유틸 ──────────────────────────────────────────────────────────────

def load_env(path: str) -> Dict[str, str]:
    d: Dict[str, str] = {}
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip().strip('"')
    except OSError as e:
        print(f"⚠️ 환경파일 읽기 실패: {e}")
        sys.exit(1)
    return d


def load_cfg() -> Dict[str, Any]:
    try:
        with open(CFG, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def to_int(v: Any) -> int:
    try:
        return int(round(float(v)))
    except Exception:
        return 0


def _hhmm(tm: Any) -> int:
    """시간문자열('09:06:00'/'9:06'/'0906')에서 '자정 이후 분' 정수 반환. 파싱 실패 시 -1."""
    try:
        s = str(tm).strip()
        if ":" in s:
            p = s.split(":")
            return int(p[0]) * 60 + int(p[1])
        d = "".join(ch for ch in s if ch.isdigit())
        if len(d) >= 3:
            return int(d[:-2]) * 60 + int(d[-2:])
    except Exception:
        pass
    return -1


# ── 연결·설정 ──────────────────────────────────────────────────────────

def build_supabase_headers(env: Dict[str, str]) -> Tuple[str, Dict[str, str]]:
    """env dict → (supa_url, 공통헤더) 튜플."""
    try:
        supa = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
        skey = env["SUPABASE_SERVICE_ROLE_KEY"]
    except KeyError as e:
        print(f"⚠️ 환경파일에 필수 키 없음: {e}")
        sys.exit(1)
    H = {"apikey": skey, "Authorization": f"Bearer {skey}", "Content-Type": "application/json"}
    return supa, H


def load_band_params() -> Dict[str, Any]:
    """config.json entry_price 블록 → 4구역 비율·연속캔들 수 dict 반환.

    실운영(starstock_uploader.py)과 동일한 키를 읽어 시뮬 판정에 사용.
    """
    ep = load_cfg().get("entry_price", {})
    return {
        "ratio":       float(ep.get("breakout_ratio", 1.5)) / 100,       # 매수활성화선 비율
        "upper_ratio": float(ep.get("band_upper_ratio", 2.0)) / 100,     # 상한밴드 비율
        "lower_ratio": float(ep.get("band_lower_ratio", 2.0)) / 100,     # 하한밴드 비율
        "sell_ratio":  float(ep.get("sell_breakout_ratio", 1.5)) / 100,  # 매도활성화선 비율
        "req":         int(ep.get("consecutive_candles", 2)),             # 매수 활성화 연속캔들 수
        "sell_cnt":    int(ep.get("sell_consecutive_candles", 2)),        # 매도 확정 연속캔들 수
    }


# ── 안전장치 ───────────────────────────────────────────────────────────

def check_maintenance(supa: str, H: Dict[str, str]) -> None:
    """운영정지(maintenance_mode=true) 미확인 시 오류 출력 후 종료.

    실 stocks 를 변경하므로 반드시 ON 상태여야 실행 가능.
    """
    try:
        mc = requests.get(
            f"{supa}/rest/v1/site_config?key=eq.maintenance_mode&select=value",
            headers=H, timeout=15,
        ).json()
    except Exception as e:
        print(f"⚠️ 운영정지 확인 실패 (네트워크 오류): {e}")
        sys.exit(1)
    if not (mc and mc[0].get("value") == "true"):
        print("⚠️ 운영정지(maintenance_mode)가 OFF 입니다.")
        print("   관리자 상단바에서 [운영정지 ON] 후 다시 실행하세요. (실 stocks 를 변경하므로 필수)")
        sys.exit(1)


# ── 입력 데이터 ────────────────────────────────────────────────────────

def load_candles(xlsm: str) -> List[tuple]:
    """엑셀 A~F열(날짜·시간·시가·고가·저가·종가) 읽기 → 행 리스트 반환."""
    try:
        wb = openpyxl.load_workbook(xlsm, data_only=True, read_only=True)
    except Exception as e:
        print(f"⚠️ 엑셀 파일 열기 실패: {e}")
        sys.exit(1)
    ws = wb.active
    rows: List[tuple] = []
    for a, b, c, d, e, close in ws.iter_rows(min_row=2, max_col=6, values_only=True):
        if a in (None, "") or close in (None, ""):
            continue
        rows.append((str(a).strip(), str(b).strip(), c, d, e, close))
    if not rows:
        print("데이터 없음(A~F 비어있음).")
        sys.exit(1)
    return rows


def select_date(rows: List[tuple]) -> str:
    """rows 에서 날짜 목록 추출 → 사용자 선택 또는 최신 날짜 자동 선택."""
    dates = sorted({r[0] for r in rows})
    if len(dates) > 1:
        print("가능한 날짜:", ", ".join(dates))
        sel = input(f"재생할 날짜 선택 (엔터=최신 {dates[-1]}): ").strip() or dates[-1]
    else:
        sel = dates[0]
    return sel


def filter_candles(rows: List[tuple], sel: str) -> List[tuple]:
    """선택 날짜 필터 + 시간 오름차순 정렬 + 09:00 이전(장전) 캔들 제거."""
    day = sorted([r for r in rows if r[0] == sel], key=lambda r: (r[0], r[1]))
    before = len(day)
    # 09시(540분) 이전 캔들 제외. 파싱 실패(-1)는 안전하게 유지.
    day = [r for r in day if not (0 <= _hhmm(r[1]) < 9 * 60)]
    skipped = before - len(day)
    note = f" (09시 이전 {skipped}개 제외)" if skipped else ""
    print(f"재생 날짜={sel}, 캔들 {len(day)}개 · 09:00부터{note}")
    return day


def prompt_stock_inputs(xlsm: str) -> Tuple[str, str, int, int]:
    """종목코드·종목명·전일고가·rank 대화형 입력 → (code, name, prev_high, rank) 반환."""
    code = input("종목코드(6자리): ").strip()
    if len(code) != 6 or not code.isdigit():
        print("종목코드는 6자리 숫자여야 합니다.")
        sys.exit(1)
    name = input("종목명(엔터=파일명 사용): ").strip() or os.path.splitext(os.path.basename(xlsm))[0]
    prev_high = to_int(input("전일고가(매수기준가): ").strip())
    rank = int(input("rank(엔터=1): ").strip() or "1")
    return code, name, prev_high, rank


def compute_bands(entry: int, ratio: float, upper_ratio: float,
                  lower_ratio: float, sell_ratio: float) -> Tuple[int, int, int, int]:
    """전일고가(entry) + 비율 4종 → (매수활성화선, 상한밴드, 매도활성화선, 하한밴드) 반환.

    실운영(starstock_uploader.py)과 동일하게 int() 절삭 적용.
    """
    act_line   = int(entry * (1 + ratio))        # 매수활성화선: 기준가×(1+ratio)
    upper_band = int(entry * (1 + upper_ratio))  # 상한밴드: 관망유지 경계
    sell_line  = int(entry * (1 - sell_ratio))   # 매도활성화선: 손절조심 켜는 선
    lower_band = int(entry * (1 - lower_ratio))  # 하한밴드: 관심끊음 경계
    return act_line, upper_band, sell_line, lower_band


# ── Supabase 조작 ──────────────────────────────────────────────────────

def take_snapshot(supa: str, H: Dict[str, str], code: str) -> Tuple[List, int]:
    """재생 전 현재 stocks 행 스냅샷 + buy_signals 최대 id 기록.

    Returns:
        (snap, start_id) — snap 은 원복용, start_id 는 신규 신호 태깅 범위 산정용.
    """
    try:
        snap: List = requests.get(
            f"{supa}/rest/v1/stocks?stock_code=eq.{code}&select=*",
            headers=H, timeout=15,
        ).json()
        last: List = requests.get(
            f"{supa}/rest/v1/buy_signals?select=id&order=id.desc&limit=1",
            headers=H, timeout=15,
        ).json()
    except Exception as e:
        print(f"⚠️ 스냅샷 취득 실패: {e}")
        sys.exit(1)
    start_id: int = last[0]["id"] if last else 0
    return snap, start_id


def _make_mark(status: str, cur: int, entry: int, down: int, sell_cnt: int) -> str:
    """status → 콘솔 출력용 mark 문자열 생성 (시뮬 전용).

    buy 두 종류 구분: down==0이면 sell_line 위(plain 매수적기),
                     down>0이면 sell_line 아래 미확정(매수적기 유지).
    """
    if status == "hold":
        return f"🟡 관망유지 +{(cur / entry - 1) * 100:.1f}%"
    if status == "buy":
        if down > 0:
            return f"🟢 매수적기 유지 ({down}/{sell_cnt})"
        return "🟢 매수적기"
    if status == "cutoff":
        return "⚫ 관심끊음"
    return "🔴 손절조심"


def _print_band_header(act_line: int, upper_band: int, sell_line: int, lower_band: int) -> None:
    """캔들 재생 전 4개 경계선을 박스로 1회 출력. 이후 루프에서 반복 표시 불필요."""
    border = "═" * 62
    print(f"  {border}")
    print(f"  ⚫ 하한 {lower_band:,}   │   🔴 매도 {sell_line:,}"
          f"   │   🟢 활성화 {act_line:,}   │   🟡 상한 {upper_band:,}")
    print(f"  {border}")


def replay_candles(supa: str, H: Dict[str, str], day: List[tuple],
                   code: str, name: str, entry: int, rank: int,
                   act_line: int, upper_band: int, sell_line: int,
                   lower_band: int, req: int, sell_cnt: int) -> None:
    """캔들 배열 순차 재생 → Supabase upsert (status 전환 시 또는 마지막 캔들만).

    활성화(연속 req 캔들 종가≥매수활성화선) 전에는 웹 미전송(콘솔 대기 표시만).
    """
    consec = 0       # 매수활성화선 위 연속 카운트 (활성화 확정 전용)
    down = 0         # 매도활성화선 아래 연속 카운트 (손절조심·관심끊음 확정용)
    activated = False
    prev_status: Optional[str] = None
    sent = 0
    last_i = len(day) - 1
    up_headers = {**H, "Prefer": "resolution=merge-duplicates"}
    _print_band_header(act_line, upper_band, sell_line, lower_band)

    for i, (dt, tm, o, h, l, close) in enumerate(day):
        cur = to_int(close)

        # ── 활성화 판정: 종가 ≥ 매수활성화선이 req캔들 연속 ──
        if not activated:
            consec = consec + 1 if cur >= act_line else 0
            if consec >= req:
                activated = True
                print(f"  {tm}   {cur:>8,}   ✅ 활성화 확정! ({req}/{req}) → 4구역 판정 시작")
            else:
                print(f"  {tm}   {cur:>8,}   ⏳ 대기 {consec}/{req}")
                continue

        # ── 활성화됨 → 4구역 판정 (band_logic 공통 모듈) ──
        down = down + 1 if cur < sell_line else 0
        status = band_logic.determine_status(cur, upper_band, sell_line, lower_band, down, sell_cnt)
        mark = _make_mark(status, cur, entry, down, sell_cnt)

        # status 전환 시(또는 마지막 캔들)만 Supabase 전송 — 불필요한 upsert 최소화
        do_send = (status != prev_status) or (i == last_i)
        if do_send:
            visible = (status != "cutoff")                       # 관심끊음 → 웹숨김
            db_status = "sell" if status == "cutoff" else status  # DB는 buy/hold/sell 3종만 저장
            row = {
                "stock_code": code, "stock_name": name, "current_price": cur,
                "open_price": to_int(o), "high_price": to_int(h), "low_price": to_int(l),
                "entry_price": entry, "entry_confirmed": True, "change_rate": 0,
                "status": db_status, "rank": rank, "is_visible": visible,
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
            try:
                requests.post(
                    f"{supa}/rest/v1/stocks?on_conflict=stock_code",
                    headers=up_headers, json=row, timeout=15,
                )
                sent += 1
            except Exception as e:
                print(f"  ⚠️ upsert 실패 ({tm}): {e}")

        prev_status = status
        tag = "→ 전송" if do_send else "  · 유지"
        print(f"  {tm}   {cur:>8,}   {mark}  {tag}")

    print(f"\n  총 {len(day)}캔들 · 전송 {sent}회")


def tag_replay_signals(supa: str, H: Dict[str, str], start_id: int) -> None:
    """start_id 이후 새로 생성된 buy_signals 에 note='[replay]' 태깅."""
    try:
        tagged = requests.patch(
            f"{supa}/rest/v1/buy_signals?id=gt.{start_id}&note=is.null",
            headers={**H, "Prefer": "return=representation"},
            json={"note": "[replay]"}, timeout=15,
        ).json()
        print(f"\n재생 신호 [replay] 태깅: {len(tagged) if isinstance(tagged, list) else 0}건")
    except Exception as e:
        print(f"⚠️ [replay] 태깅 실패: {e}")


def restore_stock(supa: str, H: Dict[str, str], code: str, snap: List) -> None:
    """재생 종료 후 stocks 를 재생 전 상태로 원복.

    재생 전 종목이 없었으면 삭제, 있었으면 스냅샷 행으로 PATCH 복원.
    """
    try:
        if snap:
            orig = dict(snap[0])
            orig.pop("id", None)  # id는 서버 자동관리 — PATCH 시 제외
            requests.patch(
                f"{supa}/rest/v1/stocks?stock_code=eq.{code}",
                headers=H, json=orig, timeout=15,
            )
            print("stocks 원복 완료(스냅샷 복원).")
        else:
            requests.delete(f"{supa}/rest/v1/stocks?stock_code=eq.{code}", headers=H, timeout=15)
            print("재생용 임시 종목 삭제 완료.")
    except Exception as e:
        print(f"⚠️ stocks 원복 실패 — 수동으로 확인하세요: {e}")


# ── 진입점 ─────────────────────────────────────────────────────────────

def main() -> None:
    env = load_env(ENV)
    supa, H = build_supabase_headers(env)
    bp = load_band_params()

    # 0) 운영정지 확인 (안전장치)
    check_maintenance(supa, H)

    # 1) 입력 엑셀 로드 (A~F)
    xlsm = sys.argv[1] if len(sys.argv) > 1 else input("재생할 .xlsm 경로: ").strip().strip('"')
    print(f"■ 선택 파일: {os.path.basename(xlsm)}")
    rows = load_candles(xlsm)

    # 2) 날짜 선택 + 09:00 이전 캔들 제거
    sel = select_date(rows)
    day = filter_candles(rows, sel)

    # 3) 콘솔 입력 + 4개 경계선 산출
    code, name, prev_high, rank = prompt_stock_inputs(xlsm)
    entry = prev_high  # 매수기준가 = 전일고가
    act_line, upper_band, sell_line, lower_band = compute_bands(
        entry, bp["ratio"], bp["upper_ratio"], bp["lower_ratio"], bp["sell_ratio"]
    )
    print(f"밴드: 기준가={entry}  매수활성화선(×{1 + bp['ratio']:.3f})={act_line}"
          f"  상한(×{1 + bp['upper_ratio']:.3f})={upper_band}")
    print(f"      매도활성화선(×{1 - bp['sell_ratio']:.3f})={sell_line}"
          f"  하한(×{1 - bp['lower_ratio']:.3f})={lower_band}")
    print(f"  활성화: 종가≥매수활성화선 {bp['req']}캔들 연속 → 4구역 판정 시작")
    print(f"  활성화 후 → 상한초과:🟡관망유지 / 매도활성화선~상한:🟢매수적기 /")
    print(f"             하한~매도활성화선(sell {bp['sell_cnt']}캔들 확정):🔴손절조심"
          f" / 하한미만(확정):⚫관심끊음(웹숨김)")

    # 4) 스냅샷 + 재생 시작 id (원복·태깅 범위 산정용)
    snap, start_id = take_snapshot(supa, H, code)

    # 5) 캔들 재생
    replay_candles(
        supa, H, day, code, name, entry, rank,
        act_line, upper_band, sell_line, lower_band,
        bp["req"], bp["sell_cnt"],
    )

    # 6) 재생 신호 [replay] 태깅
    tag_replay_signals(supa, H, start_id)

    # 7) 확인 → stocks 원복
    print("=== 관리자 /admin/signals 에서 [재생] 배지로 확인하세요 ===")
    input("확인 후 Enter → stocks 원복 진행...")
    restore_stock(supa, H, code, snap)
    print("마무리: 관리자 [재생신호 일괄삭제]로 [replay] 제거 → 운영정지 OFF.")


if __name__ == "__main__":
    main()
