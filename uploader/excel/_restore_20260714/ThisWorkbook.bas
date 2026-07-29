' 15:30 F→L 복사 예약 시각 (닫을 때 취소용)
Private g_CloseCopyTime As Date

Private Sub Workbook_Open()
    ' [추가] 웹 종목DB 초기화 물어보기 (10초 후 자동 초기화) ? PyControl 모듈
    AskDailyReset

    ' 3초 후 DDE 수식 자동 기입 (B열 끝행까지)
    Application.OnTime Now() + TimeSerial(0, 0, 3), "FillDDEFormulas"

    ' 장마감 15:30 F→L 복사 예약 (파일 열려있으면 자동전송 안 켜도 실행)
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
    ' 15:30 예약 취소 (닫은 뒤 매크로 실행 오류 방지)
    On Error Resume Next
    If g_CloseCopyTime > 0 Then
        Application.OnTime g_CloseCopyTime, "CopyHighToPrevHigh", , False
    End If
    On Error GoTo 0

    ' DDE 삭제 여부 확인 ? 10초 후 선택없으면 자동 [예](삭제)
    Dim ans As Integer
    ans = CreateObject("WScript.Shell").Popup( _
        "DDE 수식(D~G열)을 삭제하고 닫을까요? (10초 후 자동 예)" & vbCrLf & _
        "(삭제하면 다음에 열 때 #N/A 오류가 안 뜹니다)", _
        10, "StarStock 종료", vbYesNoCancel + vbQuestion)
    ' -1=시간초과(예로 처리), 6=예(vbYes), 7=아니오(vbNo), 2=취소(vbCancel)
    If ans = vbCancel Then
        Cancel = True
    ElseIf ans = vbYes Or ans = -1 Then
        ClearDDEFormulas
        ThisWorkbook.Save
    End If
End Sub

