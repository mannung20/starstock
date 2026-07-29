# -*- coding: utf-8 -*-
# STARSTOCK_MASTER.xlsm 에 "설명" 시트 추가
# 실행: python add_description_sheet.py

import os, sys
try:
    import win32com.client
except ImportError:
    print("[오류] pywin32 미설치: pip install pywin32")
    sys.exit(1)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
XLSM_PATH   = os.path.join(PROJECT_DIR, "STARSTOCK_MASTER.xlsm")

def rgb(r, g, b):
    return r + (g * 256) + (b * 65536)

C_TITLE  = rgb(31,  56,  100)
C_FG_W   = rgb(255, 255, 255)
C_HDR    = rgb(68,  114, 196)
C_ROW1   = rgb(235, 241, 255)
C_ROW2   = rgb(255, 255, 255)
C_WARN   = rgb(255, 235, 156)
C_GRAY   = rgb(100, 100, 100)
C_GREEN  = rgb(198, 239, 206)
C_BLUE   = rgb(204, 229, 255)
C_YELLOW = rgb(255, 255, 204)


CONTENT = {
    # ── 1. 파일 구성 ──────────────────────────────────────────────────
    "section1_title": "파일 구성 및 역할",
    "files": [
        ("STARSTOCK_MASTER.xlsm",
         "메인 엑셀 파일",
         "종목 데이터 입력 / HTS DDE 실시간 수신 / 상태 모니터링 / VBA 매크로 포함"),
        ("config.json",
         "설정 파일 (⚠ .gitignore 필수)",
         "API 토큰, URL, 데이터 범위 등 민감 설정값 저장. GitHub 업로드 절대 금지"),
        ("starstock_uploader.py",
         "Python 자동 업로더 (권장)",
         "Excel에서 실시간 데이터 읽어 Vercel API 로 전송. P3 셀 주기로 자동 반복"),
        ("excel/starstock_module1.vba",
         "VBA 비상용 업로더",
         "Python 없을 때 사용. Excel Module1 에 삽입됨. config.json 토큰 필요"),
        ("starstock-tracker.json",
         "매수기준가 추적 상태 저장",
         "Python 업로더가 3분봉 돌파 카운트 등 진입 신호 상태를 저장하는 로컬 파일"),
    ],

    # ── 2. 아키텍처 흐름 ─────────────────────────────────────────────
    "section2_title": "데이터 흐름 (아키텍처)",
    "flow": [
        ("1", "HTS (eBest 등)",     "DDE",         "MASTER 시트 D·E·F·G·L열 자동 수신"),
        ("2", "운영자",              "직접 입력",    "종목코드·종목명·목표가·손절가·투자포인트 입력"),
        ("3", "starstock_uploader.py","win32com",   "고가돌파 감지(L열×1.015) → M열 자동기입 → 돌파 확정 종목만 API 전송"),
        ("4", "Vercel API",          "POST /api/upload-stocks", "토큰 검증 → Supabase 저장"),
        ("5", "Supabase PostgreSQL", "RLS 적용",    "등급별(guest/free/vip) 데이터 접근 제어"),
        ("6", "Next.js 웹",          "폴링 5분",     "사용자 브라우저에 카드/테이블 형태로 표시"),
    ],

    # ── 3. MASTER 시트 열(컬럼) 설명 ─────────────────────────────────
    "section3_title": "MASTER 시트 - 열(컬럼) 설명",
    "columns": [
        ("A", "번호",      "회색(잠금)",     "1~100 자동 순번 (최대 100종목). 변경 불필요"),
        ("B", "종목코드",  "흰색(입력)",     "6자리 숫자 코드. 예: 005930 (삼성전자)"),
        ("C", "종목명",    "흰색(입력)",     "종목 한글명. 예: 삼성전자"),
        ("D", "현재가",    "회색(DDE자동)",  "HTS DDE 수식 입력 필요. 예: =eBEST|현재가!005930"),
        ("E", "시가",      "회색(DDE자동)",  "당일 시가. DDE 수식 입력 필요"),
        ("F", "고가",      "회색(DDE자동)",  "당일 고가. DDE 수식 입력 필요"),
        ("G", "저가",      "회색(DDE자동)",  "당일 저가. DDE 수식 입력 필요"),
        ("H", "목표가",    "노랑(입력)",     "운영자 설정 목표가. 웹에서 VIP 이상 공개"),
        ("I", "손절가",    "노랑(입력)",     "운영자 설정 손절가. 웹에서 VIP 이상 공개"),
        ("J", "추천상태",  "흰색(드롭다운)", "매수적기 / 관망유지 / 손절조심 선택"),
        ("K", "투자포인트","황색(입력)",     "종목 설명, 매수 근거 등 자유 텍스트"),
        ("L", "전일고가",  "회색(자동복사)", "DDE 미지원 — 15:30 장마감 시 F열(당일고가) 값을 자동 복사. 다음날 매수기준가(=전일고가)로 사용"),
        ("M", "매수기준가","파랑(자동기입)", "Python 업로더가 전일고가(L열) 값을 그대로 기입. 돌파확인가(전일고가×1.015)를 2캔들 연속 넘으면 확정"),
        ("P1","서버 상태", "상태 표시",      "[연동중] / [토큰오류] / [연결오류] 등"),
        ("P2","최종 전송", "상태 표시",      "마지막 전송 성공 시각 (HH:MM:SS)"),
        ("P3","전송 주기", "드롭다운",       "1분/3분/5분/10분/30분. 업로더가 이 값을 읽어 반복 주기 결정"),
    ],

    # ── 4. 실행 방법 ─────────────────────────────────────────────────
    "section4_title": "실행 방법",
    "steps": [
        ("1단계", "config.json 설정",
         "upload_token 에 실제 토큰 입력. api_url 확인"),
        ("2단계", "STARSTOCK_MASTER.xlsm 열기",
         "eBest HTS 먼저 실행 → 엑셀 파일 열기 → 3초 후 DDE 수식 자동 기입 (D·E·F·G·L열). "
         "신규 종목 추가 시 VBA 편집기에서 FillDDEFormulas 수동 실행 가능"),
        ("3단계", "Python 업로더 실행",
         "PowerShell: python starstock_uploader.py  (장 시작 전 첫 실행 시 --reset 옵션 추가 권장)"),
        ("4단계", "자동 전송 확인",
         "P1 셀이 [연동중]으로 바뀌면 정상. P2 에 전송 시각 표시"),
        ("비상시", "VBA 버튼 사용",
         "Python 없을 때만 사용. [START] 버튼 클릭"),
    ],

    # ── 5. 보안 주의 ─────────────────────────────────────────────────
    "section5_title": "⚠ 보안 주의사항",
    "security": [
        "config.json 은 .gitignore 에 반드시 추가 (upload_token 유출 방지)",
        "SUPABASE_SERVICE_ROLE_KEY 는 Vercel 환경변수에만 저장 (코드에 절대 포함 금지)",
        "NEXT_PUBLIC_ 접두사 변수는 브라우저에 자동 노출됨 — 서비스 키에 사용 금지",
        "upload_token 은 최소 32자 이상 랜덤 문자열 사용 권장",
        "엑셀/VBA 파일 내부에 토큰 직접 기입 금지 — config.json 에서만 읽기",
    ],
}


