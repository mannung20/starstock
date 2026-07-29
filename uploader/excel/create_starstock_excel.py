# -*- coding: utf-8 -*-
# STARSTOCK_MASTER.xlsm 생성 스크립트
# 레이아웃: A1=가이드, 2~9행=버튼/상태, 10행=헤더, 11~110행=데이터(최대100종목)
# 실행: python create_starstock_excel.py

import os
import sys

try:
    import win32com.client
except ImportError:
    print("[오류] pywin32 미설치: pip install pywin32")
    sys.exit(1)

# ─────────────────────────────────────────
# 색상 헬퍼
# ─────────────────────────────────────────
def rgb(r, g, b):
    return r + (g * 256) + (b * 65536)

C_HEADER_BG  = rgb(31,  56,  100)
C_HEADER_FG  = rgb(255, 255, 255)
C_DDE_BG     = rgb(217, 217, 217)
C_INPUT_BG   = rgb(255, 255, 255)
C_TARGET_BG  = rgb(255, 255, 204)
C_MEMO_BG    = rgb(255, 242, 204)
C_ENTRY_BG   = rgb(204, 229, 255)
C_STATUS_BG  = rgb(226, 239, 218)
C_BTN_AREA   = rgb(242, 242, 242)
C_BORDER     = rgb(180, 180, 180)
C_GRAY_FG    = rgb(100, 100, 100)

XL_CENTER    = -4108
XL_RIGHT     = -4152
XL_LEFT      = -4131
XL_VCENTER   = -4108
XL_CONTINUOUS = 1
XL_THIN      = 2
XL_BUTTON    = 1

# 레이아웃 상수
HDR_ROW      = 10   # 헤더 행
DATA_START   = 11   # 데이터 시작 행
DATA_END     = 110  # 데이터 끝 행 (100개)
BTN_ROW      = 4    # 버튼 행

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR  = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH  = os.path.join(PROJECT_DIR, "STARSTOCK_MASTER.xlsm")
VBA_FILE     = os.path.join(SCRIPT_DIR, "starstock_module1.vba")


def apply_border(rng, color=C_BORDER):
    for idx in range(7, 13):
        try:
            b = rng.Borders(idx)
            b.LineStyle = XL_CONTINUOUS
            b.Weight = XL_THIN
            b.Color = color
        except Exception:
            pass


def setup_col_widths(ws):
    widths = {
        "A": 5, "B": 11, "C": 14,
        "D": 10, "E": 10, "F": 10, "G": 10,
        "H": 10, "I": 10,
        "J": 12, "K": 26,
        "L": 10, "M": 12,
        "N": 2,  "O": 12, "P": 20
    }
    for col, w in widths.items():
        ws.Columns(col).ColumnWidth = w


def setup_guide_a1(ws):
    """A1: 안내 텍스트 (가이드 한 줄 요약)"""
    ws.Rows(1).RowHeight = 22
    guide = ws.Range("A1:M1")
    guide.Merge()
    guide.Value = (
        "DDE 회색 셀(현재가·시/고/저가·전일고가) → HTS 연결 후 자동수신  |  "
        "매수기준가(M열) → starstock_uploader.py 자동기입  |  "
        "종목코드 없는 행은 업로드 제외 (최대 100행)"
    )
    guide.Font.Italic = True
    guide.Font.Size = 8
    guide.Font.Color = rgb(60, 60, 120)
    guide.Interior.Color = rgb(235, 241, 255)  # 연한 파란 배경
    guide.HorizontalAlignment = XL_LEFT
    guide.IndentLevel = 1


def setup_button_area(ws):
    """2~9행: 버튼 영역 배경색 + 높이"""
    for r in range(2, HDR_ROW):
        ws.Rows(r).RowHeight = 18
    # A2:M9 영역 연한 배경
    ws.Range(f"A2:M{HDR_ROW - 1}").Interior.Color = C_BTN_AREA

    # A2: 실행 필수 안내 (Excel 2016 DDE는 HTS와 관리자권한 일치 필요)
    a2 = ws.Range("A2")
    a2.Value = "2016버전은 필수- 관리자권한 실행"
    a2.Font.Bold = True
    a2.Font.Size = 10
    a2.Font.Color = rgb(200, 0, 0)   # 빨강 경고

    # 영역 구분선 (9행 하단 강조)
    bottom = ws.Range(f"A{HDR_ROW - 1}:P{HDR_ROW - 1}")
    bottom.Borders(9).LineStyle = XL_CONTINUOUS   # xlEdgeBottom=9
    bottom.Borders(9).Weight = 4
    bottom.Borders(9).Color = rgb(31, 56, 100)


