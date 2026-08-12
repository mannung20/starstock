Option Explicit

'===================================================
' StarStock Module1 - 자동 업로드 VBA
' 레이아웃: 10행=헤더, 11~20행=데이터(종목1~10)
' 권장: starstock_uploader.py (Python) 사용
' 이 VBA는 Python 없을 때 비상용 / 보조용
'===================================================

Private Const API_URL As String = "https://starstock.vercel.app/api/upload-stocks"
Private Const MASTER_SHEET As String = "MASTER"
Private Const STATUS_CELL As String = "P1"
Private Const TIME_CELL As String = "P2"
Private Const INTERVAL_CELL As String = "P3"
Private Const DATA_START_ROW As Integer = 11
Private Const DATA_END_ROW As Integer = 110  ' 최대 100종목

Private m_Running As Boolean
Private m_NextTime As Date

' ─────────────────────────────
' [공개] 자동 전송 시작
' ─────────────────────────────
Public Sub StartAutoUpload()
    If m_Running Then
        MsgBox "이미 자동 전송이 실행 중입니다.", vbInformation, "StarStock"
        Exit Sub
    End If
    m_Running = True
    SetStatus "자동전송중"
    ScheduleNext

    ' 15:30 장마감 자동 처리 예약 (아직 지나지 않은 경우에만)
    Dim closeTime As Date
    closeTime = DateValue(Now()) + TimeSerial(15, 30, 0)
    If Now() < closeTime Then
        Application.OnTime closeTime, "CopyHighToPrevHigh"
    End If
End Sub

' ─────────────────────────────
' [공개] 자동 전송 중지
' ─────────────────────────────
Public Sub StopAutoUpload()
    m_Running = False
    On Error Resume Next
    Application.OnTime m_NextTime, "AutoUploadTick", , False
    On Error GoTo 0
    SetStatus "전송중지"
End Sub

' ─────────────────────────────
' [공개] 즉시 전송 (1회)
' ─────────────────────────────
Public Sub SendDataNow()
    UploadToAPI
End Sub

' ─────────────────────────────
' [내부] 타이머 콜백
' ─────────────────────────────
Public Sub AutoUploadTick()
    If Not m_Running Then Exit Sub
    UploadToAPI
    ScheduleNext
End Sub

' ─────────────────────────────
' [내부] 다음 전송 스케줄
' ─────────────────────────────
Private Sub ScheduleNext()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    Dim txt As String
    txt = CStr(ws.Range(INTERVAL_CELL).Value)
    Dim mins As Integer
    Select Case txt
        Case "1분":  mins = 1
        Case "3분":  mins = 3
        Case "5분":  mins = 5
        Case "10분": mins = 10
        Case "30분": mins = 30
        Case Else:   mins = 5
    End Select
    m_NextTime = Now() + TimeSerial(0, mins, 0)
    Application.OnTime m_NextTime, "AutoUploadTick"
End Sub

