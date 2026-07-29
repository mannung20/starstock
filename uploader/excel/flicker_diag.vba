Option Explicit
'===================================================
' StarStock 깜빡임 진단 로거 (표준 모듈: FlickerDiag)
'  - 목적: DDE 시세셀(D~G 현재가/시가/고가/저가, N 등락율)이
'          언제·몇 개 바뀌는지 1초마다 확인해 파일로 기록.
'  - 이 기록 간격이 실제 화면 깜빡임(2~5초)과 일치하면
'    "DDE 시세 갱신 → 화면 재그리기"가 깜빡임 원인으로 확정됨.
'  - 값을 '읽기만' 하므로 로거 자체는 화면을 깜빡이게 하지 않음.
'  - 장중(09:00~15:30, HTS 연결)에 돌려야 시세 틱이 들어와 의미가 있음.
'
'  [자동]  Auto_Open  → 파일 열면 20초 뒤 자동 기록 시작
'          Auto_Close → 파일 닫으면 자동 기록 중지
'  [수동]  StartFlickerLog / StopFlickerLog (Alt+F8 로도 실행 가능)
'  [로그파일]  uploader\vba_flicker.log  (셀이 바뀔 때만 한 줄 기록)
'===================================================

Private Const MASTER_SHEET As String = "MASTER"
Private Const FIRST_ROW    As Long = 11      ' 데이터 시작행
Private Const MAX_ROW      As Long = 60      ' 감시 상한(상위 후보만)
Private Const POLL_SEC     As Long = 1       ' 폴링 간격(초) — OnTime 최소단위 1초
Private Const AUTO_STOP_SEC As Long = 0      ' 총 기록시간(초) 뒤 자동중지 (0=파일 닫을 때까지)
Private Const AUTO_START_DELAY As Long = 20   ' 파일 열고 몇 초 뒤 자동시작(DDE 붙을 시간)

Private g_Running   As Boolean
Private g_NextTime  As Date
Private g_Prev()    As String   ' 직전 스냅샷 (행 x [D,E,F,G,N])
Private g_StartedAt As Date
Private g_Ticks     As Long

' 로그 경로 = 이 통합문서(마스터) 폴더 \ vba_flicker.log
Private Function LogPath() As String
    LogPath = ThisWorkbook.Path & "\vba_flicker.log"
End Function

Private Sub WriteLog(ByVal line As String)
    Dim f As Integer
    On Error Resume Next
    f = FreeFile
    Open LogPath() For Append As #f
    Print #f, line
    Close #f
    On Error GoTo 0
End Sub

' 감시셀 값을 문자열 배열로 스냅샷 (D=4,E=5,F=6,G=7,N=14)
Private Function Snapshot() As String()
    Dim ws As Worksheet, r As Long, arr() As String, idx As Long
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    ReDim arr(FIRST_ROW To MAX_ROW, 1 To 5)
    On Error Resume Next
    For r = FIRST_ROW To MAX_ROW
        arr(r, 1) = CStr(ws.Cells(r, 4).Value)   ' D 현재가
        arr(r, 2) = CStr(ws.Cells(r, 5).Value)   ' E 시가
        arr(r, 3) = CStr(ws.Cells(r, 6).Value)   ' F 고가
        arr(r, 4) = CStr(ws.Cells(r, 7).Value)   ' G 저가
        arr(r, 5) = CStr(ws.Cells(r, 14).Value)  ' N 등락율
    Next r
    On Error GoTo 0
    Snapshot = arr
End Function

' ── [자동] 파일 열면 실행 (Excel 이 Auto_Open 이름을 자동 호출) ──
Public Sub Auto_Open()
    On Error Resume Next
    Application.OnTime Now() + TimeSerial(0, 0, AUTO_START_DELAY), "StartFlickerLog"
    On Error GoTo 0
End Sub

' ── [자동] 파일 닫으면 실행 (Excel 이 Auto_Close 이름을 자동 호출) ──
Public Sub Auto_Close()
    On Error Resume Next
    StopFlickerLog
    On Error GoTo 0
End Sub

Public Sub StartFlickerLog()
    g_Running = True
    g_StartedAt = Now()
    g_Ticks = 0
    g_Prev = Snapshot()
    WriteLog String(60, "=")
    WriteLog Format(Now(), "yyyy-mm-dd hh:mm:ss") & "  [START] 감시 D11:G" & MAX_ROW & " + N11:N" & MAX_ROW & _
             " · 폴링=" & POLL_SEC & "초 · ScreenUpdating=" & Application.ScreenUpdating & _
             " · Calc=" & Application.Calculation
    g_NextTime = Now() + TimeSerial(0, 0, POLL_SEC)
    On Error Resume Next
    Application.OnTime g_NextTime, "FlickerTick"
    On Error GoTo 0
End Sub

Public Sub FlickerTick()
    If Not g_Running Then Exit Sub
    Dim cur() As String, r As Long, c As Long, changed As Long, detail As String
    cur = Snapshot()
    changed = 0: detail = ""
    For r = FIRST_ROW To MAX_ROW
        For c = 1 To 5
            If cur(r, c) <> g_Prev(r, c) Then
                changed = changed + 1
                If Len(detail) < 80 Then _
                    detail = detail & "r" & r & "c" & Choose(c, "D", "E", "F", "G", "N") & " "
            End If
        Next c
    Next r
    g_Ticks = g_Ticks + 1

    ' 변화가 있을 때만 기록 (= 화면 재그리기가 유발되는 순간)
    If changed > 0 Then
        WriteLog Format(Now(), "hh:mm:ss") & "  변경셀=" & changed & _
                 " · ScreenUpdating=" & Application.ScreenUpdating & _
                 " · 예: " & Trim(detail)
    End If
    g_Prev = cur

    ' 자동 중지 체크
    If AUTO_STOP_SEC > 0 Then
        If DateDiff("s", g_StartedAt, Now()) >= AUTO_STOP_SEC Then
            StopFlickerLog
            Exit Sub
        End If
    End If

    ' 다음 폴링 재예약
    g_NextTime = Now() + TimeSerial(0, 0, POLL_SEC)
    On Error Resume Next
    Application.OnTime g_NextTime, "FlickerTick"
    On Error GoTo 0
End Sub

Public Sub StopFlickerLog()
    g_Running = False
    On Error Resume Next
    Application.OnTime g_NextTime, "FlickerTick", , False
    On Error GoTo 0
    WriteLog Format(Now(), "yyyy-mm-dd hh:mm:ss") & "  [STOP] 총폴링=" & g_Ticks & "회 · 경과=" & _
             DateDiff("s", g_StartedAt, Now()) & "초"
    WriteLog String(60, "=")
End Sub
