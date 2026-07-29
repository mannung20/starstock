' =====================================================================
' StarStock — 3분봉 매수신호 재생 버튼 매크로
' 이 통합문서(.xlsm)의 A~F 3분봉 데이터를 replay_3min.py 로 재생합니다.
' 사전조건: 웹 관리자 상단바에서 [운영정지 ON] (스크립트가 자동 확인·거부).
' 흐름: 버튼 클릭 → WSL 콘솔 열림 → 종목코드/전일고가 입력 → 재생 → [replay] 태깅.
' =====================================================================
Sub RunReplay()
    Dim uploaderDir As String, winPath As String, wslPath As String, cmd As String

    ' uploader 폴더(WSL 경로) — 프로젝트 이동 시 이 줄만 수정
    uploaderDir = "/mnt/c/Users/nick7/0.test/projects/7.0.1-excel-vercel-starstock-service/uploader"

    ' 이 통합문서의 Windows 경로 → WSL 경로 변환 (C: 드라이브 가정)
    winPath = ThisWorkbook.FullName
    wslPath = Replace(winPath, "\", "/")
    wslPath = Replace(wslPath, "C:/", "/mnt/c/")

    ' WSL 콘솔에서 재생 실행 (콘솔 유지 = /k)
    cmd = "cmd.exe /k wsl bash -lc ""cd " & uploaderDir & " && python3 replay_3min.py '" & wslPath & "'"""
    Shell cmd, vbNormalFocus
End Sub