' ─────────────────────────────
' [내부] 상태 셀 갱신
' ─────────────────────────────
Private Sub SetStatus(txt As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    ws.Range(STATUS_CELL).Value = "[" & txt & "]"
    ws.Range(TIME_CELL).Value = Format(Now(), "hh:mm:ss")
End Sub

' ─────────────────────────────
' [내부] API 전송 (MSXML2 HTTP)
' ─────────────────────────────
Private Sub UploadToAPI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)

    Dim token As String
    token = ReadTokenFromConfig()
    If token = "" Then
        SetStatus "토큰없음"
        MsgBox "config.json 에 upload_token 을 설정하세요." & Chr(13) & _
               "경로: " & ThisWorkbook.Path & "\config.json", vbExclamation, "StarStock"
        Exit Sub
    End If

    ' 11~20행 데이터 수집 (종목 1~10)
    Dim stockParts() As String
    ReDim stockParts(0 To 9)
    Dim cnt As Integer
    cnt = 0

    Dim i As Integer
    For i = DATA_START_ROW To DATA_END_ROW
        Dim code As String
        code = Trim(CStr(ws.Cells(i, 2).Value))
        If Len(code) <> 6 Then GoTo SkipRow
        If Not IsNumeric(code) Then GoTo SkipRow

        Dim price As Long
        On Error Resume Next
        price = CLng(ws.Cells(i, 4).Value)
        Dim errNum As Long
        errNum = Err.Number
        On Error GoTo 0
        If errNum <> 0 Or price <= 0 Then GoTo SkipRow

        Dim rankNum As Integer
        rankNum = i - DATA_START_ROW + 1   ' 11행=1, 12행=2, ... 20행=10

        Dim q As String
        q = Chr(34)
        stockParts(cnt) = "{" & _
            q & "rank" & q & ":" & rankNum & "," & _
            q & "stock_code" & q & ":" & q & code & q & "," & _
            q & "stock_name" & q & ":" & q & EscJ(ws.Cells(i, 3).Value) & q & "," & _
            q & "current_price" & q & ":" & CLng(ws.Cells(i, 4).Value) & "," & _
            q & "open_price" & q & ":" & SafeLng(ws.Cells(i, 5).Value) & "," & _
            q & "high_price" & q & ":" & SafeLng(ws.Cells(i, 6).Value) & "," & _
            q & "low_price" & q & ":" & SafeLng(ws.Cells(i, 7).Value) & "," & _
            q & "target_price" & q & ":" & SafeLng(ws.Cells(i, 8).Value) & "," & _
            q & "stop_price" & q & ":" & SafeLng(ws.Cells(i, 9).Value) & "," & _
            q & "status" & q & ":" & q & ToStatusCode(ws.Cells(i, 10).Value) & q & "," & _
            q & "memo" & q & ":" & q & EscJ(ws.Cells(i, 11).Value) & q & _
            "}"
        cnt = cnt + 1
SkipRow:
    Next i

    If cnt = 0 Then
        SetStatus "종목없음"
        MsgBox "전송 가능한 종목이 없습니다." & Chr(13) & _
               "종목코드(6자리 숫자)와 현재가를 확인하세요.", vbExclamation, "StarStock"
        Exit Sub
    End If

    Dim joined As String
    Dim k As Integer
    For k = 0 To cnt - 1
        If k > 0 Then joined = joined & ","
        joined = joined & stockParts(k)
    Next k

    ' UTC 타임스탬프 (KST - 9h)
    Dim utcNow As String
    utcNow = Format(Now() - TimeSerial(9, 0, 0), "yyyy-mm-ddThh:mm:ss") & "Z"

    Dim q2 As String
    q2 = Chr(34)
    Dim body As String
    body = "{" & q2 & "timestamp" & q2 & ":" & q2 & utcNow & q2 & "," & _
           q2 & "stocks" & q2 & ":[" & joined & "]}"

    ' HTTP 전송 (최대 3회 재시도)
    Dim attempt As Integer
    For attempt = 1 To 3
        Dim http As Object
        Set http = CreateObject("MSXML2.XMLHTTP60")
        On Error Resume Next
        http.Open "POST", API_URL, False
        http.setRequestHeader "Content-Type", "application/json"
        http.setRequestHeader "X-Upload-Token", token
        http.send body
        Dim sendErr As Long
        sendErr = Err.Number
        On Error GoTo 0

        If sendErr <> 0 Then
            SetStatus "연결오류"
        ElseIf http.Status = 200 Then
            SetStatus "연동중-OK"
            Exit For
        ElseIf http.Status = 401 Then
            SetStatus "토큰오류(401)"
            m_Running = False
            MsgBox "인증 실패(401): upload_token 을 확인하세요.", vbCritical, "StarStock"
            Exit For
        ElseIf http.Status = 408 Then
            SetStatus "시각오류(408)"
            MsgBox "타임스탬프 오류(408): PC 시각을 확인하세요.", vbExclamation, "StarStock"
            Exit For
        Else
            SetStatus "서버오류(" & http.Status & ")"
        End If

        If attempt < 3 Then Application.Wait Now() + TimeSerial(0, 0, 5)
    Next attempt
