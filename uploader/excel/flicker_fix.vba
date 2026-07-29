Option Explicit
'===================================================
' FlickerFix - 깜빡임 완화: 수동계산 + 주기적 화면갱신 (방법 1)
'  [원인] DDE 시세 틱마다 자동재계산 -> 전폭 조건부서식(A11:M110) 재도색 -> 랜덤 다발 깜빡임
'  [해결] 계산모드를 수동으로 두고 REFRESH_SECS 주기로만 Application.Calculate
'         -> 랜덤 다발 -> 규칙적 1회 갱신으로 안정화
'  [시작] Workbook_Open 이 ArmManualRefresh 호출 -> startup 완료(ARM_DELAY_SEC 후) StartManualRefresh
'         ※ 수동계산은 startup 완료 후에만: DDEHelper.EnsureDDEReady(#N/A 해소)는 자동계산 필요
'  [종료] Workbook_BeforeClose 가 StopManualRefresh (예약취소 + 자동계산 원복, 반드시 저장 전)
'  로그: uploader\vba_dde.log (DDEHelper.DdeLog 공유)
'===================================================
Private Const REFRESH_SECS  As Long = 2    ' 화면갱신 주기(초). 더 부드럽게=1, 더 차분=3 으로 조절
Private Const ARM_DELAY_SEC As Long = 40    ' 열고 나서 startup(DDE준비~정렬~업로더) 완료 대기(초)
Public g_RefreshTime As Date               ' 다음 갱신 예약시각(닫을 때 취소용, 모듈최상단 필수)
Public g_ArmTime     As Date               ' StartManualRefresh 예약시각(닫을 때 취소용)

' [Workbook_Open 호출] startup 완료 뒤 수동계산+주기갱신 시작을 예약만 함(즉시반환)
Public Sub ArmManualRefresh()
    On Error Resume Next
    g_ArmTime = Now() + TimeSerial(0, 0, ARM_DELAY_SEC)
    Application.OnTime g_ArmTime, "StartManualRefresh"
    On Error GoTo 0
End Sub

' [예약 콜백] 수동계산 전환 + 주기 갱신 타이머 시작
Public Sub StartManualRefresh()
    On Error Resume Next
    Application.Calculation = xlCalculationManual
    DdeLog "[FlickerFix] 수동계산 전환 - 화면갱신 " & REFRESH_SECS & "초 주기 시작"
    ScheduleRefresh
    On Error GoTo 0
End Sub

' [내부] 다음 갱신 1회 예약(자기재예약용)
Private Sub ScheduleRefresh()
    On Error Resume Next
    g_RefreshTime = Now() + TimeSerial(0, 0, REFRESH_SECS)
    Application.OnTime g_RefreshTime, "RefreshTick"
    On Error GoTo 0
End Sub

' [반복 콜백] 이 순간에만 1회 재계산(DDE 시세 + 조건부서식 갱신) 후 자기재예약
Public Sub RefreshTick()
    On Error Resume Next
    Application.Calculate
    On Error GoTo 0
    ScheduleRefresh
End Sub

' [Workbook_BeforeClose 호출] 예약 취소 + 자동계산 원복 (반드시 ThisWorkbook.Save 전에)
'  ★자동계산 원복 필수: 수동으로 저장되면 다음 열기때 EnsureDDEReady(#N/A 해소)가 안 돎
Public Sub StopManualRefresh()
    On Error Resume Next
    If g_ArmTime > 0 Then Application.OnTime g_ArmTime, "StartManualRefresh", , False
    If g_RefreshTime > 0 Then Application.OnTime g_RefreshTime, "RefreshTick", , False
    Application.Calculation = xlCalculationAutomatic
    DdeLog "[FlickerFix] 갱신 예약 취소 - 자동계산 원복"
    On Error GoTo 0
End Sub
