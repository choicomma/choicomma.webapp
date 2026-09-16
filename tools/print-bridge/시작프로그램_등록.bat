@echo off
chcp 65001 > nul
echo ========================================================
echo   [초이콤마] 윈도우 시작 시 자동 실행 등록
echo ========================================================
echo.
set SCRIPT="%TEMP%\create_bridge_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\ChoicommaPrintBridge.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0ChoicommaPrintBridge.exe" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "Choicomma Direct Print Bridge" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%
echo [성공] 윈도우 부팅(시작) 시 초이콤마 프린트 브릿지가 자동으로 켜지도록 등록되었습니다!
echo 이제 매번 수동으로 실행하지 않아도 컴퓨터를 켜면 트레이에서 항상 대기합니다.
echo.
pause