End Sub

' ─────────────────────────────
' [내부] config.json 에서 upload_token 파싱
' ─────────────────────────────
Private Function ReadTokenFromConfig() As String
    Dim cfgPath As String
    cfgPath = ThisWorkbook.Path & "\config.json"
    If Dir(cfgPath) = "" Then ReadTokenFromConfig = "": Exit Function

    Dim fNum As Integer
    fNum = FreeFile
    Dim txt As String
    Open cfgPath For Input As #fNum
    txt = Input(LOF(fNum), fNum)
    Close #fNum

    Dim key As String
    key = Chr(34) & "upload_token" & Chr(34) & ":"
    Dim p As Long
    p = InStr(txt, key)
    If p = 0 Then ReadTokenFromConfig = "": Exit Function
    p = p + Len(key)

    Do While p <= Len(txt) And (Mid(txt, p, 1) = " " Or Mid(txt, p, 1) = Chr(9))
        p = p + 1
    Loop
    If Mid(txt, p, 1) = Chr(34) Then p = p + 1

    Dim endP As Long
    endP = InStr(p, txt, Chr(34))
    If endP = 0 Then ReadTokenFromConfig = "": Exit Function
    ReadTokenFromConfig = Mid(txt, p, endP - p)
End Function

' ─────────────────────────────
' [내부] 추천상태 → API 코드
' ─────────────────────────────
Private Function ToStatusCode(s As Variant) As String
    Select Case CStr(s)
        Case "매수적기": ToStatusCode = "buy"
        Case "손절조심": ToStatusCode = "sell"
        Case Else:       ToStatusCode = "hold"
    End Select
End Function

Private Function SafeLng(v As Variant) As Long
    On Error Resume Next
    SafeLng = CLng(v)
    If Err.Number <> 0 Then SafeLng = 0
    On Error GoTo 0
End Function

