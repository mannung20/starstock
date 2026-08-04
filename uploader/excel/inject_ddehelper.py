"""DDEHelper.vba → STARSTOCK_MASTER.xlsm 주입 스크립트
AutomationSecurity=3 + UpdateLinks=0 으로 Workbook_Open DDE 충돌 방지
"""
import sys, os
import win32com.client as win32

BASE   = os.path.dirname(os.path.abspath(__file__))
XLSM   = os.path.join(BASE, "STARSTOCK_MASTER.xlsm")
VBA    = os.path.join(BASE, "DDEHelper.vba")
MODULE = "DDEHelper"

# xlsm 경로 보정 (excel 폴더 → uploader 폴더)
XLSM = os.path.join(os.path.dirname(BASE), "STARSTOCK_MASTER.xlsm")

if not os.path.exists(XLSM):
    print(f"ERROR: xlsm 없음: {XLSM}")
    sys.exit(1)
if not os.path.exists(VBA):
    print(f"ERROR: vba 없음: {VBA}")
    sys.exit(1)

with open(VBA, encoding="utf-8") as f:
    new_code = f.read()

print(f"VBA 소스: {len(new_code)} bytes")

xl = win32.Dispatch("Excel.Application")
xl.Visible = False
xl.AutomationSecurity = 3       # msoAutomationSecurityForceDisable: 매크로 비활성화로 열기
wb = xl.Workbooks.Open(XLSM, UpdateLinks=0)

try:
    vbp = wb.VBProject
    mod = None
    for i in range(1, vbp.VBComponents.Count + 1):
        c = vbp.VBComponents.Item(i)
        if c.Name == MODULE:
            mod = c
            break

    if mod is None:
        print(f"ERROR: '{MODULE}' 모듈을 찾을 수 없음")
        wb.Close(SaveChanges=False)
        xl.Quit()
        sys.exit(1)

    cnt = mod.CodeModule.CountOfLines
    print(f"기존 코드 {cnt}줄 삭제 후 새 코드 주입")
    if cnt > 0:
        mod.CodeModule.DeleteLines(1, cnt)
    mod.CodeModule.AddFromString(new_code)

    wb.Save()
    print("저장 완료")

finally:
    wb.Close(SaveChanges=False)
    xl.Quit()
    print("Excel 종료 완료")
    print("=== 주입 성공 ===")
