Option Explicit
'===================================================
' DDEHelper - DDE 안정화 + 제공사(LS/키움) 전환 + 시작 오케스트레이션
'  체크박스(연결셀 R1)로 제공사 선택 → 다시 열면 그 형식대로 DDE 기입
'   · 해제(FALSE) = LS(이베스트): =EtkDS|eds!'STOCK.코드;항목명'
'   · 체크(TRUE)  = 키움(NKRun):  =NKRun|'코드_AL'!'필드번호'
'  키움은 전일고가(377)를 DDE로 직접 제공 → 15:30 F→L 복사 건너뜀(CloseCopyIfLS)
'  로그: uploader\vba_dde.log
'===================================================
Private Const MASTER_SHEET   As String = "MASTER"
Private Const DATA_START_ROW As Long = 11
Private Const DATA_END_ROW   As Long = 110
Private Const STATUS_CELL    As String = "P1"
Private Const PROVIDER_CELL  As String = "R1"   ' 체크박스 연결셀: TRUE=키움 / FALSE=LS
Private Const MAX_WAIT_SEC   As Long = 15        ' EnsureDDEReady 최대 대기(초)
Public g_MarketSortTime As Date                  ' 장중 정렬 반복 예약시각(모듈 최상단 선언 필수)

' LS 감시열: D(4)현재가 E(5)시가 F(6)고가 G(7)저가 N(14)등락율
' 키움은 위 + L(12)전일고가 까지 DDE
Private Function DdeCols() As Variant
    If UseKiwoom() Then
        DdeCols = Array(4, 5, 6, 7, 12, 14)
    Else
        DdeCols = Array(4, 5, 6, 7, 14)
    End If
End Function

Public Function UseKiwoom() As Boolean
    On Error Resume Next
    UseKiwoom = (ThisWorkbook.Sheets(MASTER_SHEET).Range(PROVIDER_CELL).Value = True)
    On Error GoTo 0
End Function

Public Sub DdeLog(ByVal msg As String)
    Dim f As Integer
    On Error Resume Next
    f = FreeFile
    Open ThisWorkbook.Path & "\vba_dde.log" For Append As #f
    Print #f, Format(Now(), "yyyy-mm-dd hh:mm:ss") & "  " & msg
    Close #f
    On Error GoTo 0
End Sub

Private Function LastDataRow(ws As Worksheet) As Long
    LastDataRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
End Function

Private Function CountNA(ws As Worksheet, ByVal lastRow As Long) As Long
    Dim r As Long, c, n As Long, cols
    cols = DdeCols(): n = 0
    For r = DATA_START_ROW To lastRow
        For Each c In cols
            If ws.Cells(r, c).HasFormula Then
                If Application.IsNA(ws.Cells(r, c).Value) Then n = n + 1
            End If
        Next c
    Next r
    CountNA = n
End Function

' [자동] 제공사 선택 체크박스 생성(없을 때만) — 비파괴, 기존 도형 안 건드림
Public Sub SetupProviderCheckbox()
    Dim ws As Worksheet, cb As Object, shp As Object, anchor As Range
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    On Error Resume Next
    If ws.Range(PROVIDER_CELL).Value = "" Then ws.Range(PROVIDER_CELL).Value = False  ' 기본=LS
    For Each shp In ws.CheckBoxes
        If shp.Name = "chkProvider" Then Exit Sub   ' 이미 있음
    Next shp
    Set anchor = ws.Range("R2")
    Set cb = ws.CheckBoxes.Add(anchor.Left, anchor.Top, 170, 18)
    cb.Name = "chkProvider"
    cb.Caption = "키움 DDE (체크) / LS (해제)"
    cb.LinkedCell = MASTER_SHEET & "!" & PROVIDER_CELL
    DdeLog "제공사 체크박스 생성 (연결셀=" & PROVIDER_CELL & ")"
    On Error GoTo 0
End Sub

