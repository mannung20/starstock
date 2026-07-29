Option Explicit
'===================================================
' StarStock PyControl ? 파이썬 연동 버튼 매크로 (신규 모듈, 기존 Module1 무관)
' 버튼: 시뮬레이션 재생 / 실제 업로더 / 웹DB 초기화
' + AskDailyReset : 엑셀 열릴 때 초기화 물어보기 (Workbook_Open 에서 호출)
' 경로에 공백이 없어 따옴표 없이 처리.
'===================================================
Private Const UPLOADER_WIN As String = "C:\Users\nick7\0.test\projects\7.0.1-excel-vercel-starstock-service\uploader"
Private Const UPLOADER_WSL As String = "/mnt/c/Users/nick7/0.test/projects/7.0.1-excel-vercel-starstock-service/uploader"

' [버튼] 시뮬레이션 재생 ? 파일선택 대화상자로 3분봉 .xlsm 고른 뒤 재생
' (선택 후 콘솔에서 종목코드/전일고가 입력). WSL python, openpyxl.
Public Sub RunSimulation()
    Dim fd As FileDialog, initDir As String, picked As String, wslPath As String, cmd As String

    ' 시작 폴더: 현재 통합문서(마스터) 폴더의 simulation-xlsm, 없으면 통합문서 폴더
    initDir = ThisWorkbook.Path & "\simulation-xlsm\"
    If Dir(initDir, vbDirectory) = "" Then initDir = ThisWorkbook.Path & "\"

    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    With fd
        .Title = "재생할 3분봉 파일 선택"
        .AllowMultiSelect = False
        .InitialFileName = initDir
        .Filters.Clear
        .Filters.Add "엑셀 파일", "*.xlsm;*.xlsx"
        If .Show <> -1 Then Exit Sub   ' 취소
        picked = .SelectedItems(1)
    End With

    ' Windows 경로 → WSL 경로 (C: 드라이브 가정)
    wslPath = Replace(picked, "\", "/")
    wslPath = Replace(wslPath, "C:/", "/mnt/c/")

    cmd = "cmd.exe /k wsl bash -lc ""cd " & UPLOADER_WSL & " && python3 replay_3min.py '" & wslPath & "'"""
    Shell cmd, vbNormalFocus
End Sub

' [버튼] 실제 업로더 실행 (Windows python, win32com → 열려있는 이 마스터에 연결)
Public Sub RunUploader()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python starstock_uploader.py", vbNormalFocus
End Sub

' [버튼] 웹DB 초기화 (Windows python, requests) ? 전 종목 is_visible=false soft reset
Public Sub ResetWebDB()
    Shell "cmd.exe /k cd /d " & UPLOADER_WIN & " && python reset_web_db.py", vbNormalFocus
End Sub

' [Workbook_Open 호출] 초기화 물어보기 ? 10초 무응답/예 → 초기화, 아니오만 취소
Public Sub AskDailyReset()
    Dim r As Integer
    r = CreateObject("WScript.Shell").Popup( _
        "웹 종목디비를 초기화할까요? 10초 후 자동 초기화", 10, "StarStock", vbYesNo + vbQuestion)
    If r <> vbNo Then
        Shell "cmd.exe /c cd /d " & UPLOADER_WIN & " && python reset_web_db.py", vbNormalFocus
    End If
End Sub

