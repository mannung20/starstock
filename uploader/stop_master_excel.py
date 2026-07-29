# -*- coding: utf-8 -*-
"""
STARSTOCK 마스터 엑셀 '안전 종료 / 좀비 정리' 도구
─────────────────────────────────────────────────────
문제: 업로더(COM)·LS증권 DDE 링크가 엑셀을 붙잡으면, X 로 닫아도 엑셀 프로세스가
      백그라운드로 남는다('좀비'). taskkill /im excel.exe 는 다른 파일(1번파일 등)까지
      다 죽여 위험 → 이 도구는 '마스터/좀비'만 정확히 골라 종료한다.

판별 원칙(안전):
  · 창이 있는 엑셀(MainWindowHandle≠0) = 사용자가 보고 있는 정상 파일 → 기본 보호(안 죽임)
  · 창이 없는 엑셀(MainWindowHandle=0) = 좀비(닫혔는데 남은 것) → 정리 대상
  · COM 으로 STARSTOCK_MASTER 를 연 인스턴스는 그 PID 를 정확히 찾아 우선 정리

사용법:
  python stop_master_excel.py --list     # (안전) 현재 엑셀 프로세스 상태만 표시, 종료 안 함
  python stop_master_excel.py            # 마스터 안전종료 + 창 없는 좀비 정리 (표시 후 확인)
  python stop_master_excel.py --yes      # 위와 같되 확인 없이 바로 종료
  python stop_master_excel.py --zombie   # 창 없는 좀비 엑셀만 강제종료
  python stop_master_excel.py --all-master  # 마스터를 연 인스턴스는 창 있어도 종료

주의: 대상 엑셀이 관리자/시스템 권한이면 이 스크립트도 '관리자'로 실행해야 죽는다.
요구: pip install pywin32
"""
import os
import sys
import subprocess

MASTER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "STARSTOCK_MASTER.xlsm").lower()
MASTER_NAME = os.path.basename(MASTER_PATH)


# ─────────────────────────────────────────────────────
# 프로세스 조회/종료 (COM 불필요 — 좀비도 확실히 잡힘)
# ─────────────────────────────────────────────────────
def list_excel_procs():
    """[(pid, has_window, title)] — 실행 중 EXCEL.EXE 전체."""
    ps = (r"Get-Process EXCEL -ErrorAction SilentlyContinue | "
          r"ForEach-Object { '{0}`t{1}`t{2}' -f $_.Id, "
          r"[int]($_.MainWindowHandle), $_.MainWindowTitle }")
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    rows = []
    for line in out.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2 and parts[0].strip().isdigit():
            pid = int(parts[0].strip())
            has_win = parts[1].strip() not in ("0", "")
            title = parts[2] if len(parts) > 2 else ""
            rows.append((pid, has_win, title))
    return rows