def setup_status_area(ws):
    """O1:P3: 서버 상태 / 최종 전송 / 전송 주기"""
    labels = [("O1", "서버 상태"), ("O2", "최종 전송"), ("O3", "전송 주기")]
    values = [("P1", "[연결 안됨]"), ("P2", "-"), ("P3", "5분")]

    for addr, txt in labels:
        c = ws.Range(addr)
        c.Value = txt
        c.Font.Bold = True
        c.Interior.Color = C_STATUS_BG
        c.HorizontalAlignment = XL_LEFT

    for addr, txt in values:
        c = ws.Range(addr)
        c.Value = txt
        c.Interior.Color = C_INPUT_BG
        c.HorizontalAlignment = XL_CENTER

    # P3 드롭다운
    p3 = ws.Range("P3")
    p3.Validation.Delete()
    p3.Validation.Add(
        Type=3, AlertStyle=1, Operator=1,
        Formula1="1분,3분,5분,10분,30분"
    )

    apply_border(ws.Range("O1:P3"))

    # 범례 (O5:O8)
    legends = [
        ("O5", "[ 색상 범례 ]", True),
        ("O6", "회색 = DDE 자동수신", False),
        ("O7", "노랑 = 목표가/손절가", False),
        ("O8", "파랑 = 매수기준가(Python)", False),
    ]
    for addr, txt, bold in legends:
        c = ws.Range(addr)
        c.Value = txt
        c.Font.Size = 8
        c.Font.Bold = bold
        c.Font.Color = C_GRAY_FG


def add_buttons(ws):
    """버튼 3개: 4행에 배치 (START / SEND / STOP)"""
    btn_top = ws.Rows(BTN_ROW).Top + 3
    btn_h   = 28

    def make_btn(l_cell, r_cell, label, macro):
        left  = ws.Range(l_cell).Left
        right = ws.Range(r_cell).Left + ws.Range(r_cell).Width
        shape = ws.Shapes.AddFormControl(
            XL_BUTTON,
            left + 3, btn_top,
            right - left - 6, btn_h
        )
        shape.TextFrame.Characters().Text = label
        shape.OLEFormat.Object.OnAction = macro
        return shape

    make_btn("B4", "D4", "[START] 자동 전송 시작", "StartAutoUpload")
    make_btn("F4", "H4", "[SEND]  즉시 전송 1회",  "SendDataNow")
    make_btn("J4", "L4", "[STOP]  자동 전송 중지", "StopAutoUpload")


def setup_header_row(ws):
    """10행: 헤더"""
    headers = [
        "번호", "종목코드", "종목명",
        "현재가", "시가", "고가", "저가",
        "목표가", "손절가",
        "추천상태", "투자포인트",
        "전일고가", "매수기준가"
    ]
    for col_idx, text in enumerate(headers, start=1):
        cell = ws.Cells(HDR_ROW, col_idx)
        cell.Value = text
        cell.Font.Bold = True
        cell.Font.Color = C_HEADER_FG
        cell.Interior.Color = C_HEADER_BG
        cell.HorizontalAlignment = XL_CENTER
        cell.VerticalAlignment = XL_VCENTER
    ws.Rows(HDR_ROW).RowHeight = 24


