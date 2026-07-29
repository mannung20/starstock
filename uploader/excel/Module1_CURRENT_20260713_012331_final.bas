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
    On Error GoTo EH
    LogMsg "▶ [자동전송시작] StartAutoUpload 실행"
    If m_Running Then
        LogMsg "  - 이미 실행 중 → 무시"
        MsgBox "이미 자동 전송이 실행 중입니다.", vbInformation, "StarStock"
        Exit Sub
    End If
    m_Running = True
    SetStatus "자동전송중"
    ScheduleNext

    ' 15:30 장마감 F→L 복사는 Workbook_Open 에서 예약됨(파일 열려있으면 항상) → 중복 제외
    LogMsg "■ [자동전송시작] 정상 종료"
    Exit Sub
EH:
    LogMsg "✖ [자동전송시작] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "자동전송시작 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub

' ─────────────────────────────
' [공개] 자동 전송 중지
' ─────────────────────────────
Public Sub StopAutoUpload()
    LogMsg "▶ [자동전송중지] StopAutoUpload 실행"
    m_Running = False
    On Error Resume Next
    Application.OnTime m_NextTime, "AutoUploadTick", , False
    On Error GoTo 0
    SetStatus "전송중지"
    LogMsg "■ [자동전송중지] 정상 종료"
End Sub

' ─────────────────────────────
' [공개] 즉시 전송 (1회)
' ─────────────────────────────
Public Sub SendDataNow()
    On Error GoTo EH
    LogMsg "▶ [즉시전송] SendDataNow 시작"

    ' ── 단순 업로드 안내 (주력은 Python starstock_uploader.py) ──
    Dim ans As VbMsgBoxResult
    ans = MsgBox( _
        "이 [즉시전송]은 단순 보조 업로드입니다." & vbCrLf & vbCrLf & _
        "● 주력 업로더: Python (starstock_uploader.py)" & vbCrLf & _
        "   - 돌파(breakout) 감지 등 자동 전략 포함" & vbCrLf & _
        "   - 실운영/자동 전송은 Python 권장" & vbCrLf & vbCrLf & _
        "● 이 즉시전송(VBA)은" & vbCrLf & _
        "   돌파 판단 없이 현재 엑셀 값을 그대로 1회 전송합니다." & vbCrLf & _
        "   (테스트·수동 보조용)" & vbCrLf & vbCrLf & _
        "지금 단순 업로드를 진행할까요?", _
        vbQuestion + vbYesNo + vbDefaultButton1, "StarStock 업로드 안내")

    If ans <> vbYes Then
        LogMsg "  - 사용자 취소 (단순 업로드 안내창)"
        SetStatus "전송취소"
        Exit Sub
    End If

    UploadToAPI
    LogMsg "■ [즉시전송] SendDataNow 정상 종료"
    Exit Sub
EH:
    LogMsg "✖ [즉시전송] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "즉시전송 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub

' ─────────────────────────────
' [내부] 타이머 콜백
' ─────────────────────────────
Public Sub AutoUploadTick()
    On Error GoTo EH
    If Not m_Running Then Exit Sub
    LogMsg "▶ [타이머] AutoUploadTick 실행"
    UploadToAPI
    ScheduleNext
    LogMsg "■ [타이머] AutoUploadTick 정상 종료"
    Exit Sub
EH:
    LogMsg "✖ [타이머] 오류 " & Err.Number & ": " & Err.Description
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
' [내부] 로그 출력 (VBA 편집기 직접 실행 창 = Immediate Window, Ctrl+G)
' Debug.Print 로 실행 흐름/오류를 로그창에 표시
' ─────────────────────────────
Private Sub LogMsg(msg As String)
    Debug.Print Format(Now(), "hh:mm:ss") & " | " & msg
End Sub

