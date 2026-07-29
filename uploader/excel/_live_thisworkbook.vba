' 15:30 F→L 복사 예약 시각 (닫을 때 취소용)
Private g_CloseCopyTime As Date

Private Sub Workbook_Open()
    ' ★열기 중 UI 멈춤 방지: 모든 시작작업을 "열린 뒤"로 예약(동기 팝업 금지) → Excel 먼저 완전히 열림
    ' [1] 시작 안내 + 웹DB 초기화 팝업 (2초 후, PyControl.StartupAsk)
    Application.OnTime Now() + TimeSerial(0, 0, 2), "StartupAsk"

    ' [2] DDE 수식 자동 기입 (5초 후) ? 현재가~저가(D~G) + 등락율(N) 모두 FillDDEFormulas 가 처리
    Application.OnTime Now() + TimeSerial(0, 0, 5), "FillDDEFormulas"

    ' [3] 등락율 재정렬 시작 (14초 후) → 이후 P3(전송주기)마다 자동 반복
    Application.OnTime Now() + TimeSerial(0, 0, 14), "ScheduleSort"

    ' [4] 자동 업로더 시작 (17초 후 ? 마스터 열린 상태에서 win32com 연결)
    Application.OnTime Now() + TimeSerial(0, 0, 17), "StartUploader"

    ' [5] 장마감 15:30 F→L 복사 예약 (파일 열려있으면 자동전송 안 켜도 실행)
    Dim closeTime As Date
    closeTime = DateValue(Now()) + TimeSerial(15, 30, 0)
    If Now() < closeTime Then
        g_CloseCopyTime = closeTime
        On Error Resume Next
        Application.OnTime g_CloseCopyTime, "CopyHighToPrevHigh"
        On Error GoTo 0
    End If
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    ' 15:30 예약 + 재정렬 반복 예약 취소 (닫은 뒤 매크로 실행 오류 방지)
    On Error Resume Next
    If g_CloseCopyTime > 0 Then
        Application.OnTime g_CloseCopyTime, "CopyHighToPrevHigh", , False
    End If
    If g_SortTime > 0 Then
        Application.OnTime g_SortTime, "ScheduleSort", , False
    End If
    On Error GoTo 0

    ' [2026-07-20] 종료 시 팝업 없이 DDE 자동삭제 후 저장.
    '   ★기존 WScript 팝업은 관리자권한 Excel 에서 10초 타임아웃이 안 먹어 무한대기 →
    '     닫기가 멈추고 프로세스가 남는 원인이었음(자동-Enter 백업도 없었음).
    '   → 묻지 않고 항상 DDE(D~G + N등락률) 삭제 후 저장. X 버튼만 눌러도 즉시 깨끗이 닫힘.
    On Error Resume Next
    ClearDDEFormulas
    ' N열(등락률 DDE)도 삭제
    Dim wsN As Worksheet, lastN As Long
    Set wsN = ThisWorkbook.Sheets("MASTER")
    lastN = wsN.Cells(wsN.Rows.count, 2).End(xlUp).Row
    If lastN >= 11 Then wsN.Range("N11:N" & lastN).ClearContents
    ThisWorkbook.Save
    ArmZombieKiller
    On Error GoTo 0
End Sub


