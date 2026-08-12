# -*- coding: utf-8 -*-
"""
StarStock 자동 업로더 — 3분봉 밴드 4구역 매수신호 자동판정 + 업로드
─────────────────────────────────────────────────────
[2026-07-16 개정] 단일 돌파선 → "밴드 + 활성화" 방식으로 변경 (시뮬 replay_3min.py 와 동일 로직).
[2026-07-24 개정] 3구역 → 4구역 대칭구조. 하단에 '관심끊음(웹숨김)' 추가,
                  손절조심·관심끊음은 매도활성화선 아래 sell연속캔들 확정돼야 적용(깜빡임 방지),
                  매수활성화선을 '전일고가×(1+buy돌파%)'로 되살림(기준가 초과만으론 활성화 안 됨).
목적 : 웹의 매수적기/관망유지/손절조심(🟢🟡🔴)을 현재가(3분봉 종가 대용) 위치로 자동판정.
       (기존은 웹 status 를 엑셀 J열 수동 드롭다운에서 읽었음 → 이제 코드가 자동계산·J열 자동기입)

용어 (매수기준가 = 전일고가 L열, 아래 4개 선의 기준점):
  · 매수활성화선 = 전일고가×(1+breakout_ratio/100), 기본 ×1.015.  ← 코드변수 activate_line
      💬 종목을 웹에 '켜는' 첫 관문. 이 선을 위로 뚫어야(연속캔들) 비로소 웹에 등장·판정 시작.
  · 상한밴드(관망유지 경계) = 기준가×(1+band_upper_ratio/100), 기본 ×1.02.  ← upper_band
  · 매도활성화선 = 기준가×(1−sell_breakout_ratio/100), 기본 ×0.985.  ← 코드변수 sell_line
      💬 매수활성화선의 하단 거울. 이 선 아래로 이탈(연속캔들)하면 손절조심을 '켜는' 선.
      ※ 매수활성화가 먼저 켜진 뒤에만 작동(단독으로 손절조심이 뜨지 않음).
  · 하한밴드(관심끊음 경계) = 기준가×(1−band_lower_ratio/100), 기본 ×0.98.  ← lower_band

표시기준:
  · 활성화 = '현재가 ≥ 매수활성화선'(기준가가 아니라 기준가×1.015)이 buy연속캔들(consecutive_candles)
             연속 → 최초 1회 돌파확정(당일 sticky). 활성화 전엔 후보(웹 미표시).
             단, 등락률(N열) < min_change_rate 이면 후보에서 제외.
  · 활성화 後 4구역(현재가 기준):
      현재가 >  상한밴드                → 🟡 관망유지(hold)   이미상승(추격주의)
      매도활성화선 ≤ 현재가 ≤ 상한밴드   → 🟢 매수적기(buy)
      현재가 <  매도활성화선(미확정)     → 🟢 매수적기 유지    sell연속캔들 못 채우면 깜빡임 방지로 유지
      하한밴드 ≤ 현재가 < 매도활성화선(확정) → 🔴 손절조심(sell)
      현재가 <  하한밴드(확정)           → ⚫ 관심끊음(cutoff)  너무하락 → 웹숨김 + J열 표기
  · ※ 활성화 카운트는 '매수활성화선(상단)' 기준, 손절조심·관심끊음 카운트는 '매도활성화선(하단)' 기준.

처리흐름:
  1. candle_minutes 마다 Excel 전체 종목 스캔 (sync_params_from_excel: J3~K7 감도→config)
  2. 매수기준가=전일고가(L) → M열 기입, 4개 선 산출
  3. 활성화 판정(매수활성화선 연속 N캔들) — tracker.json 에 카운트+활성화플래그 저장(일자별 리셋)
  4. 활성화 종목만 4구역 status 계산 → 엑셀 J열 자동기입 + Vercel API 배치 업로드
     (관심끊음·빈 슬롯은 stock_code="" 숨김마커로 전송 → 웹에서 제거)
  5. 매 주기 전송(현재가 실시간 갱신). buy_signals 중복은 DB 트리거가 방지(전환+10분 쿨다운).
  6. 15:30 장마감 시 F열(당일고가)→L열(전일고가) 1회 복사.

사용법:
  python starstock_uploader.py          # 자동 반복
  python starstock_uploader.py --once   # 1회 감지+업로드
  python starstock_uploader.py --reset  # tracker 초기화 후 시작
요구사항: pip install requests pywin32 / config.json 의 upload_token, band_upper_ratio 설정
"""
import json
import time
import datetime
import logging
import os
import sys
import signal
import argparse
import band_logic

logger = logging.getLogger("starstock")

try:
    import requests
except ImportError:
    print("[오류] requests 미설치: pip install requests")
    sys.exit(1)

try:
    import win32com.client
except ImportError:
    print("[오류] pywin32 미설치: pip install pywin32")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════
# 파일 구조 목차
# ──────────────────────────────────────────────────────────────
#  [상수]           STATUS_MAP(미사용·승인대기) / REVERSE_STATUS / CUTOFF_LABEL / _STATUS_KR
#  [헬퍼함수]       load_config / _disp_w / _pad / _safe_int
#  [진단헬퍼]       _admin_level / _admin_text / _diag_log / _diag_scan / _com_retry
#  [Excel COM]      _find_open_workbook(116줄) — COM 연결 탐색 3단계 로직
#  [클래스] BreakoutTracker  — 활성화 카운트·플래그 JSON 영속 관리
#  [클래스] ExcelConnection  — COM 연결·셀 읽기/쓰기 래퍼
#  [클래스] StarStockUploader — 메인 오케스트레이터
#    ├ __init__              : 설정 로드 + 파라미터 초기화
#    ├ _update_status_history: 종목 상태 변경 시각 추적 (CMD 출력용)
#    ├ _print_upload_result  : 박스 테이블 CMD 출력
#    ├ sync_params_from_excel: 매 주기 J3~K6 감도 → config.json 동기화
#    ├ [Step 1] _scan_activation    : 전체 스캔 + 활성화 판정 + M열 기입
#    ├ [Step 2] _calc_zone_status   : 4구역 status 판정 + J열 기입
#    ├ [Step 3] _build_hide_markers : 빈 슬롯 숨김 마커 + J열 잔상 초기화
#    ├ detect_and_update    : Step 1→2→3 오케스트레이터 (핵심 진입점)
#    ├ upload               : Vercel API 배치 전송 (재시도 3회)
#    ├ run_once             : 1회 감지+업로드
#    ├ run_auto             : 장중 자동 반복 루프 (09:00~15:30)
#    └ copy_high_to_prev_high: 15:30 장마감 F열→L열 복사
#  [진입점]         main()
# ══════════════════════════════════════════════════════════════

# ⚠️ [미사용·승인대기] 구 J열 수동 드롭다운 읽기용 상수. 현재 코드 어디에도 참조 없음.
# → 삭제 승인 시 이 줄 + 목차의 STATUS_MAP 항목 함께 제거.
# → 유지할 이유(예: 향후 복원 가능성)가 있으면 그 이유를 이 주석에 기재.
STATUS_MAP   = {"매수적기": "buy", "관망유지": "hold", "손절조심": "sell"}
REVERSE_STATUS = {"buy": "매수적기", "hold": "관망유지", "sell": "손절조심"}    # 밴드 자동판정 → J열 기입용
CUTOFF_LABEL = "관심끊음"   # 하한밴드 미만(너무 하락) → 웹숨김 + J열 표기

