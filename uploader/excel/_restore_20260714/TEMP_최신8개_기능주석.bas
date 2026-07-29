' ============================================================================
'  [검토용 임시파일] 공유 최신 8개 매크로 (+ 의존 헬퍼) — 간단 주석
'  ※ 07-14 백업 Module1 의 최신 버전. 현재 xlsm엔 구버전이 들어가 있어 교체 대상.
'
'  ★ 핵심: 이 8개는 "VBA 자체 자동/즉시 업로드" 코어.
'    → 주기적 돌파감지+업로드는 Python(starstock_uploader.py)이 담당(주력).
'    → 아래 VBA 업로더(StartAutoUpload/AutoUploadTick/UploadToAPI)는 돌파판단 없이
'      현재 엑셀값만 전송하는 '보조/백업' 경로. Python과 기능이 일부 겹침(중복 아님, 병렬).
'    → Python만 쓸 거면 SendDataNow(수동 1회) 정도만 남기고 자동계열은 빼도 됨.
' ============================================================================


' [VBA 자동전송 시작] m_Running=참, 다음 전송 타이머 예약. (체크박스 VbaAutoChk ON → VbaAutoToggle 호출)
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
    LogMsg "■ [자동전송시작] 정상 종료"
    Exit Sub
EH:
    LogMsg "? [자동전송시작] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "자동전송시작 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub


' [VBA 자동전송 중지] m_Running=거짓, 예약된 타이머 취소. (체크박스 VbaAutoChk OFF)
Public Sub StopAutoUpload()
    LogMsg "▶ [자동전송중지] StopAutoUpload 실행"
    m_Running = False
    On Error Resume Next
    Application.OnTime m_NextTime, "AutoUploadTick", , False
    On Error GoTo 0
    SetStatus "전송중지"
    LogMsg "■ [자동전송중지] 정상 종료"
End Sub


' [VBA 즉시전송 1회] 안내창(주력=Python) 확인 후, 돌파판단 없이 현재값 1회 전송. (버튼 btnVbaSend)
Public Sub SendDataNow()
    On Error GoTo EH
    LogMsg "▶ [즉시전송] SendDataNow 시작"
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
    LogMsg "? [즉시전송] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "즉시전송 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub


' [타이머 콜백] m_Running 이면 UploadToAPI 1회 + 다음 예약. (StartAutoUpload 가 건 반복)
Public Sub AutoUploadTick()
    On Error GoTo EH
    If Not m_Running Then Exit Sub
    LogMsg "▶ [타이머] AutoUploadTick 실행"
    UploadToAPI
    ScheduleNext
    LogMsg "■ [타이머] AutoUploadTick 정상 종료"
    Exit Sub
EH:
    LogMsg "? [타이머] 오류 " & Err.Number & ": " & Err.Description
End Sub