def write_section_title(ws, row, text, col_end="M"):
    cell = ws.Range(f"A{row}:{col_end}{row}")
    cell.Merge()
    cell.Value = text
    cell.Font.Bold = True
    cell.Font.Size = 12
    cell.Font.Color = C_FG_W
    cell.Interior.Color = C_TITLE
    cell.HorizontalAlignment = -4131
    cell.IndentLevel = 1
    ws.Rows(row).RowHeight = 22
    return row + 1


def write_header(ws, row, cols):
    for col_idx, text in enumerate(cols, start=1):
        c = ws.Cells(row, col_idx)
        c.Value = text
        c.Font.Bold = True
        c.Font.Color = C_FG_W
        c.Interior.Color = C_HDR
        c.HorizontalAlignment = -4108
    ws.Rows(row).RowHeight = 18
    return row + 1


def write_data_row(ws, row, values, alt=False):
    bg = C_ROW1 if alt else C_ROW2
    for col_idx, val in enumerate(values, start=1):
        c = ws.Cells(row, col_idx)
        c.Value = val
        c.Interior.Color = bg
        c.HorizontalAlignment = -4131
        c.WrapText = True
    ws.Rows(row).RowHeight = 30
    return row + 1


def add_border(ws, addr):
    r = ws.Range(addr)
    for idx in range(7, 13):
        try:
            b = r.Borders(idx)
            b.LineStyle = 1
            b.Weight = 2
            b.Color = rgb(180, 180, 180)
        except Exception:
            pass


