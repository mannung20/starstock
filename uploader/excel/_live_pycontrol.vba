Option Explicit
'===================================================
' StarStock PyControl ? 파이썬 연동 버튼 매크로 (신규 모듈, 기존 Module1 무관)
' 버튼: 시뮬레이션 재생 / 실제 업로더 / 웹DB 초기화
' + AskDailyReset : 엑셀 열릴 때 초기화 물어보기 (Workbook_Open 에서 호출)
' 경로에 공백이 없어 따옴표 없이 처리.
'===================================================
Private Const UPLOADER_WIN As String = "C:\Users\nick7\0.test\projects\7.0.1-excel-vercel-starstock-service\uploader"
Private Const UPLOADER_WSL As String = "/mnt/c/Users/nick7/0.test/projects/7.0.1-excel-vercel-starstock-service/uploader"
Public g_SortTime As Date   ' 다음 재정렬 예약 시각(닫을 때 취소용) ? 모듈 최상단 선언
#If VBA7 Then
    Private Declare PtrSafe Function GetCurrentProcessId Lib "kernel32" () As Long
#Else
    Private Declare Function GetCurrentProcessId Lib "kernel32" () As Long
#End If

' [버튼] 1회 전송 - 실제 업로더와 동일하되 --once (돌파감지 1회 후 종료, 반복 없음)
Public Sub RunUploaderOnce()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python starstock_uploader.py --once", vbNormalFocus
End Sub