' ─────────────────────────────
' [내부] 상태 셀 갱신 (+ 로그창 기록)
' ─────────────────────────────
Private Sub SetStatus(txt As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    ws.Range(STATUS_CELL).Value = "[" & txt & "]"
    ws.Range(TIME_CELL).Value = Format(Now(), "hh:mm:ss")
    LogMsg "상태 → " & txt
End Sub

' ─────────────────────────────
' [내부] API 전송 (MSXML2 HTTP)
' ─────────────────────────────
Private Sub UploadToAPI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    LogMsg "  · UploadToAPI 진입 (토큰 확인/데이터 수집 시작)"

    Dim token As String
    token = ReadTokenFromConfig()
    If token = "" Then
        SetStatus "토큰없음"
        MsgBox "config.json 에 upload_token 을 설정하세요." & Chr(13) & _
               "경로: " & ThisWorkbook.Path & "\config.json", vbExclamation, "StarStock"
        Exit Sub
    End If

    ' rank 1~10 슬롯 전체 처리 (웹이 엑셀과 정확히 일치하도록)
    '  - 6자리코드 + 현재가>0         : 전체 데이터 전송(표시)
    '  - 코드 없음/6자리 아님(빈 슬롯) : 숨김 마커 {"rank":r,"stock_code":""} → 웹에서 제거
    '  - 6자리코드 + 현재가 #N/A/0     : 건너뜀(기존값 유지 → DDE 일시끊김 깜빡임 방지)
    Dim stockParts(0 To 9) As String
    Dim cnt As Integer          ' 전송 항목 수(표시+숨김)
    Dim visCnt As Integer       ' 표시 종목 수
    cnt = 0
    visCnt = 0

    Dim q As String
    q = Chr(34)

    Dim r As Integer
    For r = 1 To 10
        Dim rowNum As Long
        rowNum = DATA_START_ROW + r - 1     ' rank r → 행(11..20)
        Dim code As String
        code = Trim(CStr(ws.Cells(rowNum, 2).Value))

        If Len(code) <> 6 Or Not IsNumeric(code) Then
            ' 빈 슬롯/무효 코드 → 숨김 마커 (웹에서 해당 rank 제거)
            stockParts(cnt) = "{" & q & "rank" & q & ":" & r & "," & _
                              q & "stock_code" & q & ":" & q & q & "}"
            cnt = cnt + 1
        Else
            Dim price As Long
            On Error Resume Next
            price = CLng(ws.Cells(rowNum, 4).Value)
            Dim errNum As Long
            errNum = Err.Number
            On Error GoTo 0
            If errNum <> 0 Or price <= 0 Then
                ' 코드는 유효하나 현재가 #N/A/0 → 건너뜀(기존값 유지)
                LogMsg "  · rank " & r & " (" & code & ") 현재가 무효 → 건너뜀(유지)"
            Else
                stockParts(cnt) = "{" & _
                    q & "rank" & q & ":" & r & "," & _
                    q & "stock_code" & q & ":" & q & code & q & "," & _
                    q & "stock_name" & q & ":" & q & EscJ(ws.Cells(rowNum, 3).Value) & q & "," & _
                    q & "current_price" & q & ":" & price & "," & _
                    q & "open_price" & q & ":" & SafeLng(ws.Cells(rowNum, 5).Value) & "," & _
                    q & "high_price" & q & ":" & SafeLng(ws.Cells(rowNum, 6).Value) & "," & _
                    q & "low_price" & q & ":" & SafeLng(ws.Cells(rowNum, 7).Value) & "," & _
                    q & "target_price" & q & ":" & SafeLng(ws.Cells(rowNum, 8).Value) & "," & _
                    q & "stop_price" & q & ":" & SafeLng(ws.Cells(rowNum, 9).Value) & "," & _
                    q & "status" & q & ":" & q & ToStatusCode(ws.Cells(rowNum, 10).Value) & q & "," & _
                    q & "memo" & q & ":" & q & EscJ(ws.Cells(rowNum, 11).Value) & q & _
                    "}"
                cnt = cnt + 1
                visCnt = visCnt + 1
            End If
        End If
    Next r

    LogMsg "  · 전송 항목 " & cnt & "건 (표시 " & visCnt & " / 숨김 " & (cnt - visCnt) & ")"
    If cnt = 0 Then
        SetStatus "표시없음"
        MsgBox "전송할 슬롯이 없습니다(모든 종목 현재가 무효)." & Chr(13) & _
               "HTS(DDE) 연결과 현재가를 확인하세요.", vbExclamation, "StarStock"
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
    LogMsg "  · HTTP 전송 시작 (본문 " & Len(body) & "바이트) → " & API_URL
    Dim attempt As Integer
    For attempt = 1 To 3
        LogMsg "  · HTTP 시도 " & attempt & "/3"
        Dim http As Object
        Set http = CreateHTTP()
        If http Is Nothing Then
            SetStatus "HTTP객체오류"
            MsgBox "HTTP 통신 객체를 만들 수 없습니다(MSXML 미설치/미등록)." & Chr(13) & _
                   "Windows 업데이트 또는 MSXML 재등록이 필요할 수 있습니다.", vbCritical, "StarStock"
            Exit Sub
        End If
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
' [내부] HTTP 통신 객체 생성 (환경별 ProgID 폴백)
' MSXML2.XMLHTTP60(잘못된 ProgID) → 런타임오류 429 방지
' 등록된 정식 ProgID를 순서대로 시도
' ─────────────────────────────
Private Function CreateHTTP() As Object
    On Error Resume Next
    Set CreateHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.XMLHTTP.6.0")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.ServerXMLHTTP")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.XMLHTTP")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("Microsoft.XMLHTTP")
    On Error GoTo 0