Private Function EscJ(v As Variant) As String
    Dim s As String
    s = CStr(v)
    s = Replace(s, "\", "\\")
    s = Replace(s, Chr(34), "\" & Chr(34))
    s = Replace(s, Chr(10), "\n")
    s = Replace(s, Chr(13), "")
    EscJ = s
End Function

' ─────────────────────────────
' [공개] 장마감 처리: F열(당일고가) → L열(전일고가) 복사
' 15:30 자동 실행 또는 수동 호출 가능
' DDE 수식을 정적 값으로 덮어써서 다음 날 HTS 미연결 시에도 참조 가능
' ─────────────────────────────
Public Sub CopyHighToPrevHigh()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)

    Dim count As Integer
    count = 0

    Dim i As Integer
    For i = DATA_START_ROW To DATA_END_ROW
        Dim code As String
        code = Trim(CStr(ws.Cells(i, 2).Value))
        If Len(code) <> 6 Or Not IsNumeric(code) Then GoTo NextRowC

        Dim highVal As Long
        On Error Resume Next
        highVal = CLng(ws.Cells(i, 6).Value)   ' F열: 당일고가
        Dim errC As Long
        errC = Err.Number
        On Error GoTo 0
        If errC <> 0 Or highVal <= 0 Then GoTo NextRowC

        ws.Cells(i, 12).Value = highVal         ' L열: 전일고가 (정적 값으로 덮어쓰기)
        count = count + 1
NextRowC:
    Next i

    SetStatus "장마감완료(" & count & "종목)"
End Sub

' ─────────────────────────────
' [공개] eBest DDE 수식 자동 기입
' Workbook_Open 3초 후 자동 실행 또는 수동 호출 가능
' B열 종목코드 기준으로 D·E·F·G·L열 수식 삽입
' 형식: =EtkDS|eds!'STOCK.[종목코드];[항목명]'
' ─────────────────────────────
Public Sub FillDDEFormulas()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)

    ' N열(등락율) 헤더 ? D~G와 함께 관리
    ws.Range("N10").Value = "등락률"

    Dim filled As Integer
    filled = 0

    Dim i As Integer
    For i = DATA_START_ROW To DATA_END_ROW
        Dim code As String
        code = Trim(CStr(ws.Cells(i, 2).Value))

        ' 종목코드 유효성: 6자리 숫자
        If Len(code) <> 6 Or Not IsNumeric(code) Then GoTo NextRow

        ' eBest HTS DDE 수식 삽입 (D·E·F·G 현재가~저가 + N 등락율)
        ' L열(전일고가)은 DDE 미지원 → 장마감 15:30에 F열 값 복사로 관리
        ' 셀별로 수식이 없을 때만 기입(기존 DDE 보존) → N열도 D~G와 동일하게 자동 채움
        Dim base As String
        base = "=EtkDS|eds!'STOCK." & code & ";"
        If Not ws.Cells(i, 4).HasFormula Then ws.Cells(i, 4).Formula = base & "현재가'"
        If Not ws.Cells(i, 5).HasFormula Then ws.Cells(i, 5).Formula = base & "시가'"
        If Not ws.Cells(i, 6).HasFormula Then ws.Cells(i, 6).Formula = base & "고가'"
        If Not ws.Cells(i, 7).HasFormula Then ws.Cells(i, 7).Formula = base & "저가'"
        If Not ws.Cells(i, 14).HasFormula Then ws.Cells(i, 14).Formula = base & "등락율'"

        filled = filled + 1
NextRow:
    Next i

    If filled > 0 Then
        SetStatus "DDE기입완료(" & filled & "종목)"
    End If
End Sub

' ─────────────────────────────
' [공개] eBest DDE 수식 제거 ? 종료(Workbook_BeforeClose) 시 호출
' D~G(현재가~저가) + M(매수기준가) + N(등락율) DDE/수식 삭제 → 다음에 열 때 #N/A 방지
' ※ ThisWorkbook 에서 호출하나 정의가 없어 '정의되지 않음' 오류 발생하던 것을 정의 추가
' ※ 수식이 있는 셀만 삭제(정적으로 입력된 값은 보존)
' ─────────────────────────────
Public Sub ClearDDEFormulas()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)

    Dim cleared As Integer
    cleared = 0

    Dim i As Integer
    For i = DATA_START_ROW To DATA_END_ROW
        ' D~G(현재가~저가) DDE 수식 삭제
        If ws.Cells(i, 4).HasFormula Then
            ws.Range(ws.Cells(i, 4), ws.Cells(i, 7)).ClearContents
            cleared = cleared + 1
        End If
        ' M(매수기준가) 수식 삭제 (#N/A 참조 방지)
        If ws.Cells(i, 13).HasFormula Then
            ws.Cells(i, 13).ClearContents
        End If
        ' N(등락율) DDE 수식 삭제
        If ws.Cells(i, 14).HasFormula Then
            ws.Cells(i, 14).ClearContents
        End If
        ' L(전일고가) DDE 수식 삭제 (키움 모드에서 기입됨, 정적값은 보존)
        If ws.Cells(i, 12).HasFormula Then
            ws.Cells(i, 12).ClearContents
        End If
        ' J(추천상태) 텍스트 삭제 (매수적기/관망유지 등 - 닫을 때 초기화)
        If ws.Cells(i, 10).Value <> "" Then
            ws.Cells(i, 10).ClearContents
        End If
    Next i

    If cleared > 0 Then
        SetStatus "DDE삭제완료(" & cleared & "종목)"
    End If
End Sub


