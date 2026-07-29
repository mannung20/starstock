# -*- coding: utf-8 -*-
"""STARSTOCK_MASTER.xlsm 의 MASTER 시트에 파이썬 연동 버튼 3개 삽입 (로컬 전용, Windows/pywin32).
   ★기존 버튼(StartAutoUpload 등 폼컨트롤)은 건드리지 않고, 내 매크로 3개만 연결/갱신.
   연결 매크로: PyControl 모듈의 RunSimulation / RunUploader / ResetWebDB
"""
import os
import win32com.client as win32

MASTER = r"C:\Users\nick7\0.test\projects\7.0.1-excel-vercel-starstock-service\uploader\STARSTOCK_MASTER.xlsm"
SHEET = "MASTER"
# (매크로, 라벨, left, top)  — 상단에 가로로 나란히
BUTTONS = [
    ("RunSimulation", "▶ 시뮬 재생", 10, 8),
    ("RunUploader", "▶ 실제 업로더", 128, 8),
    ("ResetWebDB", "웹DB 초기화", 246, 8),
]
W, H = 112, 30


def main():
    excel = win32.Dispatch("Excel.Application")
    excel.Visible = True

    wb = None
    for b in excel.Workbooks:
        if b.Name.lower() == os.path.basename(MASTER).lower():
            wb = b
            break
    if wb is None:
        wb = excel.Workbooks.Open(MASTER)

    ws = wb.Sheets(SHEET)
    for macro, text, left, top in BUTTONS:
        macro_path = f"{wb.Name}!{macro}"
        # 내 매크로에 연결된 기존 도형만 제거(중복 방지). 다른 버튼은 보존.
        for shape in list(ws.Shapes):
            try:
                oa = shape.OnAction
                if oa and oa.endswith(macro):
                    shape.Delete()
            except Exception:
                pass
        btn = ws.Shapes.AddShape(5, left, top, W, H)  # 5=둥근사각형
        btn.Fill.ForeColor.RGB = 9058846  # 딥블루
        btn.Line.Visible = 0
        btn.TextFrame2.TextRange.Text = text
        btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = 16777215  # 흰색
        btn.TextFrame2.TextRange.Font.Bold = -1
        btn.TextFrame2.TextRange.Font.Size = 10
        btn.TextFrame2.TextRange.Font.Name = "맑은 고딕"
        btn.TextFrame2.VerticalAnchor = 3
        btn.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
        btn.OnAction = macro_path
        print(f"버튼 추가: {text} -> {macro}")

    wb.Save()
    print("저장 완료 (기존 버튼 보존).")


if __name__ == "__main__":
    main()