' [상태 표시] 상태셀 P1 + 시각 P2 갱신 (+ LogMsg 기록). 모든 동작이 호출.
Private Sub SetStatus(txt As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MASTER")
    ws.Range("P1").Value = "[" & txt & "]"
    ws.Range("P2").Value = Format(Now(), "hh:mm:ss")
    LogMsg "상태 → " & txt
End Sub


' [API 전송 본체] rank1~10 슬롯을 JSON 조립 → API POST(최대 3회 재시도).
'   빈 슬롯=숨김마커 전송(웹에서 제거), 현재가 #N/A/0=건너뜀(기존값 유지).
'   ※ 이건 VBA가 직접 전송하는 경로 → CreateHTTP·ToStatusCode·SafeLng·EscJ·ReadTokenFromConfig 의존.
Private Sub UploadToAPI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MASTER")
    LogMsg "  · UploadToAPI 진입 (토큰 확인/데이터 수집 시작)"

    Dim token As String
    token = ReadTokenFromConfig()
    If token = "" Then
        SetStatus "토큰없음"
        MsgBox "config.json 에 upload_token 을 설정하세요." & Chr(13) & _
               "경로: " & ThisWorkbook.Path & "\config.json", vbExclamation, "StarStock"
        Exit Sub
    End If

    Dim stockParts(0 To 9) As String
    Dim cnt As Integer, visCnt As Integer
    cnt = 0: visCnt = 0
    Dim q As String
    q = Chr(34)

    Dim r As Integer
    For r = 1 To 10
        Dim rowNum As Long
        rowNum = 11 + r - 1     ' rank r → 행(11..20)  ※ VBA 즉시전송은 상위 10개 슬롯 기준
        Dim code As String
        code = Trim(CStr(ws.Cells(rowNum, 2).Value))

        If Len(code) <> 6 Or Not IsNumeric(code) Then
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

    Dim joined As String, k As Integer
    For k = 0 To cnt - 1
        If k > 0 Then joined = joined & ","
        joined = joined & stockParts(k)
    Next k

    Dim utcNow As String
    utcNow = Format(Now() - TimeSerial(9, 0, 0), "yyyy-mm-ddThh:mm:ss") & "Z"   ' UTC(KST-9h)

    Dim body As String
    body = "{" & q & "timestamp" & q & ":" & q & utcNow & q & "," & _
           q & "stocks" & q & ":[" & joined & "]}"

    LogMsg "  · HTTP 전송 시작 (본문 " & Len(body) & "바이트)"
    Dim attempt As Integer
    For attempt = 1 To 3
        LogMsg "  · HTTP 시도 " & attempt & "/3"
        Dim http As Object
        Set http = CreateHTTP()
        If http Is Nothing Then
            SetStatus "HTTP객체오류"
            MsgBox "HTTP 통신 객체를 만들 수 없습니다(MSXML 미설치/미등록).", vbCritical, "StarStock"
            Exit Sub
        End If
        On Error Resume Next
        http.Open "POST", "https://starstock.vercel.app/api/upload-stocks", False
        http.setRequestHeader "Content-Type", "application/json"
        http.setRequestHeader "X-Upload-Token", token
        http.send body
        Dim sendErr As Long
        sendErr = Err.Number
        On Error GoTo 0

        If sendErr <> 0 Then
            SetStatus "연결오류"
        ElseIf http.Status = 200 Then
            SetStatus "연동중-OK": Exit For
        ElseIf http.Status = 401 Then
            SetStatus "토큰오류(401)": m_Running = False
            MsgBox "인증 실패(401): upload_token 을 확인하세요.", vbCritical, "StarStock": Exit For
        ElseIf http.Status = 408 Then
            SetStatus "시각오류(408)"
            MsgBox "타임스탬프 오류(408): PC 시각을 확인하세요.", vbExclamation, "StarStock": Exit For
        Else
            SetStatus "서버오류(" & http.Status & ")"
        End If
        If attempt < 3 Then Application.Wait Now() + TimeSerial(0, 0, 5)
    Next attempt
End Sub


' [토큰 읽기] config.json 의 upload_token 반환 (ReadConfigValue 래퍼).
Private Function ReadTokenFromConfig() As String
    ReadTokenFromConfig = ReadConfigValue("upload_token")
End Function


' [장마감 복사] F열(당일고가) → L열(전일고가) 정적 복사, 11~110행. 15:30 자동 또는 버튼.
Public Sub CopyHighToPrevHigh()
    On Error GoTo EH
    LogMsg "▶ [장마감복사] CopyHighToPrevHigh 실행"
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MASTER")
    Dim count As Integer
    count = 0
    Dim i As Integer
    For i = 11 To 110
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
        ws.Cells(i, 12).Value = highVal         ' L열: 전일고가
        count = count + 1
NextRowC:
    Next i
    SetStatus "장마감완료(" & count & "종목)"
    LogMsg "■ [장마감복사] 정상 종료 (" & count & "종목)"
    Exit Sub
EH:
    LogMsg "? [장마감복사] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "장마감복사 오류 " & Err.Number & ": " & Err.Description, vbCritical, "StarStock"
End Sub


' ── (참고) 위 8개가 쓰는 공유-동일 헬퍼: 현재 xlsm 에도 이미 있음 → 교체 불필요 ──
'   ScheduleNext   : INTERVAL_CELL(P3 "1분/3분/..") 읽어 다음 AutoUploadTick 예약
'   ToStatusCode   : 추천상태("매수적기/손절조심") → API코드("buy/sell/hold")
'   SafeLng        : 셀값 안전하게 Long 변환(#N/A→0)
'   EscJ           : JSON 문자열 이스케이프(따옴표/역슬래시/개행)