' 1) 제공사 분기 DDE 기입 (오류처리 보강: 한 셀 실패해도 계속)
Public Sub FillDDEFormulasSafe()
    Dim ws As Worksheet, i As Long, code As String, filled As Long
    Dim prevAlerts As Boolean, kiwoom As Boolean, kb As String, lb As String
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    ws.Range("N10").Value = "등락률"
    kiwoom = UseKiwoom()
    filled = 0
    prevAlerts = Application.DisplayAlerts
    Application.DisplayAlerts = False        ' DDE 연결 모달창 억제
    On Error Resume Next                      ' 한 셀 실패해도 다음 셀 계속
    For i = DATA_START_ROW To DATA_END_ROW
        code = Trim(CStr(ws.Cells(i, 2).Value))
        If Len(code) = 6 And IsNumeric(code) Then
            ' 제공사 전환 대비: L(전일고가)에 남은 '수식'만 제거(LS 정적 복사값은 보존)
            If ws.Cells(i, 12).HasFormula Then ws.Cells(i, 12).ClearContents
            If kiwoom Then
                kb = "=NKRun|'" & code & "_AL'!'"
                If Not ws.Cells(i, 4).HasFormula Then ws.Cells(i, 4).Formula = kb & "10'"    ' 현재가
                If Not ws.Cells(i, 5).HasFormula Then ws.Cells(i, 5).Formula = kb & "16'"    ' 시가
                If Not ws.Cells(i, 6).HasFormula Then ws.Cells(i, 6).Formula = kb & "17'"    ' 고가
                If Not ws.Cells(i, 7).HasFormula Then ws.Cells(i, 7).Formula = kb & "18'"    ' 저가
                ws.Cells(i, 12).Formula = kb & "377'"                                        ' 전일고가(키움 DDE)
                If Not ws.Cells(i, 14).HasFormula Then ws.Cells(i, 14).Formula = kb & "12'"  ' 등락율
            Else
                lb = "=EtkDS|eds!'STOCK." & code & ";"
                If Not ws.Cells(i, 4).HasFormula Then ws.Cells(i, 4).Formula = lb & "현재가'"
                If Not ws.Cells(i, 5).HasFormula Then ws.Cells(i, 5).Formula = lb & "시가'"
                If Not ws.Cells(i, 6).HasFormula Then ws.Cells(i, 6).Formula = lb & "고가'"
                If Not ws.Cells(i, 7).HasFormula Then ws.Cells(i, 7).Formula = lb & "저가'"
                If Not ws.Cells(i, 14).HasFormula Then ws.Cells(i, 14).Formula = lb & "등락율'"
                ' LS: L(전일고가)은 15:30 F→L 복사로 관리 (DDE 미기입)
            End If
            filled = filled + 1
        End If
    Next i
    On Error GoTo 0
    Application.DisplayAlerts = prevAlerts
    ws.Range(STATUS_CELL).Value = "[DDE기입완료(" & filled & "/" & IIf(kiwoom, "키움", "LS") & ")]"
    DdeLog "FillDDESafe 완료 · 제공사=" & IIf(kiwoom, "키움", "LS") & " · filled=" & filled & " · 기입후 #N/A=" & CountNA(ws, LastDataRow(ws))
End Sub

