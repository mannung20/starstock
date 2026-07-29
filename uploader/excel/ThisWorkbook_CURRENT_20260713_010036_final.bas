' 15:30 F→L 복사 예약 시각 (닫을 때 취소용)
Private g_CloseCopyTime As Date

Private Sub Workbook_Open()
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

    ' DDE 삭제 여부 확인
    Dim ans As VbMsgBoxResult
    ans = MsgBox("DDE 수식(D~G열)을 삭제하고 닫을까요?" & vbCrLf & _
                 "(삭제하면 다음에 열 때 #N/A 오류가 안 뜹니다)", _
                 vbQuestion + vbYesNoCancel + vbDefaultButton1, "StarStock 종료")
    If ans = vbCancel Then
        Cancel = True
    ElseIf ans = vbYes Then
        ClearDDEFormulas
        ThisWorkbook.Save
    End If
End Sub
