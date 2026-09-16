@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "ChoicommaPrintBridge.exe" (
    call build.bat
)

echo [초이콤마 다이렉트 프린트 브릿지 실행 중...]
start "" "ChoicommaPrintBridge.exe"
echo 백그라운드 및 작업 표시줄 트레이에서 실행되었습니다.
