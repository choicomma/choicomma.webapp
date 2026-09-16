$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir 'ChoicommaPrintBridge.exe'

if (-not (Test-Path $exePath)) {
    & (Join-Path $scriptDir 'build.ps1')
}

$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, 'ChoicommaPrintBridge.lnk')

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = 'Choicomma Direct Print Bridge'
$shortcut.Save()

Write-Host "STARTUP SHORTCUT INSTALLED: $shortcutPath"
