@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
if %ERRORLEVEL% equ 0 (
    echo [OK] 빌드 완료: ChoicommaPrintBridge.exe
) else (
    echo [ERROR] 빌드 실패
)