' 1-2) 배열 일괄 기입 버전 (FillDDEFormulasSafe 대체)
'  선택1-A ScreenUpdating + Calculation Manual: 기입 중 재계산/화면갱신 차단
'  선택2-B LS + 키움 둘 다 Range.Formula = 배열: COM 호출 ~500 → 10회 감소
'  선택3-A HasFormula 체크 유지: 기존 수식 있는 셀 보존
Public Sub FillDDEFormulasArraySafe()
    Dim ws As Worksheet
    Dim kiwoom As Boolean, filled As Long
    Dim prevAlerts As Boolean, prevCalc As Long, prevScreen As Boolean
    Dim rowCount As Long, r As Long, idx As Long
    Dim code As String, kb As String, lb As String

    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    kiwoom = UseKiwoom()
    rowCount = DATA_END_ROW - DATA_START_ROW + 1   ' = 100

    ' ── 1단계: 수식 배열 구성 (메모리, 빠름) ──────────────────────────────
    Dim fD() As Variant, fE() As Variant, fF() As Variant
    Dim fG() As Variant, fL() As Variant, fN() As Variant
    ReDim fD(1 To rowCount, 1 To 1): ReDim fE(1 To rowCount, 1 To 1)
    ReDim fF(1 To rowCount, 1 To 1): ReDim fG(1 To rowCount, 1 To 1)
    ReDim fL(1 To rowCount, 1 To 1): ReDim fN(1 To rowCount, 1 To 1)

    For r = DATA_START_ROW To DATA_END_ROW
        idx = r - DATA_START_ROW + 1
        code = Trim(CStr(ws.Cells(r, 2).Value))
        If Len(code) = 6 And IsNumeric(code) Then
            If kiwoom Then
                kb = "=NKRun|'" & code & "_AL'!'"
                fD(idx, 1) = kb & "10'"  : fE(idx, 1) = kb & "16'"
                fF(idx, 1) = kb & "17'"  : fG(idx, 1) = kb & "18'"
                fL(idx, 1) = kb & "377'" : fN(idx, 1) = kb & "12'"
            Else
                lb = "=EtkDS|eds!'STOCK." & code & ";"
                fD(idx, 1) = lb & "현재가'" : fE(idx, 1) = lb & "시가'"
                fF(idx, 1) = lb & "고가'"   : fG(idx, 1) = lb & "저가'"
                fN(idx, 1) = lb & "등락율'"
            End If
            filled = filled + 1
        End If
    Next r

    ' ── 2단계: 화면·계산 억제 (기입 중 DDE 응답 대기 차단) ──────────────
    prevAlerts = Application.DisplayAlerts
    prevCalc   = Application.Calculation
    prevScreen = Application.ScreenUpdating
    Application.DisplayAlerts  = False
    Application.Calculation    = xlCalculationManual
    Application.ScreenUpdating = False
    On Error Resume Next

    ' ── 3단계: 열별 일괄 기입 ─────────────────────────────────────────────
    DdeFillCol ws, 4,  fD   ' D: 현재가
    DdeFillCol ws, 5,  fE   ' E: 시가
    DdeFillCol ws, 6,  fF   ' F: 고가
    DdeFillCol ws, 7,  fG   ' G: 저가
    DdeFillCol ws, 14, fN   ' N: 등락율

    If kiwoom Then
        ' 키움 L열(전일고가): 항상 덮어쓰기 (HasFormula 체크 없음, 기존 동작 유지)
        ws.Range(ws.Cells(DATA_START_ROW, 12), ws.Cells(DATA_END_ROW, 12)).Formula = fL
    Else
        ' LS: 키움→LS 전환 잔재 수식만 제거 (정적값 보존)
        For r = DATA_START_ROW To DATA_END_ROW
            If ws.Cells(r, 12).HasFormula Then ws.Cells(r, 12).ClearContents
        Next r
    End If
    On Error GoTo 0

    ' ── 4단계: 억제 해제 → DDE 비동기 갱신 시작 ────────────────────────────
    Application.Calculation    = prevCalc    ' Auto 복원 → DDE 자동갱신 비동기 시작
    Application.ScreenUpdating = prevScreen
    DoEvents    ' DisplayAlerts=False 유지한 채 메시지 루프 처리
                ' → 키움 100채널 동시 DDE_INITIATE 시 "데이터 원본 선택" 다이얼로그 억제
    Application.DisplayAlerts  = prevAlerts  ' DoEvents 완료 후 복원
    ' [제거] Application.Calculate: 동기 블로킹(LS 2~4초/키움 5~10초) 제거
    '        prevCalc=Auto 복원만으로 DDE 갱신 시작, EnsureDDEReady가 #N/A 후속 처리

    ws.Range("N10").Value = "등락률"
    ws.Range(STATUS_CELL).Value = "[DDE기입완료(" & filled & "/" & IIf(kiwoom, "키움", "LS") & ")]"
    DdeLog "FillDDEArraySafe 완료 · 제공사=" & IIf(kiwoom, "키움", "LS") & " · filled=" & filled
    ' [제거] & CountNA(...): 로그용 1000~1200번 COM 호출(1~2초) 제거, EnsureDDEReady가 처리
End Sub

' DdeFillCol: 열 단위 배열 기입 헬퍼
'  기존 수식(= 로 시작) 있는 셀 → 유지 (HasFormula 동등)
'  수식 없는 셀 + 새 수식 있음 → 신규 기입
'  빈 행(종목코드 없음) → 기존 상태 유지
Private Sub DdeFillCol(ws As Worksheet, ByVal col As Long, ByRef newFmls As Variant)
    Dim rowCount As Long
    rowCount = DATA_END_ROW - DATA_START_ROW + 1

    Dim rng As Range
    Set rng = ws.Range(ws.Cells(DATA_START_ROW, col), ws.Cells(DATA_END_ROW, col))

    Dim existing As Variant
    existing = rng.Formula          ' 1회 읽기 (100셀 → Range 호출 1번)

    Dim merged() As Variant
    ReDim merged(1 To rowCount, 1 To 1)

    Dim i As Long, exVal As String, nfVal As String
    For i = 1 To rowCount
        exVal = CStr(existing(i, 1))
        nfVal = CStr(newFmls(i, 1))
        If Left(exVal, 1) = "=" Then
            merged(i, 1) = exVal    ' 기존 수식 유지
        ElseIf nfVal <> "" Then
            merged(i, 1) = nfVal    ' 수식 없는 셀에 신규 기입
        Else
            merged(i, 1) = exVal    ' 빈 행 또는 값 유지
        End If
    Next i

    rng.Formula = merged            ' 1회 쓰기 (100셀 → Range 호출 1번)
End Sub

