' ============================================================================
'  [검토용 임시파일] 사라진 11개 매크로 — 기능 주석 포함
'  ※ 07-14 백업(STARSTOCK_MASTER.backup_20260714_232501.xlsm) Module1 에서 추출
'  ※ 제가 구버전 Module1 주입 시 지워진 매크로들. 아래 분류로 취사선택 검토.
'
'  [필요도 분류]
'   ✅ Python 주력 제어/체크박스/버튼 (권장 복구): LogMsg, ReadConfigValue,
'      PythonPath, PySendOnce, PyAutoToggle, PyAutoStart, PyAutoStop
'   ⚠️ VBA 보조 업로더용 (Python과 기능 겹침 → 선택): CreateHTTP, VbaAutoToggle
'   🔧 UI 유지보수용 (이미 시트에 버튼/체크박스 있어 런타임 불필요): SetupUI, AddColorBtn
' ============================================================================


' ┌─ [1] LogMsg  (내부 헬퍼) ────────────────────────────────────────────────
' │ 기능: 실행 흐름·오류를 VBA 즉시실행창(Ctrl+G, Immediate Window)에 로그로 남김
' │ 필요: ✅ 거의 모든 Sub 가 호출 → 로그 원하면 필요 (없으면 로그호출부 제거해야)
' └──────────────────────────────────────────────────────────────────────────
Private Sub LogMsg(msg As String)
    Debug.Print Format(Now(), "hh:mm:ss") & " | " & msg
End Sub


' ┌─ [2] CreateHTTP  (내부 헬퍼) ────────────────────────────────────────────
' │ 기능: MSXML HTTP 통신객체 생성. 정식 ProgID 순서대로 폴백 → 런타임오류 429 방지
' │ 필요: ⚠️ VBA가 직접 HTTP 전송(UploadToAPI)할 때만. Python만 쓰면 불필요
' └──────────────────────────────────────────────────────────────────────────
Private Function CreateHTTP() As Object
    On Error Resume Next
    Set CreateHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.XMLHTTP.6.0")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.ServerXMLHTTP")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("MSXML2.XMLHTTP")
    If CreateHTTP Is Nothing Then Set CreateHTTP = CreateObject("Microsoft.XMLHTTP")
    On Error GoTo 0
End Function


' ┌─ [3] ReadConfigValue  (내부 헬퍼) ───────────────────────────────────────
' │ 기능: config.json 에서 임의 키의 값을 파싱(UTF-8 안전, JSON 백슬래시 해제)
' │ 필요: ✅ ReadTokenFromConfig·PythonPath 가 사용 → Python/VBA 전송 모두 기반
' └──────────────────────────────────────────────────────────────────────────
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


' ┌─ [4] PythonPath  (내부 헬퍼) ────────────────────────────────────────────
' │ 기능: config.json 의 python_path 반환(없으면 "python")
' │ 필요: ✅ PySendOnce·PyAutoStart(파이썬 실행)이 사용
' └──────────────────────────────────────────────────────────────────────────
Private Function PythonPath() As String
    Dim p As String
    p = ReadConfigValue("python_path")
    If p = "" Then p = "python"
    PythonPath = p
End Function


' ┌─ [5] PySendOnce  (공개, 버튼 btnPySend) ─────────────────────────────────
' │ 기능: Python 업로더를 1회(--once) 실행. 콘솔창 표시로 결과 확인
' │ 필요: ✅ "Python 즉시전송(1회)" 버튼용
' └──────────────────────────────────────────────────────────────────────────
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
    LogMsg "? [Python즉시전송] 오류 " & Err.Number & ": " & Err.Description
    MsgBox "Python 즉시전송 실행 오류: " & Err.Description, vbCritical, "StarStock"
End Sub


' ┌─ [6] PyAutoToggle  (공개, 체크박스 PyAutoChk) ───────────────────────────
' │ 기능: PyAutoChk 체크 상태에 따라 Python 자동전송 시작(ON)/중지(OFF)
' │ 필요: ✅ "Python 자동전송" 체크박스가 이걸 호출 (지금 없어서 체크박스 먹통)
' └──────────────────────────────────────────────────────────────────────────
Public Sub PyAutoToggle()
    On Error GoTo EH
    Dim cb As CheckBox
    Set cb = ThisWorkbook.Sheets("MASTER").CheckBoxes(Application.Caller)
    If cb.Value = xlOn Then
        PyAutoStart
    Else
        PyAutoStop
    End If
    Exit Sub
EH:
    LogMsg "? [Python자동] 오류 " & Err.Number & ": " & Err.Description
End Sub


' ┌─ [7] VbaAutoToggle  (공개, 체크박스 VbaAutoChk) ─────────────────────────
' │ 기능: VbaAutoChk 체크 상태에 따라 VBA 자동전송 시작(ON)/중지(OFF)
' │ 필요: ⚠️ VBA 보조 자동전송을 쓸 때만 (Python 주력과 기능 겹침 → 선택)
' └──────────────────────────────────────────────────────────────────────────
Public Sub VbaAutoToggle()
    On Error GoTo EH
    Dim cb As CheckBox
    Set cb = ThisWorkbook.Sheets("MASTER").CheckBoxes(Application.Caller)
    If cb.Value = xlOn Then
        StartAutoUpload
    Else
        StopAutoUpload
    End If
    Exit Sub
EH:
    LogMsg "? [VBA자동] 오류 " & Err.Number & ": " & Err.Description
