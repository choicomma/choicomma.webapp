@echo off
chcp 65001 >nul
echo [초이콤마 다이렉트 프린트 브릿지 종료 중...]
taskkill /F /IM ChoicommaPrintBridge.exe 2>nul
if %ERRORLEVEL% equ 0 (
    echo 정상적으로 종료되었습니다.
) else (
    echo 실행 중인 프로세스가 없습니다.
)