End Function

' ─────────────────────────────
' [내부] config.json 에서 upload_token 파싱
' ─────────────────────────────
Private Function ReadTokenFromConfig() As String
    ReadTokenFromConfig = ReadConfigValue("upload_token")
End Function

' ─────────────────────────────
' [내부] config.json 범용 값 파서 (UTF-8 안전, JSON 백슬래시 해제)
' ─────────────────────────────
Private Function ReadConfigValue(key As String) As String
    Dim cfgPath As String
    cfgPath = ThisWorkbook.Path & "\config.json"
    If Dir(cfgPath) = "" Then ReadConfigValue = "": Exit Function

    Dim txt As String
    Dim stream As Object
    On Error Resume Next
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2                 ' adTypeText
    stream.Charset = "utf-8"
    stream.Open
    stream.LoadFromFile cfgPath
    txt = stream.ReadText(-1)       ' adReadAll
    stream.Close
    If Err.Number <> 0 Then
        On Error GoTo 0
        ReadConfigValue = ""
        Exit Function
    End If
    On Error GoTo 0

    Dim k As String
    k = Chr(34) & key & Chr(34) & ":"
    Dim p As Long
    p = InStr(txt, k)
    If p = 0 Then ReadConfigValue = "": Exit Function
    p = p + Len(k)

    Do While p <= Len(txt) And (Mid(txt, p, 1) = " " Or Mid(txt, p, 1) = Chr(9))
        p = p + 1
    Loop
    If Mid(txt, p, 1) = Chr(34) Then p = p + 1

    Dim endP As Long
    endP = InStr(p, txt, Chr(34))
    If endP = 0 Then ReadConfigValue = "": Exit Function
    Dim val As String
    val = Mid(txt, p, endP - p)
    val = Replace(val, "\\", "\")   ' JSON 이스케이프 해제 (경로 백슬래시)
    ReadConfigValue = val
End Function

' ─────────────────────────────
' [내부] python 실행 경로 (config.json python_path, 없으면 "python")
' ─────────────────────────────
Private Function PythonPath() As String
    Dim p As String
    p = ReadConfigValue("python_path")
    If p = "" Then p = "python"
    PythonPath = p
End Function

' ═══════════════════════════════════════════════
' Python 업로더 연동(주력) + DDE/UI 컨트롤
' ═══════════════════════════════════════════════

' [공개] Python 즉시전송 1회 (--once, 콘솔창 표시)
Public Sub PySendOnce()
    On Error GoTo EH
    LogMsg "▶ [Python즉시전송] --once 실행"
    SetStatus "Python전송중"
    Dim cmd As String
    cmd = "cmd.exe /c cd /d """ & ThisWorkbook.Path & """ && """ & PythonPath() & _
          """ starstock_uploader.py --once & echo. & pause"
    Shell cmd, vbNormalFocus
    LogMsg "■ [Python즉시전송] 콘솔창에서 결과 확인"
    Exit Sub
EH:
    LogMsg "✖ [Python즉시전송] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "Python 즉시전송 실행 오류: " & Err.Description, vbCritical, "StarStock"
End Sub

' [공개] Python 자동전송 체크박스 토글 (ON=시작 / OFF=중지)
Public Sub PyAutoToggle()
    On Error GoTo EH
    Dim cb As CheckBox
    Set cb = ThisWorkbook.Sheets(MASTER_SHEET).CheckBoxes(Application.Caller)
    If cb.Value = xlOn Then
        PyAutoStart
    Else
        PyAutoStop
    End If
    Exit Sub
EH:
    LogMsg "✖ [Python자동] 오류 " & Err.Number & ": " & Err.Description
End Sub

' [공개] Python 자동전송 시작 (백그라운드 최소화, stop.flag 제거)
Public Sub PyAutoStart()
    On Error GoTo EH
    LogMsg "▶ [Python자동전송] 시작"
    Dim flag As String
    flag = ThisWorkbook.Path & "\stop.flag"
    If Dir(flag) <> "" Then Kill flag
    SetStatus "Python자동전송중"
    Dim cmd As String
    cmd = "cmd.exe /c cd /d """ & ThisWorkbook.Path & """ && """ & PythonPath() & _
          """ starstock_uploader.py"
    Shell cmd, vbMinimizedNoFocus
    LogMsg "■ [Python자동전송] 백그라운드(최소화) 시작"
    Exit Sub
EH:
    LogMsg "✖ [Python자동전송시작] 오류 " & Err.Number & ": " & Err.Description
End Sub

' [공개] Python 자동전송 중지 (stop.flag 생성 → 루프 안전 종료)
Public Sub PyAutoStop()
    On Error GoTo EH
    LogMsg "▶ [Python자동전송] 중지 요청"
    Dim flag As String
    flag = ThisWorkbook.Path & "\stop.flag"
    Dim fn As Integer
    fn = FreeFile
    Open flag For Output As #fn
    Print #fn, "stop"
    Close #fn
    SetStatus "Python자동중지요청"
    LogMsg "■ stop.flag 생성 → Python 루프 곧 종료"
    Exit Sub
EH:
    LogMsg "✖ [Python자동전송중지] 오류 " & Err.Number & ": " & Err.Description
End Sub

' [공개] DDE 수식 삭제 (D~G 완전 삭제, B열 끝행까지)
Public Sub ClearDDEFormulas()
    On Error GoTo EH
    LogMsg "▶ [DDE삭제] 실행"
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    If lastRow < DATA_START_ROW Then lastRow = DATA_START_ROW
    ws.Range(ws.Cells(DATA_START_ROW, 4), ws.Cells(lastRow, 7)).ClearContents
    SetStatus "DDE삭제완료"
    LogMsg "■ [DDE삭제] D~G " & DATA_START_ROW & "~" & lastRow & "행 삭제"
    Exit Sub
EH:
    LogMsg "✖ [DDE삭제] 오류 " & Err.Number & ": " & Err.Description
End Sub

' [공개] 시트 컨트롤(체크박스/버튼) 생성 - 최초 1회 실행
Public Sub SetupUI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    Dim nm As Variant
    For Each nm In Array("PyAutoChk", "PySendBtn", "DDEClearBtn", "PrevHighBtn")
        On Error Resume Next
        ws.Shapes(nm).Delete
        On Error GoTo 0
    Next nm

    Dim cb As CheckBox
    Set cb = ws.CheckBoxes.Add(36, 92, 250, 27)
    cb.Name = "PyAutoChk": cb.Caption = "Python 자동전송 (ON/OFF)": cb.OnAction = "PyAutoToggle"
    Set cb = ws.CheckBoxes.Add(300, 92, 210, 27)
    cb.Name = "PySendBtn": cb.Caption = "Python 즉시전송(1회)": cb.OnAction = "PySendOnce"
    Set cb = ws.CheckBoxes.Add(524, 92, 160, 27)
    cb.Name = "DDEClearBtn": cb.Caption = "DDE 삭제(D~G)": cb.OnAction = "ClearDDEFormulas"
    Set cb = ws.CheckBoxes.Add(698, 92, 210, 27)
    cb.Name = "PrevHighBtn": cb.Caption = "전일고가 갱신(F→L)": cb.OnAction = "CopyHighToPrevHigh"

    LogMsg "SetupUI: Python/DDE/전일고가 컨트롤 4개 추가 완료"
End Sub

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
    On Error GoTo EH
    LogMsg "▶ [장마감복사] CopyHighToPrevHigh 실행"
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
    LogMsg "■ [장마감복사] 정상 종료 (" & count & "종목)"
    Exit Sub
EH:
    LogMsg "✖ [장마감복사] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "장마감복사 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub

' ─────────────────────────────
' [공개] eBest DDE 수식 자동 기입
' Workbook_Open 3초 후 자동 실행 또는 수동 호출 가능
' B열 종목코드 기준으로 D·E·F·G·L열 수식 삽입
' 형식: =EtkDS|eds!'STOCK.[종목코드];[항목명]'
' ─────────────────────────────
Public Sub FillDDEFormulas()
    LogMsg "▶ [DDE수식기입] FillDDEFormulas 실행"
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)

    ' DDE 알림창(원격 데이터 액세스/프로그램 시작?) 억제 + 재계산 이벤트 차단
    Dim prevAlerts As Boolean, prevEvents As Boolean, prevAsk As Boolean
    prevAlerts = Application.DisplayAlerts
    prevEvents = Application.EnableEvents
    prevAsk = Application.AskToUpdateLinks
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    Application.AskToUpdateLinks = False

    Dim filled As Long, errcnt As Long
    filled = 0: errcnt = 0

    ' B열 끝행까지 동적 처리
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    If lastRow < DATA_START_ROW Then lastRow = DATA_START_ROW

    Dim i As Long
    For i = DATA_START_ROW To lastRow
        Dim code As String
        code = Trim(CStr(ws.Cells(i, 2).Value))
        If Len(code) <> 6 Or Not IsNumeric(code) Then GoTo NextRow

        ' eBest HTS DDE 수식 삽입 (D·E·F·G).
        ' 열별로 "비어있을 때만" 기입 → D만 채워지고 E·F·G 비던 문제 해결
        '   (행 전체 스킵 금지: D에 수식 있어도 E·F·G 개별 확인)
        ' HTS 미실행이어도 열별 오류 무시로 4열 모두 시도(HTS 켜지면 값 채워짐).
        ' L열(전일고가)은 DDE 미지원 → 장마감 F열 값 복사로 관리
        Dim base As String
        base = "=EtkDS|eds!'STOCK." & code & ";"
        On Error Resume Next
        If Not ws.Cells(i, 4).HasFormula Then ws.Cells(i, 4).Formula = base & "현재가'"
        If Not ws.Cells(i, 5).HasFormula Then ws.Cells(i, 5).Formula = base & "시가'"
        If Not ws.Cells(i, 6).HasFormula Then ws.Cells(i, 6).Formula = base & "고가'"
        If Not ws.Cells(i, 7).HasFormula Then ws.Cells(i, 7).Formula = base & "저가'"
        If Err.Number <> 0 Then
            errcnt = errcnt + 1
            LogMsg "  · rank " & (i - DATA_START_ROW + 1) & " (" & code & ") DDE 기입오류 " & Err.Number
            Err.Clear
        Else
            filled = filled + 1
        End If
        On Error GoTo 0
NextRow:
    Next i

    ' 설정 복원
    Application.DisplayAlerts = prevAlerts
    Application.EnableEvents = prevEvents
    Application.AskToUpdateLinks = prevAsk

    SetStatus "DDE기입(" & filled & "종목" & IIf(errcnt > 0, "/오류" & errcnt, "") & ")"
    LogMsg "■ [DDE수식기입] 완료 (기입 " & filled & " / 오류 " & errcnt & ")"
End Sub