# CMD 박스 출력용 상태 한글 라벨 (cutoff 포함)
_STATUS_KR = {"buy": "매수적기", "hold": "관망유지", "sell": "손절조심", "cutoff": "관심끊음"}

def _disp_w(s: str) -> int:
    """한글/CJK = 2칸, ASCII = 1칸 기준 화면 표시 폭"""
    return sum(2 if ord(c) > 0x00FF else 1 for c in str(s))

def _pad(s: str, width: int) -> str:
    """표시 폭 기준 우측 공백 패딩"""
    return str(s) + " " * max(0, width - _disp_w(str(s)))


# ─────────────────────────────────────────────────────
# 설정 로드
# ─────────────────────────────────────────────────────
def load_config(path):
    if not os.path.exists(path):
        print(f"[오류] 설정 파일 없음: {path}")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    token = cfg.get("upload_token", "")
    if not token or "여기에" in token:
        print("[오류] config.json 의 upload_token 을 실제 값으로 변경하세요.")
        sys.exit(1)
    return cfg


# ─────────────────────────────────────────────────────
# 돌파 추적 (tracker.json)
# ─────────────────────────────────────────────────────
class BreakoutTracker:
    """
    종목별 연속 돌파 캔들 카운트 관리
    구조: {"stocks": {"005930": {"count": 1, "entry": 75000, "ts": "..."}, ...}}
    """

    def __init__(self, path):
        self.path = path
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"stocks": {}, "session_date": ""}

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def reset_all(self):
        self.data = {"stocks": {}, "session_date": str(datetime.date.today())}
        self.save()
        logger.info("[tracker] 전체 초기화 완료")

    def check_new_day(self):
        """날짜가 바뀌면 카운트 초기화 (장 시작 리셋)"""
        today = str(datetime.date.today())
        if self.data.get("session_date") != today:
            logger.info("[tracker] 새 거래일(%s) — 카운트 초기화", today)
            self.reset_all()

    def get_count(self, code):
        return self.data["stocks"].get(code, {}).get("count", 0)

    def increment(self, code, entry_price):
        """돌파 조건 충족: 카운트 +1"""
        stock = self.data["stocks"].setdefault(code, {})
        stock["count"] = stock.get("count", 0) + 1
        stock["entry"] = entry_price
        stock["ts"]    = datetime.datetime.now().strftime("%H:%M:%S")

    def reset_stock(self, code):
        """돌파 조건 미충족: 카운트 0으로 리셋"""
        if code in self.data["stocks"]:
            self.data["stocks"][code]["count"] = 0

    # ── 하락 연속 카운트(손절조심·관심끊음 확정용, sell_line 아래 연속 캔들) ──
    def increment_down(self, code):
        """sell선 아래: 하락 카운트 +1"""
        stock = self.data["stocks"].setdefault(code, {})
        stock["down"] = stock.get("down", 0) + 1

    def reset_down(self, code):
        """sell선 이상 회복: 하락 카운트 0"""
        if code in self.data["stocks"]:
            self.data["stocks"][code]["down"] = 0

    def get_down_count(self, code):
        return self.data["stocks"].get(code, {}).get("down", 0)

    def is_confirmed(self, code, required):
        return self.get_count(code) >= required

    def mark_activated(self, code):
        """활성화(당일 최초 돌파확정) 표식 — 이후 기준가 아래로 떨어져도 유지(손절조심 표시용)."""
        self.data["stocks"].setdefault(code, {})["activated"] = True

    def is_activated(self, code):
        return self.data["stocks"].get(code, {}).get("activated", False)


# ─────────────────────────────────────────────────────
# 실행 권한(무결성 레벨) 감지 — 엑셀과 권한 다르면 COM 연결(GetActiveObject) 실패
# ─────────────────────────────────────────────────────
def _admin_level():
    """True=관리자, False=일반, None=확인불가"""
    try:
        import ctypes
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return None


def _admin_text():
    lv = _admin_level()
    return "관리자" if lv else ("일반" if lv is not None else "확인불가")


# ─────────────────────────────────────────────────────
# 연결 진단 로깅 — 실패 원인(인스턴스 수/ROT등록/FullName/COM바쁨)을 파일에 남김
# ─────────────────────────────────────────────────────
_DIAG_LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploader_diag.log")


