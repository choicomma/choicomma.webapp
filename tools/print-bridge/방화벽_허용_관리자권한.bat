@echo off
chcp 65001 > nul
echo ========================================================
echo   [초이콤마] 원격 네트워크 다이렉트 출력 방화벽 포트 허용
echo ========================================================
echo.
echo 다른 컴퓨터(노트북)에서 이 컴퓨터로 송장 인쇄 신호를
echo 보낼 수 있도록 윈도우 방화벽(포트 18080)을 허용합니다...
echo.

netsh advfirewall firewall add rule name="ChoicommaPrintBridge" dir=in action=allow protocol=TCP localport=18080 profile=any

echo.
if %ERRORLEVEL% equ 0 (
    echo [성공] 윈도우 방화벽에 포트 18080이 정상적으로 허용되었습니다!
    echo 이제 같은 와이파이(네트워크)의 어떤 컴퓨터나 노트북에서도
    echo 초이콤마 관리자 페이지를 통해 이 컴퓨터의 라벨 프린터로 즉시 인쇄할 수 있습니다.
) else (
    echo [주의] 관리자 권한이 필요합니다.
    echo 이 파일을 마우스 우클릭 후 '관리자 권한으로 실행'을 선택해주세요.
)
echo.
pause