def setup_data_rows(ws):
    """11~110행: 종목 데이터 영역 (최대 100종목)"""
    for row in range(DATA_START, DATA_END + 1):
        ws.Rows(row).RowHeight = 20
        rank = row - DATA_START + 1  # 1~10

        # A: 번호
        c = ws.Cells(row, 1)
        c.Value = rank
        c.Interior.Color = C_DDE_BG
        c.HorizontalAlignment = XL_CENTER
        c.Font.Bold = True

        # B: 종목코드
        c = ws.Cells(row, 2)
        c.Interior.Color = C_INPUT_BG
        c.NumberFormat = "@"
        c.HorizontalAlignment = XL_CENTER

        # C: 종목명
        ws.Cells(row, 3).Interior.Color = C_INPUT_BG

        # D~G: DDE 가격
        for col in [4, 5, 6, 7]:
            c = ws.Cells(row, col)
            c.Interior.Color = C_DDE_BG
            c.NumberFormat = "#,##0"
            c.HorizontalAlignment = XL_RIGHT

        # H~I: 목표가/손절가
        for col in [8, 9]:
            c = ws.Cells(row, col)
            c.Interior.Color = C_TARGET_BG
            c.NumberFormat = "#,##0"
            c.HorizontalAlignment = XL_RIGHT

        # J: 추천상태
        c = ws.Cells(row, 10)
        c.Interior.Color = C_INPUT_BG
        c.HorizontalAlignment = XL_CENTER
        c.Value = "관망유지"

        # K: 투자포인트
        ws.Cells(row, 11).Interior.Color = C_MEMO_BG

        # L: 전일고가
        c = ws.Cells(row, 12)
        c.Interior.Color = C_DDE_BG
        c.NumberFormat = "#,##0"
        c.HorizontalAlignment = XL_RIGHT

        # M: 매수기준가
        c = ws.Cells(row, 13)
        c.Interior.Color = C_ENTRY_BG
        c.NumberFormat = "#,##0"
        c.HorizontalAlignment = XL_RIGHT


def setup_validation_j(ws):
    """J11:J20 드롭다운"""
    rng = ws.Range(f"J{DATA_START}:J{DATA_END}")
    rng.Validation.Delete()
    rng.Validation.Add(
        Type=3, AlertStyle=1, Operator=1,
        Formula1="매수적기,관망유지,손절조심"
    )
    rng.Validation.ShowError = True
    rng.Validation.ErrorTitle = "입력 오류"
    rng.Validation.ErrorMessage = "드롭다운 목록에서 선택하세요."


def setup_conditional_format(ws):
    """조건부 서식: 현재가 > 0 이고 현재가 <= 손절가 → 연홍 (빈 셀 제외)"""
    data_rng = ws.Range(f"A{DATA_START}:M{DATA_END}")
    data_rng.FormatConditions.Delete()
    try:
        formula = f"=AND($D{DATA_START}>0,$D{DATA_START}<=$I{DATA_START})"
        fc = data_rng.FormatConditions.Add(2, 1, formula)
        fc.Interior.Color = rgb(255, 199, 206)
    except Exception as e:
        print(f"  [경고] 조건부 서식 설정 실패(수동 설정 필요): {e}")


def add_guide_text(ws):
    """DATA_END+2행: 하단 안내 (업로드 행 수 표시)"""
    guide_row = DATA_END + 2
    ws.Range(f"A{guide_row}:M{guide_row}").Merge()
    ws.Range(f"A{guide_row}").Value = (
        f"▲ 업로드 대상: {DATA_START}행 ~ {DATA_END}행 (최대 {DATA_END - DATA_START + 1}종목)  |  "
        "유효 조건: 종목코드 6자리 숫자 + 현재가 > 0"
    )
    ws.Range(f"A{guide_row}").Font.Italic = True
    ws.Range(f"A{guide_row}").Font.Color = C_GRAY_FG
    ws.Range(f"A{guide_row}").Font.Size = 8