' [버튼] 시뮬레이션 재생 ? 파일선택 대화상자로 3분봉 .xlsm 고른 뒤 재생
' (선택 후 콘솔에서 종목코드/전일고가 입력). WSL python, openpyxl.
Public Sub RunSimulation()
    Dim fd As FileDialog, initDir As String, picked As String, wslPath As String, cmd As String

    ' 시작 폴더: 현재 통합문서(마스터) 폴더의 simulation-xlsm, 없으면 통합문서 폴더
    initDir = ThisWorkbook.Path & "\simulation-xlsm\"
    If Dir(initDir, vbDirectory) = "" Then initDir = ThisWorkbook.Path & "\"

    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = "재생할 3분봉 파일 선택"
        .AllowMultiSelect = False
        .InitialFileName = initDir
        .Filters.Clear
        .Filters.Add "엑셀 파일", "*.xlsm;*.xlsx"
        If .Show <> -1 Then Exit Sub   ' 취소
        picked = .SelectedItems(1)
    End With

    ' Windows 경로 → WSL 경로 (C: 드라이브 가정)
    wslPath = Replace(picked, "\", "/")
    wslPath = Replace(wslPath, "C:/", "/mnt/c/")

    cmd = "cmd.exe /k wsl bash -lc ""cd " & UPLOADER_WSL & " && python3 replay_3min.py '" & wslPath & "'"""
    Shell cmd, vbNormalFocus
End Sub

' [버튼] 실제 업로더 실행 (Windows python, win32com → 열려있는 이 마스터에 연결)
Public Sub RunUploader()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python starstock_uploader.py", vbNormalFocus
End Sub

' [버튼] 웹DB 초기화 (Windows python, requests) ? 전 종목 is_visible=false soft reset
Public Sub ResetWebDB()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python reset_web_db.py", vbNormalFocus
End Sub

' [Workbook_Open 호출] 초기화 물어보기 ? 10초 무응답/예 → 초기화, 아니오만 취소
Public Sub AskDailyReset()
    Dim r As Integer
    r = CreateObject("WScript.Shell").Popup( _
        "웹 종목디비를 초기화할까요? 10초 후 자동 초기화", 10, "StarStock", vbYesNo + vbQuestion)
    If r <> vbNo Then
        Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python reset_web_db.py", vbNormalFocus
    End If
End Sub

' [Workbook_Open 이 지연호출] 시작 안내 + 웹DB 초기화 (Excel 완전히 열린 뒤 실행 → 열기 멈춤 방지)
' ★자동닫힘: 관리자권한 Excel 에서는 Popup 자체 타임아웃(10초)이 안 먹는다.
'   → 외부 PowerShell 이 10초 뒤 Enter 를 전송해 기본버튼[예]를 눌러 팝업을 확실히 닫는다(백업).
'   (Popup 은 그대로 두어, 일반환경은 자체 타임아웃 / 관리자환경은 PowerShell 이 닫음)
Public Sub StartupAsk()
    Dim r As Long

    ' [자동닫힘 백업] 10초 후 Enter 전송 (foreground=이 팝업, 기본버튼=예). 실패해도 무시.
    On Error Resume Next
    Shell "powershell -NoProfile -WindowStyle Hidden -Command ""Start-Sleep -Seconds 10; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')""", vbHide
    On Error GoTo 0

    r = CreateObject("WScript.Shell").Popup( _
        "StarStock 시작 - 작동 흐름" & vbCrLf & vbCrLf & _
        "① 웹 종목DB 초기화 (아래 선택)" & vbCrLf & _
        "② DDE 실시간 시세 기입 (현재가·시가·고가·저가·등락율)" & vbCrLf & _
        "③ 1차 정렬: 등락율 내림차순 (P3 주기 반복)" & vbCrLf & _
        "④ 자동 업로더 시작 (돌파감지 → 업로드)" & vbCrLf & _
        "⑤ 15:30 장마감 F→L 복사 예약" & vbCrLf & vbCrLf & _
        "▶ 웹 종목DB를 초기화할까요?  (10초 후 자동 [예])", _
        10, "StarStock 시작", vbYesNo + vbQuestion)
    If r <> vbNo Then
        Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python reset_web_db.py", vbNormalFocus
    End If
End Sub

' [Workbook_Open 호출] N열 등락률 DDE 수식 기입 (eBest eds, 시/고/저와 동일 형식)
' ※ 필드명이 '등락률'이 아니면 아래 문자열만 실제 필드명으로 수정
Public Sub FillChangeRate()
    Dim ws As Worksheet, i As Long, lastRow As Long, code As String
    Set ws = ThisWorkbook.Sheets("MASTER")
    ws.Range("N10").Value = "등락률"
    lastRow = ws.Cells(ws.Rows.count, 2).End(xlUp).Row
    If lastRow < 11 Then lastRow = 11

    Dim pa As Boolean, pe As Boolean
    pa = Application.DisplayAlerts: pe = Application.EnableEvents
    Application.DisplayAlerts = False: Application.EnableEvents = False
    On Error Resume Next
    For i = 11 To lastRow
        code = Trim(CStr(ws.Cells(i, 2).Value))
        If Len(code) = 6 And IsNumeric(code) Then
            If Not ws.Cells(i, 14).HasFormula Then _
                ws.Cells(i, 14).Formula = "=EtkDS|eds!'STOCK." & code & ";등락율'"
        End If
    Next i
    On Error GoTo 0
    Application.DisplayAlerts = pa: Application.EnableEvents = pe
End Sub

' [Workbook_Open 호출] 1차 정렬 ? 데이터행(B~N)을 등락률(N) 내림차순 (A=번호는 고정)
Public Sub SortByChange()
    Dim ws As Worksheet, lastRow As Long
    Dim su As Boolean, calc As XlCalculation   ' 정렬 중 화면깜빡임 방지용 상태 백업
    Set ws = ThisWorkbook.Sheets("MASTER")
    lastRow = ws.Cells(ws.Rows.count, 2).End(xlUp).Row
    If lastRow <= 11 Then Exit Sub

    ' [깜빡임 방지] 정렬(.Apply) 중 화면갱신·DDE 재계산 억제 후 원복
    su = Application.ScreenUpdating
    calc = Application.Calculation
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    On Error Resume Next
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add2 key:=ws.Range("N11:N" & lastRow), Order:=xlDescending
        .SetRange ws.Range("B11:N" & lastRow)   ' A(번호) 제외 → 행 위치=순위 유지
        .Header = xlNo
        .Apply
    End With
    On Error GoTo 0
    Application.Calculation = calc
    Application.ScreenUpdating = su
End Sub

' [Workbook_Open 호출] 업로더 자동시작 (Windows python, win32com → 열린 마스터 연결)
Public Sub StartUploader()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python starstock_uploader.py", vbNormalFocus
End Sub

' P3(전송주기 "1분" 형식) → 분. 실패 시 3분.
Public Function ReadIntervalMinutes() As Long
    Dim n As Long
    On Error Resume Next
    n = val(CStr(ThisWorkbook.Sheets("MASTER").Range("P3").Value))
    On Error GoTo 0
    If n < 1 Then n = 3
    ReadIntervalMinutes = n
End Function

' [반복] 등락률 재정렬 + P3 주기로 자기재예약 (Workbook_Open 에서 최초 호출)
Public Sub ScheduleSort()
    SortByChange
    Dim mins As Long
    mins = ReadIntervalMinutes()
    g_SortTime = Now() + TimeSerial(0, mins, 0)
    On Error Resume Next
    Application.OnTime g_SortTime, "ScheduleSort"
    On Error GoTo 0
End Sub


' [종료 시 좀비 자동정리] 내 PID가 닫은 뒤에도 ~10초 살아있으면(DDE/COM이 붙잡은 좀비) 그 PID만 강제종료.
'   정상 종료면 10초 안에 PID가 사라져 아무것도 안 죽인다. 죽이기 전 아직 EXCEL.EXE 인지 재확인(오살 방지).
Public Sub ArmZombieKiller()
    On Error Resume Next
    Dim pid As Long: pid = GetCurrentProcessId()
    Dim c As String
    c = "cmd /c ping -n 11 127.0.0.1 >nul & " & _
        "tasklist /FI ""PID eq " & pid & """ /FI ""IMAGENAME eq EXCEL.EXE"" | find """ & pid & """ >nul && " & _
        "taskkill /F /PID " & pid
    Shell c, vbHide
    On Error GoTo 0
End Sub