def build_sheet(ws):
    ws.Cells.ColumnWidth = 15
    ws.Columns("A").ColumnWidth = 6
    ws.Columns("B").ColumnWidth = 22
    ws.Columns("C").ColumnWidth = 18
    ws.Columns("D").ColumnWidth = 40
    ws.Columns("E").ColumnWidth = 10
    ws.Columns("F").ColumnWidth = 12
    ws.Columns("G").ColumnWidth = 40

    row = 2

    # ── 제목 ─────────────────────────────────────────
    ws.Range("A1:G1").Merge()
    ws.Range("A1").Value = "StarStock 서비스 — 파일 구성 및 사용 가이드"
    ws.Range("A1").Font.Bold = True
    ws.Range("A1").Font.Size = 14
    ws.Range("A1").Font.Color = C_FG_W
    ws.Range("A1").Interior.Color = C_TITLE
    ws.Range("A1").HorizontalAlignment = -4108
    ws.Rows(1).RowHeight = 30

    # ── 1. 파일 구성 ──────────────────────────────────
    row = write_section_title(ws, row, "1. 파일 구성 및 역할", "G")
    row = write_header(ws, row, ["파일명", "역할", "설명"])
    ws.Columns("A").ColumnWidth = 28
    ws.Columns("B").ColumnWidth = 20
    ws.Columns("C").ColumnWidth = 55
    start = row
    for i, (fname, role, desc) in enumerate(CONTENT["files"]):
        row = write_data_row(ws, row, [fname, role, desc], i % 2 == 0)
    add_border(ws, f"A{start - 1}:C{row - 1}")
    row += 1

    # ── 2. 아키텍처 흐름 ─────────────────────────────
    row = write_section_title(ws, row, "2. 데이터 흐름 (아키텍처)", "G")
    row = write_header(ws, row, ["단계", "주체", "방식", "설명"])
    ws.Columns("A").ColumnWidth = 6
    ws.Columns("B").ColumnWidth = 22
    ws.Columns("C").ColumnWidth = 22
    ws.Columns("D").ColumnWidth = 50
    start = row
    for i, (step, actor, method, desc) in enumerate(CONTENT["flow"]):
        row = write_data_row(ws, row, [step, actor, method, desc], i % 2 == 0)
    add_border(ws, f"A{start - 1}:D{row - 1}")
    row += 1

    # ── 3. 열 설명 ────────────────────────────────────
    row = write_section_title(ws, row, "3. MASTER 시트 열(컬럼) 설명", "G")
    row = write_header(ws, row, ["열", "이름", "배경색", "설명"])
    ws.Columns("A").ColumnWidth = 6
    ws.Columns("B").ColumnWidth = 14
    ws.Columns("C").ColumnWidth = 16
    ws.Columns("D").ColumnWidth = 55
    start = row
    for i, (col, name, color_info, desc) in enumerate(CONTENT["columns"]):
        row = write_data_row(ws, row, [col, name, color_info, desc], i % 2 == 0)
    add_border(ws, f"A{start - 1}:D{row - 1}")
    row += 1

    # ── 4. 실행 방법 ─────────────────────────────────
    row = write_section_title(ws, row, "4. 실행 방법", "G")
    row = write_header(ws, row, ["단계", "항목", "내용"])
    ws.Columns("A").ColumnWidth = 8
    ws.Columns("B").ColumnWidth = 22
    ws.Columns("C").ColumnWidth = 60
    start = row
    for i, (step, title, desc) in enumerate(CONTENT["steps"]):
        row = write_data_row(ws, row, [step, title, desc], i % 2 == 0)
    add_border(ws, f"A{start - 1}:C{row - 1}")
    row += 1

    # ── 5. 보안 주의 ─────────────────────────────────
    row = write_section_title(ws, row, "5. 보안 주의사항", "G")
    ws.Rows(row - 1).Interior.Color = rgb(255, 80, 80)

    for i, text in enumerate(CONTENT["security"]):
        c = ws.Range(f"A{row}")
        c.Value = f"⚠ {text}"
        ws.Range(f"A{row}:G{row}").Merge()
        ws.Range(f"A{row}").Interior.Color = C_WARN if i % 2 == 0 else rgb(255, 245, 180)
        ws.Range(f"A{row}").WrapText = True
        ws.Range(f"A{row}").Font.Color = rgb(150, 0, 0)
        ws.Rows(row).RowHeight = 28
        row += 1

    ws.Range(f"A{row}:G{row}").Interior.Color = rgb(240, 240, 240)
    ws.Range(f"A{row}").Value = "마지막 업데이트: 자동 생성됨 (create_starstock_excel.py)"
    ws.Range(f"A{row}").Font.Color = rgb(150, 150, 150)
    ws.Range(f"A{row}").Font.Italic = True
    ws.Range(f"A{row}:G{row}").Merge()
    ws.Rows(row).RowHeight = 18

    # 전체 좌측 정렬 + 세로 중앙
    ws.Cells.VerticalAlignment = -4108


def main():
    print("=" * 50)
    print("  설명 시트 추가")
    print("=" * 50)

    if not os.path.exists(XLSM_PATH):
        print(f"[오류] 파일 없음: {XLSM_PATH}")
        print("  create_starstock_excel.py 를 먼저 실행하세요.")
        sys.exit(1)

    print(f"\n[1/3] Excel 열기: {os.path.basename(XLSM_PATH)}")
    excel = win32com.client.DispatchEx("Excel.Application")
    try:
        excel.Visible = False
    except Exception:
        pass
    excel.DisplayAlerts = False

    wb = excel.Workbooks.Open(os.path.abspath(XLSM_PATH))

    # 기존 설명 시트 제거
    for sh in list(wb.Sheets):
        if sh.Name == "설명":
            try:
                sh.Delete()
            except Exception:
                pass
            break

    print("[2/3] 설명 시트 생성 중...")
    desc_ws = wb.Sheets.Add(After=wb.Sheets(wb.Sheets.Count))
    desc_ws.Name = "설명"

    build_sheet(desc_ws)

    # MASTER 시트로 돌아가기
    wb.Sheets("MASTER").Activate()

    print("[3/3] 저장 중...")
    wb.Save()
    wb.Close(SaveChanges=False)
    excel.Quit()

    print(f"\n완료: 설명 시트 추가됨 → {XLSM_PATH}")


if __name__ == "__main__":
    main()