def kill_pid(pid):
    r = subprocess.run(["taskkill", "/PID", str(pid), "/F"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def pid_alive(pid):
    r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return str(pid) in r.stdout


# ─────────────────────────────────────────────────────
# COM: STARSTOCK_MASTER 를 연 인스턴스의 PID 찾기 + 안전한 그레이스풀 종료
# ─────────────────────────────────────────────────────
def find_master_via_com():
    """마스터를 연 Excel 인스턴스를 찾아 (app, wb, pid) 반환. 없으면 (None, None, None).
    좀비(워크북 이미 닫힘)는 COM 으로 안 잡히므로 그때는 프로세스 목록으로 처리."""
    try:
        import win32com.client
        import win32process
    except Exception:
        return None, None, None

    apps, seen = [], set()

    def _add(a):
        if a is not None and id(a) not in seen:
            seen.add(id(a)); apps.append(a)

    try:
        import win32com.client as _w
        _add(_w.GetActiveObject("Excel.Application"))
    except Exception:
        pass
    try:
        import pythoncom
        rot = pythoncom.GetRunningObjectTable()
        for m in rot:
            try:
                d = win32com.client.Dispatch(rot.GetObject(m))
                a = getattr(d, "Application", None)
                if a is not None and hasattr(a, "Workbooks"):
                    _add(a)
            except Exception:
                continue
    except Exception:
        pass

    for app in apps:
        try:
            for wb in app.Workbooks:
                try:
                    if str(wb.FullName).lower() == MASTER_PATH:
                        try:
                            _, pid = win32process.GetWindowThreadProcessId(int(app.Hwnd))
                        except Exception:
                            pid = None
                        return app, wb, pid
                except Exception:
                    continue
        except Exception:
            continue
    return None, None, None


def graceful_close(app, wb):
    """BeforeClose 팝업/저장대화 억제 후 마스터 워크북만 닫는다.
    같은 인스턴스에 다른 워크북이 남으면 Quit 안 함(그 파일 보호)."""
    import pywintypes
    def _try(fn):
        try:
            fn(); return True
        except pywintypes.com_error:
            return False
        except Exception:
            return False
    _try(lambda: setattr(app, "DisplayAlerts", False))
    _try(lambda: setattr(app, "EnableEvents", False))  # BeforeClose 매크로 억제
    _try(lambda: wb.Close(False))                      # 저장 안 함
    try:
        remaining = app.Workbooks.Count
    except Exception:
        remaining = 0
    if remaining == 0:
        _try(lambda: app.Quit())
        return True   # 인스턴스 종료 시도함
    print(f"  · 같은 인스턴스에 다른 워크북 {remaining}개 → Quit 생략(그 파일 보호)")
    return False


# ─────────────────────────────────────────────────────
def print_table(rows, master_pid):
    if not rows:
        print("  실행 중인 EXCEL 프로세스 없음")
        return
    print("  PID     | 창    | 마스터? | 제목")
    print("  --------+-------+---------+-----------------------------")
    for pid, has_win, title in rows:
        mark = "★마스터" if pid == master_pid else ""
        win = "있음" if has_win else "없음(좀비)"
        print(f"  {pid:<7} | {win:<5} | {mark:<7} | {title[:40]}")


def main():
    args = sys.argv[1:]
    mode_list   = "--list" in args
    auto_yes    = "--yes" in args
    zombie_only = "--zombie" in args
    all_master  = "--all-master" in args

    rows = list_excel_procs()
    _, _, master_pid = find_master_via_com()

    print("===== 현재 엑셀 프로세스 =====")
    print_table(rows, master_pid)

    if mode_list:
        print("\n(--list: 표시만, 종료하지 않음)")
        return

    # 종료 대상 선정
    targets = set()
    reasons = {}
    for pid, has_win, title in rows:
        if pid == master_pid:
            # 마스터: 창 있으면 그레이스풀 우선(아래), 창 없으면 좀비로 강제
            if not has_win or all_master:
                targets.add(pid); reasons[pid] = "마스터 인스턴스"
        elif not has_win:
            targets.add(pid); reasons[pid] = "창 없는 좀비"

    # 그레이스풀 종료(마스터가 아직 정상 오픈+창 있을 때)
    if master_pid and master_pid not in targets and not zombie_only:
        print(f"\n마스터(PID {master_pid})가 정상 열림 → 팝업 억제 후 안전 종료 시도")
        app, wb, _ = find_master_via_com()
        if app is not None:
            graceful_close(app, wb)
            import time; time.sleep(2)
            if pid_alive(master_pid):
                targets.add(master_pid); reasons[master_pid] = "그레이스풀 후 잔존 → 강제"
            else:
                print(f"  · PID {master_pid} 정상 종료됨")

    if not targets:
        print("\n종료할 좀비/마스터 프로세스 없음.")
        return

    print("\n----- 강제종료 대상 -----")
    for pid in sorted(targets):
        print(f"  PID {pid}  ({reasons.get(pid,'')})")

    if not auto_yes:
        try:
            ans = input("\n위 PID 만 강제종료할까요? [y/N] ").strip().lower()
        except EOFError:
            ans = "n"
        if ans not in ("y", "yes"):
            print("취소했습니다.")
            return

    for pid in sorted(targets):
        ok, msg = kill_pid(pid)
        print(f"  PID {pid}: {'종료됨' if ok else '실패'} — {msg}")
        if not ok and "액세스" in msg or "denied" in msg.lower():
            print("     ※ 권한 부족일 수 있음 → 이 스크립트를 '관리자'로 실행해 보세요.")


if __name__ == "__main__":
    main()