End Sub


' ┌─ [8] PyAutoStart  (공개) ────────────────────────────────────────────────
' │ 기능: Python 자동전송 시작. stop.flag 삭제 후 starstock_uploader.py 백그라운드 실행
' │ 필요: ✅ PyAutoToggle(체크박스 ON)이 호출 = Python 주력 자동전송의 실동작
' └──────────────────────────────────────────────────────────────────────────
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
    LogMsg "? [Python자동전송시작] 오류 " & Err.Number & ": " & Err.Description
End Sub


' ┌─ [9] PyAutoStop  (공개) ─────────────────────────────────────────────────
' │ 기능: Python 자동전송 중지. stop.flag 파일 생성 → Python 루프가 감지하고 안전 종료
' │ 필요: ✅ PyAutoToggle(체크박스 OFF)이 호출
' └──────────────────────────────────────────────────────────────────────────
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
    LogMsg "? [Python자동전송중지] 오류 " & Err.Number & ": " & Err.Description
End Sub


' ┌─ [10] AddColorBtn  (내부 헬퍼) ──────────────────────────────────────────
' │ 기능: 색상 둥근버튼 도형 1개 생성 + OnAction 매크로 연결 (SetupUI 전용)
' │ 필요: 🔧 SetupUI 로 UI 재구성할 때만. 이미 버튼 있으면 런타임 불필요
' └──────────────────────────────────────────────────────────────────────────
Private Sub AddColorBtn(ws As Worksheet, nm As String, L As Single, T As Single, _
                        W As Single, H As Single, col As Long, txt As String, action As String)
    On Error Resume Next
    ws.Shapes(nm).Delete
    On Error GoTo 0
    Dim sh As Shape
    Set sh = ws.Shapes.AddShape(5, L, T, W, H)   ' 5 = 둥근 사각형
    sh.Name = nm
    sh.Fill.ForeColor.RGB = col
    sh.Line.Visible = False
    With sh.TextFrame
        .Characters.Text = txt
        .Characters.Font.Color = RGB(255, 255, 255)
        .Characters.Font.Bold = True
        .Characters.Font.Size = 10
        .HorizontalAlignment = xlHAlignCenter
        .VerticalAlignment = xlVAlignCenter
    End With
    If action <> "" Then sh.OnAction = action
End Sub


' ┌─ [11] SetupUI  (공개) ───────────────────────────────────────────────────
' │ 기능: 시트의 버튼(즉시전송·DDE삭제·전일고가)·체크박스(VBA/Python 자동) 전체 재생성
' │ 필요: 🔧 UI가 깨졌을 때 1회 수동 실행용. 평소엔 불필요 (이미 시트에 존재)
' └──────────────────────────────────────────────────────────────────────────
Public Sub SetupUI()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MASTER")

    ' 기존 컨트롤 전부 제거(재실행 대비)
    Dim nm As Variant
    For Each nm In Array("Check Box 1", "Check Box 2", "Check Box 3", _
                         "PyAutoChk", "PySendBtn", "DDEClearBtn", "PrevHighBtn", _
                         "VbaAutoChk", "hdrVBA", "hdrPY", "hdrTool", _
                         "btnVbaSend", "btnPySend", "btnDDEClear", "btnPrevHigh")
        On Error Resume Next
        ws.Shapes(nm).Delete
        On Error GoTo 0
    Next nm

    Dim colVBA As Long, colPY As Long, colTool As Long
    colVBA = RGB(120, 120, 120)   ' 회색 = VBA(보조)
    colPY = RGB(60, 120, 210)     ' 파랑 = Python(주력)
    colTool = RGB(70, 160, 100)   ' 초록 = 공통 도구

    ' ── 섹션 헤더(색상 라벨) ──
    AddColorBtn ws, "hdrVBA", 20, 55, 130, 26, colVBA, "■ VBA (보조)", ""
    AddColorBtn ws, "hdrPY", 20, 88, 130, 26, colPY, "■ Python (주력)", ""
    AddColorBtn ws, "hdrTool", 20, 121, 130, 26, colTool, "■ 공통 도구", ""

    ' ── 1회 실행 액션(색상 버튼) ──
    AddColorBtn ws, "btnVbaSend", 345, 55, 165, 26, colVBA, "즉시전송(1회)", "SendDataNow"
    AddColorBtn ws, "btnPySend", 345, 88, 165, 26, colPY, "즉시전송(1회)", "PySendOnce"
    AddColorBtn ws, "btnDDEClear", 160, 121, 165, 26, colTool, "DDE삭제(D~G)", "ClearDDEFormulas"
    AddColorBtn ws, "btnPrevHigh", 345, 121, 165, 26, colTool, "전일고가갱신(F→L)", "CopyHighToPrevHigh"

    ' ── 상태 토글(체크박스) : 자동전송 ON/OFF ──
    Dim cb As CheckBox
    Set cb = ws.CheckBoxes.Add(160, 57, 175, 22)
    cb.Name = "VbaAutoChk": cb.Caption = "자동전송 ON/OFF": cb.OnAction = "VbaAutoToggle"
    Set cb = ws.CheckBoxes.Add(160, 90, 175, 22)
    cb.Name = "PyAutoChk": cb.Caption = "자동전송 ON/OFF": cb.OnAction = "PyAutoToggle"

    LogMsg "SetupUI: 색상 버튼/체크박스 재구성 완료"
End Sub
