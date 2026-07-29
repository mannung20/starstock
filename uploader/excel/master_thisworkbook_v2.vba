' 15:30 F→L 복사 예약 시각 (닫을 때 취소용)
Private g_CloseCopyTime As Date

Private Sub Workbook_Open()
    ' 열기 중 멈춤 방지: 시작작업을 "열린 뒤"로 예약
    ' [1] 시작 안내 + 웹DB 초기화 팝업 (2초 후)
    Application.OnTime Now() + TimeSerial(0, 0, 2), "StartupAsk"

    ' [2] DDE 기입 → 준비확인(#N/A 재요청) → 정렬 → 업로더 를 순차 실행 (5초 후)
    '     기존 고정지연(+14 정렬 / +17 업로더) 대신, DDE 준비 확인 후 진행 (DDEHelper.StartDDEThenSort)
    Application.OnTime Now() + TimeSerial(0, 0, 5), "StartDDEThenSort"

    ' [2.5] 깜빡임 완화(FlickerFix): startup 완료 뒤 수동계산+주기갱신 시작 예약
    ArmManualRefresh

    ' [3] 장마감 15:30 F→L 복사 예약 (LS만 실행 / 키움은 CloseCopyIfLS 가 건너뜀)
    Dim closeTime As Date
    closeTime = DateValue(Now()) + TimeSerial(15, 30, 0)
    If Now() < closeTime Then
        g_CloseCopyTime = closeTime
        On Error Resume Next
        Application.OnTime g_CloseCopyTime, "CloseCopyIfLS"
        On Error GoTo 0
    End If
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    ' 15:30 예약 + 재정렬 반복 예약 취소 (닫은 뒤 매크로 실행 오류 방지)
    On Error Resume Next
    If g_CloseCopyTime > 0 Then
        Application.OnTime g_CloseCopyTime, "CloseCopyIfLS", , False
    End If
    If g_SortTime > 0 Then
        Application.OnTime g_SortTime, "ScheduleSort", , False
    End If
    CancelMarketSort          ' 장중 정렬 반복 예약 취소(DDEHelper)
    StopManualRefresh         ' 깜빡임 완화 예약취소 + 자동계산 원복(FlickerFix, 저장 전 필수)
    On Error GoTo 0

    ' 종료 시 팝업 없이 DDE(D~G + N등락률) 삭제 후 저장 → 다음에 열 때 #N/A 잔상/무한대기 방지
    On Error Resume Next
    ClearDDEFormulas
    Dim wsN As Worksheet, lastN As Long
    Set wsN = ThisWorkbook.Sheets("MASTER")
    lastN = wsN.Cells(wsN.Rows.count, 2).End(xlUp).Row
    If lastN >= 11 Then wsN.Range("N11:N" & lastN).ClearContents
    ThisWorkbook.Save
    ArmZombieKiller
    On Error GoTo 0
End Sub