def _diag_log(msg):
    """진단 메시지를 uploader_diag.log 에 타임스탬프와 함께 append (실패해도 무시)."""
    try:
        line = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + "  " + msg
        with open(_DIAG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _diag_scan(abs_path, target_name):
    """실패 원인 진단용 스냅샷: 열린 Excel 인스턴스와 ROT 워크북 모니커를 로그로 남긴다.
    ★어떤 예외도 밖으로 던지지 않음(진단이 본 흐름을 깨면 안 됨)."""
    # (1) GetActiveObject 로 보이는 Excel 앱 + 그 안의 워크북들
    try:
        app = win32com.client.GetActiveObject("Excel.Application")
        try:
            cnt = app.Workbooks.Count
            names = []
            for wb in app.Workbooks:
                try:
                    names.append(str(wb.FullName))
                except Exception as e:
                    names.append("(FullName실패=%r)" % (e,))
            _diag_log("  [scan] GetActiveObject OK · Workbooks.Count=%d · %s" % (cnt, names))
        except Exception as e:
            _diag_log("  [scan] GetActiveObject OK 이나 Workbooks 접근 실패(엑셀 바쁨/모달?)=%r" % (e,))
    except Exception as e:
        _diag_log("  [scan] GetActiveObject 실패(엑셀 안보임/권한불일치?)=%r" % (e,))
    # (2) ROT 전체에서 엑셀 파일 모니커 열거 + 대상과 일치 여부
    try:
        import pythoncom
        ctx = pythoncom.CreateBindCtx(0)
        rot = pythoncom.GetRunningObjectTable()
        found = []
        for m in rot:
            try:
                name = m.GetDisplayName(ctx, None) or ""
            except Exception:
                continue
            low = name.lower()
            if low.endswith((".xlsm", ".xlsx", ".xls")):
                if low == abs_path.lower():
                    tag = "전체경로일치"
                elif os.path.basename(low) == target_name:
                    tag = "파일명만일치"
                else:
                    tag = "무관"
                found.append("%s [%s]" % (name, tag))
        _diag_log("  [scan] ROT 엑셀모니커: %s" % (found if found else "없음(마스터가 ROT에 미등록)"))
    except Exception as e:
        _diag_log("  [scan] ROT 열거 실패=%r" % (e,))


# COM '엑셀 바쁨' 오류코드 — 시작 팝업/DDE재계산/정렬 중 잠깐 호출을 거부한다.
#   0x80010001 RPC_E_CALL_REJECTED      = -2147418111  ('피호출자가 호출을 거부')
#   0x8001010A RPC_E_SERVERCALL_RETRYLATER = -2147417846
#   0x80010005 RPC_E_SERVERCALL_REJECTED   = -2147417851
_COM_BUSY = (-2147418111, -2147417846, -2147417851)


def _com_retry(fn, tries=40, delay=1.0, what=""):
    """COM 호출이 '엑셀 바쁨'(RPC_E_CALL_REJECTED/RETRYLATER)으로 거부되면 재시도한다.
    성공하면 그 반환값을, tries 안에 계속 바쁘면 마지막 예외를 그대로 raise.
    (권한/경로 등 '바쁨'이 아닌 오류는 즉시 raise → 오진단 방지)"""
    import pywintypes
    last = None
    for i in range(tries):
        try:
            return fn()
        except pywintypes.com_error as e:
            hr = e.args[0] if e.args else None
            if hr in _COM_BUSY:
                last = e
                if i == 0:
                    _diag_log("  [busy] %s → 엑셀 바쁨(팝업/DDE/정렬?) 재시도 시작" % what)
                time.sleep(delay)
                continue
            raise
    _diag_log("  [busy] %s → %d초 재시도에도 계속 바쁨, 포기" % (what, tries))
    if last is not None:
        raise last


# ─────────────────────────────────────────────────────
# Excel 연결
# ─────────────────────────────────────────────────────
def _find_open_workbook(abs_path, target_name):
    """실행 중인 모든 Excel 인스턴스를 훑어 대상 워크북을 FullName(전체경로) '정확 일치' 로 찾는다.

    3중 경로(서로 다른 실패모드 보완):
      (a) 버전 명시 ProgID(.16/.15/.14/.12) 다중 GetActiveObject → 살아있는 인스턴스 전부 수집
      (b) 수집 인스턴스들의 Workbooks 를 FullName 전체경로 정확 일치로 순회
      (c) 위가 빈 인스턴스만 잡으면, ROT 모니커를 경로로 매칭해 대상 워크북 1개만 직접 바인딩
    ★[2026-07-20] ROT 전체 무차별 바인딩이 관리자 엑셀서 조용히 실패 → GetActiveObject 경로로 전환.
    ★[2026-07-24] 엑셀 2010+2016 동시 실행 시 버전독립 ProgID 가 빈 인스턴스를 잡던 문제 →
      (a) 버전 ProgID 다중 프로브 + (c) ROT 경로매칭 직접바인딩 추가로 보강.
    반환: 찾으면 Workbook COM 객체, 못 찾으면 None.
    """
    want  = abs_path.lower()
    apps  = []
    seen  = set()   # 같은 인스턴스 중복 순회 방지(COM 객체 id 기준)

    def _add(app):
        if app is None:
            return
        try:
            if id(app) not in seen:
                seen.add(id(app))
                apps.append(app)
        except Exception:
            pass

    # (a) 버전 명시 ProgID 를 모두 시도해 '살아있는 인스턴스'를 전부 수집.
    #     ★[2026-07-24 수정] 엑셀 2010(v14)+2016(v16) 동시 실행 시, 버전 독립 ProgID
    #       "Excel.Application" 은 2010 쪽 빈 인스턴스로 해석돼 마스터를 든 2016 인스턴스를
    #       놓쳤다(진단로그: GetActiveObject Workbooks.Count=0 인데 ROT 엔 마스터 등록됨).
    #       → 버전 CLSID 를 직접 가리키는 .16/.15/.14/.12 까지 프로브해 2016 인스턴스를 확보.
    for progid in ("Excel.Application",       # 버전 독립(기존 경로 흡수)
                   "Excel.Application.16",     # 2016/2019/365
                   "Excel.Application.15",     # 2013
                   "Excel.Application.14",     # 2010
                   "Excel.Application.12"):    # 2007
        try:
            app = win32com.client.GetActiveObject(progid)
            before = len(apps)
            _add(app)
            # ★[진단] 이 ProgID 가 어떤 인스턴스를 잡았는지 + 워크북 개수/목록 기록
            try:
                names = [str(w.FullName) for w in app.Workbooks]
                _diag_log("  [find_wb](a) %s → 인스턴스 획득(신규=%s) · Workbooks=%d · %s"
                          % (progid, before != len(apps), len(names), names))
            except Exception as e:
                _diag_log("  [find_wb](a) %s → 인스턴스는 잡았으나 Workbooks 접근 실패=%r" % (progid, e))
        except Exception as e:
            _diag_log("  [find_wb](a) %s → GetActiveObject 실패=%r" % (progid, e))
            continue

    # (b) 수집한 인스턴스들의 Workbooks 를 훑어 FullName 전체경로 정확 일치로만 연결
    #     (파일명만 같은 1번파일 등은 자동 배제. FullName 은 canonical 이라 경로표기 차이에 강함)
    for app in apps:
        try:
            for wb in app.Workbooks:
                try:
                    if str(wb.FullName).lower() == want:
                        _diag_log("  [find_wb](b) 성공: 수집 인스턴스 Workbooks 순회에서 마스터 발견")
                        return wb
                except Exception:
                    continue
        except Exception:
            continue
    _diag_log("  [find_wb](b) 수집 인스턴스(%d개) Workbooks 순회로는 마스터 못 찾음 → (c) ROT 직접바인딩 시도" % len(apps))

    # (c) ROT 모니커를 '표시이름(경로)'으로 먼저 매칭 → 일치하는 워크북 1개만 직접 바인딩.
    #     ★진단 스캔(_diag_scan)에서 항상 성공하는 경로. (a)/(b) 가 엉뚱한 빈 인스턴스만
    #       잡았을 때의 최종 구조선. 폐기했던 'ROT 전체 무차별 바인딩'과 달리 대상 1개만
    #       바인딩하므로 관리자 엑셀 조용실패/행(hang) 위험을 최소화한다.
    import pywintypes
    try:
        import pythoncom
        ctx = pythoncom.CreateBindCtx(0)
        rot = pythoncom.GetRunningObjectTable()
        matched = 0
        for moniker in rot:
            try:
                name = moniker.GetDisplayName(ctx, None) or ""
            except Exception:
                continue
            if name.lower() != want:          # 전체경로 정확 일치만 바인딩
                continue
            matched += 1
            try:
                # ★[2026-07-24 수정] rot.GetObject() 는 PyIUnknown 을 돌려주는데, 이를 곧바로
                #   win32com.client.Dispatch() 로 감싸면 GetTypeInfo AttributeError 가 났다.
                #   (이게 과거 '관리자 엑셀 조용실패'의 실제 정체 — IL 문제가 아니었음)
                #   → IUnknown 을 IDispatch 로 QueryInterface 한 뒤 Dispatch 로 감싸야 한다.
                unk   = rot.GetObject(moniker)
                idisp = unk.QueryInterface(pythoncom.IID_IDispatch)
                wb    = win32com.client.Dispatch(idisp)
                if str(wb.FullName).lower() == want:   # 바인딩된 객체가 워크북인지 확인
                    _diag_log("  [find_wb](c) 성공: ROT 직접바인딩으로 마스터 연결")
                    return wb
            except pywintypes.com_error as e:
                # ★[진단] 바인딩 실패의 '진짜 원인' HRESULT 기록
                hr = e.args[0] if e.args else None
                hint = ""
                if hr == -2147024891:   # 0x80070005 E_ACCESSDENIED
                    hint = " ← ACCESS_DENIED(IL/권한 차단 유력)"
                elif hr == -2147221021: # 0x800401E3 MK_E_UNAVAILABLE
                    hint = " ← MK_E_UNAVAILABLE(모니커 무효/인스턴스 종료)"
                elif hr in _COM_BUSY:
                    hint = " ← 서버 바쁨(RETRYLATER)"
                _diag_log("  [find_wb](c) ROT GetObject 바인딩 실패 · HRESULT=%s(%#010x)%s · %r"
                          % (hr, (hr & 0xffffffff) if hr else 0, hint, e))
            except Exception as e:
                _diag_log("  [find_wb](c) ROT GetObject 바인딩 실패(비 com_error)=%r" % (e,))
        if matched == 0:
            _diag_log("  [find_wb](c) ROT 에 마스터 경로와 정확일치하는 모니커가 없음")
    except Exception as e:
        _diag_log("  [find_wb](c) ROT 열거 자체 실패=%r" % (e,))

    _diag_log("  [find_wb] 최종: 모든 경로 실패 → None 반환")
    return None


class ExcelConnection:

    def __init__(self, cfg):
        self.cfg   = cfg
        self.excel = None
        self.wb    = None
        self.ws    = None

    def connect(self):
        abs_path    = os.path.abspath(self.cfg["excel_file"])
        target_name = os.path.basename(abs_path).lower()   # 파일명(경로 표기 차이 무시)
        sheet       = self.cfg["sheet_name"]

        print(f"[권한] 파이썬 실행 권한 = {_admin_text()}  (엑셀·HTS와 같은 권한이어야 연결됨)")
        _diag_log("[connect] ===== 시작 · 파이썬권한=%s · 대상=%s · 시트=%s =====" % (_admin_text(), abs_path, sheet))

        # 1) 이미 열려있는 Excel(들)에서 대상 워크북 찾기
        #    ★인스턴스가 여러 개(/x 로 마스터 분리 실행)일 수 있어 GetActiveObject 하나에 의존하지
        #      않고 ROT 전체를 훑는다. FullName(전체경로) 정확 일치로만 연결 → 1번파일 오연결 방지.
        #    DDE 링크/자동화 충돌로 COM 이 잠깐 busy(RETRYLATER)일 수 있어 최대 15회 재시도.
        excel_running = False
        for attempt in range(15):
            if attempt == 0:
                _diag_log("[connect] 1차 상태 스냅샷:")
                _diag_scan(abs_path, target_name)
            try:
                wb = _find_open_workbook(abs_path, target_name)
            except Exception:
                wb = None
            if wb is not None:
                self.wb    = wb
                # 시작 팝업/DDE/정렬로 엑셀이 바쁘면 Sheets 접근이 거부(RPC_E_CALL_REJECTED)될 수
                # 있으므로 '바쁨' 오류에 한해 자동 재시도한다.
                def _bind(_wb=wb, _sheet=sheet):
                    self.excel = _wb.Application
                    self.ws    = _wb.Sheets(_sheet)
                _com_retry(_bind, what="워크북 시트 바인딩")
                _diag_log("[connect] 성공: 열린 파일 연결(시도 %d/15)" % (attempt + 1))
                print("[Excel] 열려있는 파일에 연결됨(전체경로 정확 일치)")
                return True
            # 대상 워크북은 못 찾았지만 Excel 자체는 떠 있는지 확인(신규 인스턴스 남발 방지용)
            try:
                win32com.client.GetActiveObject("Excel.Application")
                excel_running = True
            except Exception:
                if attempt == 0:
                    print("[Excel] 연결 대기 중(엑셀 사용 중)...")
            time.sleep(1)

        # 2) 실행 중 Excel 은 있으나 대상 파일 못 찾음/계속 busy → 2차 인스턴스 금지(파일 충돌 방지)
        if excel_running:
            _diag_log("[connect] 실패(branch2): 엑셀 앱은 보이나 마스터 워크북 연결 실패 — 최종 스냅샷:")
            _diag_scan(abs_path, target_name)
            _diag_log("[connect] ===== 실패 종료 =====")
            print("[오류] 열린 엑셀에 연결하지 못했습니다(파일 미열림 또는 계속 사용 중).")
            print("       → 대상 파일을 연 상태에서 잠시 후 다시 실행하세요.")
            print(f"       ※ 파이썬 권한={_admin_text()}. 엑셀을 '같은 권한'으로 여세요")
            print("          (엑셀이 관리자면 업로더도 관리자로, 일반이면 둘 다 일반).")
            print(f"       📄 진단로그 기록됨 → {_DIAG_LOG_PATH}")
            return False

        # 3) Excel 미실행 → 새로 열기 (standalone 용)
        _diag_log("[connect] 실행 중 엑셀을 하나도 못 봄(GetActiveObject 15회 실패) "
                  "→ 권한불일치(엑셀만 관리자?) 또는 엑셀 미실행 의심 · 새 인스턴스 열기 시도")
        _diag_scan(abs_path, target_name)
        try:
            xl = win32com.client.Dispatch("Excel.Application")
            try:
                xl.Visible = True
            except Exception:
                pass
            try:
                xl.DisplayAlerts = False
            except Exception:
                pass
            wb = xl.Workbooks.Open(abs_path)
            self.excel = xl
            self.wb    = wb
            self.ws    = _com_retry(lambda: wb.Sheets(sheet), what="새인스턴스 시트 바인딩")
            _diag_log("[connect] 새 인스턴스로 파일 열기 성공(standalone)")
            print(f"[Excel] 파일 열기: {self.cfg['excel_file']}")
            return True
        except Exception as e:
            _diag_log("[connect] 실패(branch3): 새 인스턴스 열기도 실패=%r" % (e,))
            print(f"[오류] Excel 연결 실패: {e}")
            return False

    def cell_val(self, row, col):
        try:
            return self.ws.Cells(row, col).Value
        except Exception:
            return None

    def set_cell(self, row, col, value):
        try:
            self.ws.Cells(row, col).Value = value
        except Exception as e:
            _diag_log(f"[set_cell] 실패 row={row} col={col} value={value!r}: {e}")
            logger.warning("⚠️  엑셀 셀 쓰기 실패 (행%d 열%d ← '%s') — 엑셀이 DDE 계산 중이라 잠깐 거부함, 다음 주기에 자동 재시도됩니다", row, col, value)

    def set_status(self, text):
        try:
            now = datetime.datetime.now().strftime("%H:%M:%S")
            self.ws.Range(self.cfg["status_cell"]).Value  = text
            self.ws.Range(self.cfg["timestamp_cell"]).Value = now
        except Exception:
            pass

    def get_interval_minutes(self):
        try:
            val = str(self.ws.Range(self.cfg["interval_cell"]).Value or "3분")
            return {"1분": 1, "3분": 3, "5분": 5, "10분": 10, "30분": 30}.get(val, 3)
        except Exception:
            return 3


# ─────────────────────────────────────────────────────
# 업로더 메인
# ─────────────────────────────────────────────────────
class StarStockUploader:
    # 엑셀 열 인덱스 상수 (양식 변경 시 이곳만 수정)
    COL_CODE        = 2   # B: 종목코드
    COL_NAME        = 3   # C: 종목명
    COL_CURRENT     = 4   # D: 현재가 (DDE 실시간)
    COL_OPEN        = 5   # E: 시가
    COL_HIGH        = 6   # F: 고가 (당일)
    COL_LOW         = 7   # G: 저가
    COL_TARGET      = 8   # H: 목표가
    COL_STOP        = 9   # I: 손절가
    COL_STATUS_LBL  = 10  # J: 추천상태 표시 (자동기입)
    COL_MEMO        = 11  # K: 메모
    COL_PREV_HIGH   = 12  # L: 전일고가 (매수기준가 원본)
    COL_ENTRY       = 13  # M: 매수기준가 (Python 계산값 기입)
    COL_CHANGE_RATE = 14  # N: 등락률 (%)

    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        self.cfg     = load_config(config_path)
        self.xl      = ExcelConnection(self.cfg)
        self.ep_cfg  = self.cfg.get("entry_price", {})
        self.ratio       = self.ep_cfg.get("breakout_ratio", 1.5) / 100       # buy돌파%: 매수활성화선=전일고가×(1+ratio)
        self.upper_ratio = self.ep_cfg.get("band_upper_ratio", 2.0) / 100     # 상한밴드%: 관망유지 경계(+)
        self.lower_ratio = self.ep_cfg.get("band_lower_ratio", 2.0) / 100     # 하한밴드%: 관심끊음 경계(−)
        self.sell_ratio  = self.ep_cfg.get("sell_breakout_ratio", 1.5) / 100  # sell돌파%: 손절조심선=전일고가×(1−sell_ratio)
        self.req_cnt  = self.ep_cfg.get("consecutive_candles", 2)             # buy연속캔들
        self.sell_cnt = self.ep_cfg.get("sell_consecutive_candles", 2)        # sell연속캔들(손절조심·관심끊음 확정)
        self.min_chg = self.ep_cfg.get("min_change_rate", 0) or 0
        self.send_all = False   # P4="전체" 면 매주기 top-10 전부 재전송(웹 순위 일관성)
        tracker_file = self.ep_cfg.get("tracker_file", "starstock-tracker.json")
        self.tracker = BreakoutTracker(tracker_file)
        self.running = False
        self.status_history: dict = {}  # {stock_code: (status, "HH:MM:SS")} — 상태 변경 시각 추적

    # ── 상태 변경 시각 추적 ─────────────────────────────────
    def _update_status_history(self, stocks: list) -> dict:
        """종목별 status 변화 감지 → 변경 시각(KST) 기록.
        반환: {stock_code: "신규"/"변경"/"유지"} — 이번 주기 분류"""
        now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%H:%M:%S")
        notes = {}
        for s in stocks:
            code   = s.get("stock_code", "")
            status = s.get("status", "")
            if not code:
                continue
            prev = self.status_history.get(code)
            if prev is None:
                self.status_history[code] = (status, now_kst)
                notes[code] = "신규"
            elif prev[0] != status:
                self.status_history[code] = (status, now_kst)
                notes[code] = "변경"
            else:
                notes[code] = "유지"
        return notes

    # ── CMD 박스 테이블 출력 ──────────────────────────────
    def _print_upload_result(self, visible: list, hidden: list, notes: dict,
                              mins=None, kst_now: str = ""):
        """업로드 성공 시 박스 테이블 스타일로 종목 목록 출력"""
        # 컬럼 표시 폭 (display columns): 순위, 종목명, 현재가, 상태, 변경시각, 구분
        cw = [4, 14, 10, 8, 10, 6]

        def row(*cells):
            parts = [f" {_pad(c, w)} " for c, w in zip(cells, cw)]
            return "║" + "║".join(parts) + "║"

        def sep(l_ch, m_ch, r_ch):
            return l_ch + m_ch.join("═" * (w + 2) for w in cw) + r_ch

        if not kst_now:
            kst_now = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%H:%M:%S")

        print(f"\n[{kst_now}] ─── 업로드 완료 ───")
        print(sep("╔", "╦", "╗"))
        print(row("순위", "종목명", "현재가", "상태", "변경시각", "구분"))
        print(sep("╠", "╬", "╣"))

        for s in visible:
            code     = s["stock_code"]
            rank_s   = f"{s['rank']:02d}"
            name_s   = s["stock_name"]
            price_s  = f"{s['current_price']:,}원"
            status_s = _STATUS_KR.get(s.get("status", ""), s.get("status", "-"))
            hist     = self.status_history.get(code)
            note_s   = notes.get(code, "유지")
            changed_s = (hist[1] if hist else kst_now) + ("★" if note_s != "유지" else "")
            print(row(rank_s, name_s, price_s, status_s, changed_s, note_s))

        print(sep("╚", "╩", "╝"))

        # 요약 Footer
        next_s = ""
        if mins:
            next_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=9, minutes=mins)
            next_s = f"  |  다음 실행 {next_dt.strftime('%H:%M:%S')}"
        print(f"  표시 {len(visible)}  숨김 {len(hidden)}{next_s}")

    # ── 엑셀 J3~K6(변수명/값) → config.json 동기화 + 파라미터 갱신 ──
    #    (시뮬 replay_3min.py 도 config.json 을 읽으므로 실제·시뮬 판정 공통)
    #    비거나 오류인 셀은 기존값 유지(안전 폴백).
    def sync_params_from_excel(self):
        def num(row):
            try:
                v = self.xl.cell_val(row, 11)   # K열
                return float(v) if v not in (None, "") else None
            except Exception:
                return None
        ep = self.cfg.setdefault("entry_price", {})
        changed = False
        # J3~K7: buy돌파%·buy연속·캔들분·sell돌파%·sell연속 (상/하한밴드%·최소등락률%는 json 전용)
        m = {"breakout_ratio": num(3), "consecutive_candles": num(4),
             "candle_minutes": num(5), "sell_breakout_ratio": num(6),
             "sell_consecutive_candles": num(7)}
        for k, v in m.items():
            if v is None:
                continue
            v = int(v) if k in ("consecutive_candles", "candle_minutes", "sell_consecutive_candles") else v
            if ep.get(k) != v:
                ep[k] = v
                changed = True
        if changed:
            try:
                with open(self.config_path, "w", encoding="utf-8") as f:
                    json.dump(self.cfg, f, ensure_ascii=False, indent=2)
                logger.info("[동기화] 엑셀 J3~K7 → config.json 반영: %s", m)
            except Exception as e:
                logger.error("[동기화] config.json 쓰기 실패: %s", e)
        # 파라미터 재적용(실제·시뮬 공통 기준). 상/하한밴드%·최소등락률%는 json 값 그대로.
        self.ratio       = ep.get("breakout_ratio", 1.5) / 100
        self.upper_ratio = ep.get("band_upper_ratio", 2.0) / 100
        self.lower_ratio = ep.get("band_lower_ratio", 2.0) / 100
        self.sell_ratio  = ep.get("sell_breakout_ratio", 1.5) / 100
        self.req_cnt  = ep.get("consecutive_candles", 2)
        self.sell_cnt = ep.get("sell_consecutive_candles", 2)
        self.min_chg  = ep.get("min_change_rate", 0) or 0
        # P4(col16): 전송모드 "전체"=top-10 전부 재전송 / 그 외=확정만
        try:
            self.send_all = (str(self.xl.cell_val(4, 16) or "").strip() == "전체")
        except Exception:
            pass

    # ── [Step 1] 전체 스캔 + 활성화 판정 ─────────────
    def _scan_activation(self, start: int, end: int) -> list:
        """
        엑셀 전체 종목 스캔:
          · COL_ENTRY(M열) 매수기준가 기입
          · 매수활성화선(기준가×(1+buy돌파%)) N캔들 연속 돌파 시 활성화 확정
          · 등락률(COL_CHANGE_RATE) < min_change_rate 이면 후보 제외
        반환: 활성화된 종목의 데이터 dict 리스트 (Step 2 입력용)
        """
        C = self.__class__   # 컬럼 상수 단축 참조
        activated = []
        for row in range(start, end + 1):
            code = str(self.xl.cell_val(row, C.COL_CODE) or "").strip()
            if len(code) != 6 or not code.isdigit():
                continue

            name      = str(self.xl.cell_val(row, C.COL_NAME) or "").strip()
            tag       = f"[{code} {name}]" if name else f"[{code}]"
            current   = _safe_int(self.xl.cell_val(row, C.COL_CURRENT))
            prev_high = _safe_int(self.xl.cell_val(row, C.COL_PREV_HIGH))

            if current <= 0:
                self.tracker.reset_stock(code)
                continue

            # 4개 경계선 산출 (기준: 전일고가)
            entry_price   = int(prev_high) if prev_high > 0 else int(current)
            activate_line = int(entry_price * (1 + self.ratio))
            upper_band    = int(entry_price * (1 + self.upper_ratio))
            sell_line     = int(entry_price * (1 - self.sell_ratio))
            lower_band    = int(entry_price * (1 - self.lower_ratio))
            self.xl.set_cell(row, C.COL_ENTRY, entry_price)   # M열: 매수기준가

            if not self.tracker.is_activated(code):
                # 1차 필터: 등락률 미달 → 후보 제외
                if self.min_chg > 0:
                    try:
                        chg = float(self.xl.cell_val(row, C.COL_CHANGE_RATE))
                        if chg < self.min_chg:
                            self.tracker.reset_stock(code)
                            continue
                    except (TypeError, ValueError):
                        pass
                # 연속 카운트: 매수활성화선 돌파 여부
                if current >= activate_line:
                    self.tracker.increment(code, entry_price)
                    cnt = self.tracker.get_count(code)
                    if cnt >= self.req_cnt:
                        self.tracker.mark_activated(code)
                        logger.info("%s ★활성화(돌파확정) %d/%d캔들 (현재가=%s / 매수활성화선=%s)",
                                    tag, cnt, self.req_cnt, f"{current:,}", f"{activate_line:,}")
                    else:
                        logger.info("%s 돌파 감지 %d/%d캔들 (현재가=%s / 매수활성화선=%s)",
                                    tag, cnt, self.req_cnt, f"{current:,}", f"{activate_line:,}")
                else:
                    if self.tracker.get_count(code) > 0:
                        logger.info("%s 조건 미달 → 카운트 리셋 (현재가=%s / 매수활성화선=%s)",
                                    tag, f"{current:,}", f"{activate_line:,}")
                    self.tracker.reset_stock(code)

            if not self.tracker.is_activated(code):
                continue   # 미활성 → 전송 제외

            # 동일 종목코드 중복 행 방어 (엑셀에 같은 코드가 여러 행에 입력된 경우)
            if any(a["code"] == code for a in activated):
                logger.warning("⚠️  [%s %s] 엑셀에 같은 종목코드가 중복 입력됨 → 이번 전송 건너뜀 (엑셀 %d행 확인 필요)", code, name, row)
                continue

            # 활성화 확정 → Step 2(4구역 판정)에 넘길 데이터 수집
            activated.append({
                "row":          row,
                "rank":         row - start + 1,
                "code":         code,
                "name":         name,
                "tag":          tag,
                "current":      current,
                "entry_price":  entry_price,
                "upper_band":   upper_band,
                "sell_line":    sell_line,
                "lower_band":   lower_band,
                "open_price":   _safe_int(self.xl.cell_val(row, C.COL_OPEN)),
                "high_price":   _safe_int(self.xl.cell_val(row, C.COL_HIGH)),
                "low_price":    _safe_int(self.xl.cell_val(row, C.COL_LOW)),
                "target_price": _safe_int(self.xl.cell_val(row, C.COL_TARGET)),
                "stop_price":   _safe_int(self.xl.cell_val(row, C.COL_STOP)),
                "memo":         str(self.xl.cell_val(row, C.COL_MEMO) or ""),
            })
        return activated

    # ── [Step 2] 4구역 status 판정 (순수 계산, Excel IO 없음) ──
    def _calc_zone_status(self, activated: list) -> tuple:
        """
        활성화된 종목만 4구역 status 판정. Excel 쓰기는 하지 않음.
          hold(관망유지) / buy(매수적기) / sell(손절조심) / cutoff(관심끊음→웹숨김)
        손절조심·관심끊음은 sell연속캔들 확정돼야 적용 (깜빡임 방지).
        반환: (confirmed_stocks, cutoff_ranks, j_writes)
          j_writes: {row: label} — _flush_j_column 에서 일괄 기입
        """
        confirmed_stocks = []
        cutoff_ranks = set()
        j_writes: dict = {}   # {엑셀행: J열에 기입할 문자열}

        for item in activated:
            row        = item["row"]
            code       = item["code"]
            rank       = item["rank"]
            tag        = item["tag"]
            current    = item["current"]
            upper_band = item["upper_band"]
            sell_line  = item["sell_line"]
            lower_band = item["lower_band"]

            # rank 1~10 만 전송 (API 슬롯 한도)
            if not (1 <= rank <= 10):
                logger.warning("%s rank %d > 10 슬롯초과 → 전송 제외", tag, rank)
                continue

            # 손절조심·관심끊음 카운트 (매도활성화선 기준 연속 캔들)
            if current < sell_line:
                self.tracker.increment_down(code)
            else:
                self.tracker.reset_down(code)
            down = self.tracker.get_down_count(code)

            # 4구역 판정 (band_logic 공통 모듈)
            status = band_logic.determine_status(
                current, upper_band, sell_line, lower_band, down, self.sell_cnt
            )

            if status == "cutoff":
                j_writes[row] = CUTOFF_LABEL
                cutoff_ranks.add(rank)
                logger.info("%s %s → 웹숨김 (현재가=%s < 하한밴드 %s)",
                            tag, CUTOFF_LABEL, f"{current:,}", f"{lower_band:,}")
                continue

            j_writes[row] = REVERSE_STATUS[status]
            logger.info("%s %s (현재가=%s / 매수적기 %s~%s)",
                        tag, REVERSE_STATUS[status], f"{current:,}",
                        f"{sell_line:,}", f"{upper_band:,}")
            confirmed_stocks.append({
                "rank":            rank,
                "stock_code":      code,
                "stock_name":      item["name"],
                "current_price":   current,
                "open_price":      item["open_price"],
                "high_price":      item["high_price"],
                "low_price":       item["low_price"],
                "target_price":    item["target_price"],
                "stop_price":      item["stop_price"],
                "entry_price":     item["entry_price"],
                "entry_confirmed": True,
                "status":          status,
                "memo":            item["memo"],
            })

        return confirmed_stocks, cutoff_ranks, j_writes

    # ── [Step 3] 빈 슬롯 숨김 마커 생성 ──────────────
    def _build_hide_markers(self, start: int, confirmed_stocks: list,
                             cutoff_ranks: set, j_writes: dict) -> tuple:
        """
        rank 1~10 중 확정 종목이 없는 슬롯 → stock_code="" 숨김 마커 생성.
          · cutoff 확정 → 숨김 마커 (J열 '관심끊음' 유지)
          · 유효 코드지만 미확정(돌파 로직 관리) → 건드리지 않음 (깜빡임 방지)
          · 무효/빈 코드 슬롯 → 숨김 마커 + J열 잔상 초기화(j_writes에 "" 추가)
        반환: (hide_markers, j_writes) — j_writes는 _flush_j_column 에서 처리
        """
        C = self.__class__
        confirmed_ranks = {s["rank"] for s in confirmed_stocks}
        hide_markers = []
        cleared_j = 0

        for rank in range(1, 11):
            if rank in confirmed_ranks:
                continue
            row = start + rank - 1
            if rank in cutoff_ranks:
                hide_markers.append({"rank": rank, "stock_code": ""})
                continue
            # 비활성 행 J열 잔상 초기화 예약
            if str(self.xl.cell_val(row, C.COL_STATUS_LBL) or "").strip():
                j_writes[row] = ""
                cleared_j += 1
            code = str(self.xl.cell_val(row, C.COL_CODE) or "").strip()
            if len(code) != 6 or not code.isdigit():
                hide_markers.append({"rank": rank, "stock_code": ""})

        if cleared_j:
            logger.debug("[J초기화] 비활성 %d개 행 추천상태 빈칸 처리", cleared_j)
        if hide_markers:
            ranks_txt = ", ".join(str(m["rank"]) for m in hide_markers)
            logger.info("[숨김] 빈 슬롯 %d개 → 웹에서 제거 (rank: %s)", len(hide_markers), ranks_txt)

        return hide_markers, j_writes

    # ── [Step 4] J열 일괄 기입 ────────────────────────
    def _flush_j_column(self, j_writes: dict) -> None:
        """
        Step 2·3 에서 수집한 J열 쓰기 요청을 한 번에 처리.
        Excel COM 호출을 계산 완료 후 일괄 수행 → 오류 발생 지점 명확화.
        """
        C = self.__class__
        for row, label in j_writes.items():
            self.xl.set_cell(row, C.COL_STATUS_LBL, label)

    # ── 핵심 오케스트레이터: Step 1→2→3→4 순서 호출 ────
    def detect_and_update(self) -> list:
        """
        돌파 감지 + 웹 전송 페이로드 조립.
          Step 1 _scan_activation   : M열 기입 + 활성화 판정
          Step 2 _calc_zone_status  : 4구역 판정 (순수 계산, IO 없음)
          Step 3 _build_hide_markers: 빈 슬롯 숨김 마커 + J열 초기화 예약
          Step 4 _flush_j_column    : J열 일괄 기입 (Excel IO 집중)
        반환: confirmed_stocks + hide_markers (upload() 입력)
        """
        self.sync_params_from_excel()
        start = self.cfg["data_start_row"]
        end   = self.cfg["data_end_row"]

        activated                         = self._scan_activation(start, end)
        confirmed, cutoff_ranks, j_writes = self._calc_zone_status(activated)
        self.tracker.save()
        hide_markers, j_writes            = self._build_hide_markers(start, confirmed, cutoff_ranks, j_writes)
        self._flush_j_column(j_writes)

        return confirmed + hide_markers

    # ── API 전송 ─────────────────────────────────────
    def upload(self, stocks, notes: dict = None, mins=None):
        if not stocks:
            return False
        if notes is None:
            notes = {}

        utc_now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {"timestamp": utc_now, "stocks": stocks}
        headers = {
            "Content-Type":  "application/json",
            "X-Upload-Token": self.cfg["upload_token"],
        }

        for attempt in range(1, 4):
            try:
                resp = requests.post(
                    self.cfg["api_url"],
                    json=payload,
                    headers=headers,
                    timeout=10,
                    allow_redirects=False,   # 리다이렉트 자동추적 금지 → 도메인 설정 문제를 직접 감지
                )
                # ── 3xx = 앱 코드 문제 아님. 도메인(Vercel/Hostinger) 리다이렉트 설정 문제 ──
                if 300 <= resp.status_code < 400:
                    location = resp.headers.get("Location", "(Location 헤더 없음)")
                    server   = resp.headers.get("Server", "?")
                    vercel   = resp.headers.get("X-Vercel-Id", "")
                    self.xl.set_status(f"[도메인리다이렉트{resp.status_code}]")
                    logger.error("[도메인리다이렉트%d] 요청=%s → %s (서버:%s)",
                                 resp.status_code, self.cfg['api_url'], location, server)
                    print(f"       ├ 원 인  : Vercel/Hostinger 도메인 설정에 리다이렉트가 걸려 있음")
                    print(f"       └ 해 결  : Vercel > Settings > Domains 에서 '{location}' 리다이렉트 제거")
                    return False   # 재시도해도 동일 → 즉시 중단
                if resp.status_code == 200:
                    # 표시 종목(코드 있음) / 숨김 마커(코드 빈문자열) 분리
                    visible = [s for s in stocks if s.get("stock_code")]
                    hidden  = [s for s in stocks if not s.get("stock_code")]
                    msg = f"[업로드완료] 표시 {len(visible)} / 숨김 {len(hidden)}"
                    self.xl.set_status(msg)
                    kst_now = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%H:%M:%S")
                    self._print_upload_result(visible, hidden, notes, mins=mins, kst_now=kst_now)
                    tr = resp.json().get("tracked", {})
                    _diag_log(f"[tracked] updated={tr.get('updated',0)} finalized={tr.get('finalized',0)} promoted={tr.get('promoted',0)}")
                    return True
                elif resp.status_code == 401:
                    self.xl.set_status("[토큰오류]")
                    logger.error("인증 실패(401) — upload_token 확인")
                    return False
                elif resp.status_code == 408:
                    self.xl.set_status("[시각오류]")
                    logger.error("타임스탬프 오류(408) — PC 시각 동기화 필요")
                    return False
                else:
                    self.xl.set_status(f"[서버오류{resp.status_code}]")
                    try:
                        body = resp.json()
                        detail = body.get("detail") or body.get("error") or str(body)
                    except Exception:
                        detail = resp.text[:200] if resp.text else "(응답 없음)"
                    logger.warning("서버 %d (시도%d/3) — 원인: %s", resp.status_code, attempt, detail)

            except requests.exceptions.ConnectionError:
                self.xl.set_status("[연결오류]")
                logger.warning("네트워크 연결 실패 (시도%d/3)", attempt)
            except requests.exceptions.Timeout:
                self.xl.set_status("[타임아웃]")
                logger.warning("타임아웃 (시도%d/3)", attempt)
            except Exception as e:
                self.xl.set_status("[오류]")
                logger.error("%s (시도%d/3)", e, attempt)

            if attempt < 3:
                time.sleep(5)

        return False

    # ── 1회 실행 ─────────────────────────────────────
    def run_once(self):
        if not self.xl.connect():
            return
        self.tracker.check_new_day()
        now = datetime.datetime.now().strftime("%H:%M:%S")
        logger.info("돌파 감지 실행...")
        confirmed = self.detect_and_update()

        if confirmed:
            notes = self._update_status_history(confirmed)
            self.upload(confirmed, notes=notes)
        else:
            self.xl.set_status("[감시중-돌파없음]")
            logger.info("돌파 확정 종목 없음 (기준: %d캔들 연속)", self.req_cnt)

    # ── 자동 반복 ─────────────────────────────────────
    def run_auto(self):
        self.running = True
        self._close_done_date = None  # 당일 장마감 복사 완료 날짜
        MARKET_OPEN  = datetime.time(9, 0)    # [2026-07-24] 업로드 시작 게이트(개장)
        MARKET_CLOSE = datetime.time(15, 30)  # 업로드 종료 게이트(장마감)

        # VBA 체크박스 OFF 시 생성되는 중지 신호 파일 (taskkill 대신 안전 종료)
        stop_flag = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "stop.flag")
        if os.path.exists(stop_flag):   # 시작 시 잔존 flag 제거
            try:
                os.remove(stop_flag)
            except OSError:
                pass

        print("[자동전송] 시작. 종료: Ctrl+C")
        print(f"  판정: 활성화=현재가≥매수활성화선(기준가×{1 + self.ratio:.3f}) {self.req_cnt}캔들 연속 → 4구역")
        print(f"        (관심끊음<기준가×{1 - self.lower_ratio:.3f}≤손절조심<매도활성화선(기준가×{1 - self.sell_ratio:.3f})"
              f"≤매수적기≤상한(기준가×{1 + self.upper_ratio:.3f})<관망유지)")
        print(f"  장마감 처리: 15:30 F열→L열 자동 복사")
        _om, _cm = MARKET_OPEN.strftime("%H:%M"), MARKET_CLOSE.strftime("%H:%M")
        print("  " + "=" * 52)
        print(f"  [업로드 시간 안내] {_om} 개장 ~ {_cm} 마감 사이에만 업로드")
        print(f"     - {_om} 이전 : 엑셀 연결·DDE 예열만 하고 업로드 대기")
        print(f"     - {_cm} 이후 : F->L 복사 후 업로드 종료")
        _nowt = datetime.datetime.now().time()
        if _nowt < MARKET_OPEN:
            print(f"     >> 지금은 개장 전 → {_om}이 되면 자동으로 업로드가 시작됩니다")
        elif _nowt >= MARKET_CLOSE:
            print(f"     >> 지금은 장마감 후 → 오늘 업로드는 종료 상태입니다")
        else:
            print(f"     >> 지금은 장중 → 바로 업로드를 시작합니다")
        print("  " + "=" * 52)

        if not self.xl.connect():
            return

        while self.running:
            if os.path.exists(stop_flag):
                logger.info("[자동전송] stop.flag 감지 → 안전 종료")
                try:
                    os.remove(stop_flag)
                except OSError:
                    pass
                break
            self.tracker.check_new_day()
            now_dt = datetime.datetime.now()
            now_str = now_dt.strftime("%H:%M:%S")
            today   = now_dt.date()
            mins    = self.cfg.get("entry_price", {}).get("candle_minutes") or self.xl.get_interval_minutes()

            # ── 업로드 시간 게이트: 장중(09:00~15:30)에만 실제 업로드 ──
            #   [2026-07-24] 08시대에 열어 엑셀 연결·DDE는 미리 예열하되, 실제 업로드는 09:00부터.
            #   개장 전/장마감 후에는 감지·업로드를 건너뛴다.
            cur_time = now_dt.time()
            if cur_time < MARKET_OPEN:
                # 개장 전 → 연결·DDE 예열만, 업로드 보류. 개장 임박 대비 짧게 폴링.
                self.xl.set_status("[개장대기] 09:00 업로드 시작")
                logger.info("개장 전 대기 중 — 업로드는 09:00부터")
                wait_secs = min(mins * 60, 30)
            elif cur_time >= MARKET_CLOSE:
                # 장마감(15:30) → F열→L열 1회 복사 후 업로드 종료
                if self._close_done_date != today:
                    self.copy_high_to_prev_high()
                    self._close_done_date = today
                self.xl.set_status("[장마감] 업로드 종료")
                logger.info("장마감(15:30) 이후 — 업로드 종료")
                wait_secs = mins * 60
            else:
                # 장 중(09:00~15:30) → 돌파 감지 + 업로드
                logger.info("돌파 감지 실행 (다음: %d분 후)...", mins)
                confirmed = self.detect_and_update()
                if confirmed:
                    notes = self._update_status_history(confirmed)
                    self.upload(confirmed, notes=notes, mins=mins)
                else:
                    self.xl.set_status("[감시중-돌파없음]")
                    logger.info("돌파 확정 종목 없음")
                wait_secs = mins * 60

            for _ in range(wait_secs):
                if not self.running or os.path.exists(stop_flag):
                    break
                time.sleep(1)

        logger.info("[자동전송] 종료")

    # ── 장마감 처리: F열(당일고가) → L열(전일고가) 복사 ──
    def copy_high_to_prev_high(self):
        """
        15:30 장마감 후 1회 실행:
        F열(당일고가) 값을 L열(전일고가)에 정적 값으로 덮어씀.
        다음 날 HTS 미연결 상태에서도 Python이 L열을 참조 가능.
        다음 날 장 시작 시 FillDDEFormulas가 L열 DDE 수식을 다시 삽입.
        """
        start = self.cfg["data_start_row"]
        end   = self.cfg["data_end_row"]
        count = 0

        for row in range(start, end + 1):
            code = str(self.xl.cell_val(row, 2) or "").strip()
            if len(code) != 6 or not code.isdigit():
                continue
            high_val = _safe_int(self.xl.cell_val(row, 6))  # F열: 당일고가
            if high_val <= 0:
                continue
            self.xl.set_cell(row, 12, high_val)  # L열: 전일고가 정적 값으로 저장
            count += 1

        now = datetime.datetime.now().strftime("%H:%M:%S")
        msg = f"[장마감완료] F→L 복사 {count}종목"
        self.xl.set_status(msg)
        logger.info("장마감 처리: 당일고가→전일고가 복사 %d종목", count)
        return count

    # ── 자동 반복 ─────────────────────────────────────
    def stop(self):
        self.running = False


# ─────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────
def _safe_int(val):
    try:
        return int(float(val)) if val else 0
    except Exception:
        return 0


# ─────────────────────────────────────────────────────
# 진입점
# ─────────────────────────────────────────────────────
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    parser = argparse.ArgumentParser(description="StarStock 자동 업로더 (고가돌파 필터)")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--once",  action="store_true", help="1회 감지+업로드 후 종료")
    parser.add_argument("--reset", action="store_true", help="tracker.json 초기화 후 시작")
    args = parser.parse_args()

    uploader = StarStockUploader(args.config)

    if args.reset:
        uploader.tracker.reset_all()

    def handle_stop(sig, frame):
        logger.info("[종료] 업로더 종료 중...")
        uploader.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_stop)

    if args.once:
        uploader.run_once()
    else:
        uploader.run_auto()


if __name__ == "__main__":
    main()