' 2) #N/A 셀만 재요청 + 값 채워질 때까지 폴링
Public Sub EnsureDDEReady()
    Dim ws As Worksheet, r As Long, lastRow As Long, t0 As Double
    Dim naNow As Long, cel As Range, c, cols
    Set ws = ThisWorkbook.Sheets(MASTER_SHEET)
    lastRow = LastDataRow(ws)
    If lastRow < DATA_START_ROW Then Exit Sub
    cols = DdeCols()
    DdeLog "EnsureDDE 시작 (행 11~" & lastRow & ")"
    ' [제거] & CountNA(...): 시작 로그용 1000~1200번 COM 호출(1~2초) 제거
    t0 = Timer
    Do
        naNow = 0
        For r = DATA_START_ROW To lastRow
            For Each c In cols
                Set cel = ws.Cells(r, c)
                If cel.HasFormula Then
                    If Application.IsNA(cel.Value) Then
                        cel.Formula = cel.Formula      ' 자기수식 재대입 → DDE 링크 재요청
                        naNow = naNow + 1
                    End If
                End If
            Next c
        Next r
        If naNow = 0 Then Exit Do
        DoEvents
        Application.Wait Now + TimeSerial(0, 0, 1)
    Loop While Timer - t0 < MAX_WAIT_SEC
    Dim leftover As String, cnt As Long
    leftover = "": cnt = 0
    For r = DATA_START_ROW To lastRow
        For Each c In cols
            Set cel = ws.Cells(r, c)
            If cel.HasFormula Then
                If Application.IsNA(cel.Value) Then
                    leftover = leftover & CStr(ws.Cells(r, 2).Value) & "(" & r & "행) "
                    cnt = cnt + 1
                    Exit For
                End If
            End If
        Next c
    Next r
    If cnt = 0 Then
        DdeLog "EnsureDDE 종료 · 전부 정상"
    Else
        DdeLog "EnsureDDE 종료 · 미해결=" & cnt & " -> " & leftover & "(거래정지/미인식 가능)"
    End If
End Sub

' 3) 15:30 복사 래퍼: 키움이면 건너뜀(전일고가 DDE 제공), LS면 F→L 복사 실행
Public Sub CloseCopyIfLS()
    If UseKiwoom() Then
        DdeLog "15:30 복사 건너뜀 (키움=전일고가 DDE 377 제공)"
        Exit Sub
    End If
    On Error Resume Next
    CopyHighToPrevHigh      ' Module1: LS용 당일고가(F)→전일고가(L) 복사
    On Error GoTo 0
    DdeLog "15:30 F->L 복사 실행 (LS)"
End Sub

' ── 장중 판별 (파이썬 업로더와 동일 기준: 09:00~15:30, 시간 기준) ──
Public Function IsMarketHours() As Boolean
    Dim t As Date
    t = Time
    IsMarketHours = (t >= TimeValue("09:00:00") And t < TimeValue("15:30:00"))
End Function

' 열 때 1회 정렬(항상) + 이후 장중일 때만 P3주기 반복
Public Sub StartMarketSort()
    On Error Resume Next
    SortByChange                       ' 열 때 1회는 항상 정렬(PyControl)
    On Error GoTo 0
    ScheduleMarketSort
End Sub

Private Sub ScheduleMarketSort()
    Dim mins As Long
    On Error Resume Next
    mins = ReadIntervalMinutes()        ' PyControl: P3(전송주기) → 분
    If mins < 1 Then mins = 3
    g_MarketSortTime = Now() + TimeSerial(0, mins, 0)
    Application.OnTime g_MarketSortTime, "MarketSortTick"
    On Error GoTo 0
End Sub

' 반복 콜백: 장중이면 정렬, 장외면 건너뜀. 항상 재예약(장 열리면 자동시작 / 닫히면 자동정지)
Public Sub MarketSortTick()
    If IsMarketHours() Then
        On Error Resume Next
        SortByChange
        On Error GoTo 0
        DdeLog "정렬 실행(장중)"
    End If
    ScheduleMarketSort
End Sub

Public Sub CancelMarketSort()
    On Error Resume Next
    If g_MarketSortTime > 0 Then Application.OnTime g_MarketSortTime, "MarketSortTick", , False
    On Error GoTo 0
End Sub

' 4) 시작 오케스트레이터: 체크박스 준비 -> 기입 -> 준비확인 -> 정렬1회 -> (장중만)반복
Public Sub StartDDEThenSort()
    DdeLog "===== 시작 시퀀스 (제공사=" & IIf(UseKiwoom(), "키움", "LS") & " · 장중=" & IsMarketHours() & ") ====="
    SetupProviderCheckbox
    FillDDEFormulasArraySafe    ' 배열 일괄 기입 (FillDDEFormulasSafe 대체)
    EnsureDDEReady
    StartMarketSort       ' 정렬 1회(항상) + 장중(09:00~15:30)에만 반복
    ' [2026-07-28 자동복원] 업로더 자동시작 (파이썬이 개장대기·stop.flag로 자기게이트라 안전)
    On Error Resume Next
    StartUploader         ' PyControl: cmd /k python starstock_uploader.py (CMD창 유지)
    On Error GoTo 0
    DdeLog "DDE+정렬 준비 완료 · 업로더 자동시작"
End Sub
