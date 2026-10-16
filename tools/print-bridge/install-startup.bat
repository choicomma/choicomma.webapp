@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [초이콤마 다이렉트 프린트 브릿지 윈도우 시작프로그램 등록]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-startup.ps1"
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo 시작프로그램 등록이 완료되었습니다.
    echo 이제 컴퓨터 부팅 시 자동으로 백그라운드에서 실행됩니다.
    echo ========================================================
) else (
    echo [오류] 시작프로그램 등록 실패
)
pause