def inject_vba(wb):
    if not os.path.exists(VBA_FILE):
        print(f"  [경고] VBA 파일 없음: {VBA_FILE}")
        return False
    with open(VBA_FILE, encoding="utf-8") as f:
        vba_code = f.read()
    try:
        vbp = wb.VBProject
    except Exception as e:
        print(f"  [경고] VBProject 접근 실패: {e}")
        print("  Excel > 옵션 > 보안센터 > 'VBA 프로젝트 개체 모델에 안전하게 액세스' 체크 필요")
        return False

    for comp in list(vbp.VBComponents):
        if comp.Name == "Module1":
            try:
                vbp.VBComponents.Remove(comp)
            except Exception:
                pass
            break

    mod = vbp.VBComponents.Add(1)
    mod.Name = "Module1"
    mod.CodeModule.AddFromString(vba_code)
    print("  VBA Module1 주입 완료")

    # ThisWorkbook — Workbook_Open 이벤트 주입 (3초 후 DDE 수식 자동 기입)
    try:
        wb_open_code = (
            "Private Sub Workbook_Open()\r\n"
            "    Application.OnTime Now() + TimeSerial(0, 0, 3), \"FillDDEFormulas\"\r\n"
            "End Sub\r\n"
        )
        # Type 100 = vbext_ct_Document (ThisWorkbook, Sheet 모듈 등)
        this_wb_comp = None
        for comp in list(vbp.VBComponents):
            if comp.Type == 100 and "ThisWorkbook" in comp.Name:
                this_wb_comp = comp
                break
        if this_wb_comp is None:
            for comp in list(vbp.VBComponents):
                if comp.Type == 100:
                    this_wb_comp = comp
                    break
        if this_wb_comp:
            cm = this_wb_comp.CodeModule
            if cm.CountOfLines > 0:
                cm.DeleteLines(1, cm.CountOfLines)
            cm.AddFromString(wb_open_code)
            print(f"  ThisWorkbook({this_wb_comp.Name}) Workbook_Open 이벤트 주입 완료")
        else:
            print("  [경고] ThisWorkbook 컴포넌트를 찾지 못함 — Workbook_Open 수동 추가 필요")
    except Exception as e:
        print(f"  [경고] ThisWorkbook 이벤트 주입 실패: {e}")

    return True


def main():
    print("=" * 55)
    print("  STARSTOCK_MASTER.xlsm 생성")
    print(f"  레이아웃: A1=가이드, 2~9행=버튼/상태, 10행=헤더, {DATA_START}~{DATA_END}행=데이터({DATA_END-DATA_START+1}종목)")
    print("=" * 55)

    print("\n[1/8] Excel 실행...")
    excel = win32com.client.DispatchEx("Excel.Application")
    try:
        excel.Visible = True
    except Exception:
        pass
    excel.DisplayAlerts = False

    print("[2/8] 새 워크북 생성...")
    wb = excel.Workbooks.Add()
    ws = wb.Sheets(1)
    ws.Name = "MASTER"
    while wb.Sheets.Count > 1:
        try:
            wb.Sheets(2).Delete()
        except Exception:
            break

    print("[3/8] 열 너비 설정...")
    setup_col_widths(ws)

    print("[4/8] A1 가이드 텍스트 + 버튼 영역 설정 (2~9행)...")
    setup_guide_a1(ws)
    setup_button_area(ws)

    print("[5/8] 상태 영역 / 버튼 삽입 (O1:P3, 4행)...")
    setup_status_area(ws)
    add_buttons(ws)

    print("[6/8] 헤더(10행) + 데이터(11~20행) 디자인...")
    setup_header_row(ws)
    setup_data_rows(ws)
    apply_border(ws.Range(f"A{HDR_ROW}:M{DATA_END}"))
    setup_validation_j(ws)

    print("[7/8] 조건부 서식 + 하단 안내 텍스트...")
    setup_conditional_format(ws)
    add_guide_text(ws)  # DATA_END+2 행에 업로드 범위 표시

    print("[8/8] VBA Module1 주입...")
    vba_ok = inject_vba(wb)

    # 저장
    if os.path.exists(OUTPUT_PATH):
        try:
            os.remove(OUTPUT_PATH)
        except Exception:
            pass
    wb.SaveAs(os.path.abspath(OUTPUT_PATH), FileFormat=52)
    wb.Close(SaveChanges=False)   # 저장 후 워크북 닫기 (잠금 방지)
    excel.Quit()                  # Excel 종료
    print(f"\n저장 완료: {OUTPUT_PATH}")

    if not vba_ok:
        print("\n[!] VBA 주입 실패 → 수동 주입:")
        print(f"    cd ..\\..\\tools\\excel_automation_vba")
        print(f"    python excel_vba_manager.py write --file \"{OUTPUT_PATH}\" --module Module1 --code \"{VBA_FILE}\"")

    print("\n" + "=" * 55)
    print("  완료! 엑셀 파일을 확인하세요.")
    print("=" * 55)


if __name__ == "__main__":
    main()
