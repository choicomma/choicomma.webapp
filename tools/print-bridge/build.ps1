$ErrorActionPreference = 'Stop'
$cscPath = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $cscPath)) {
    $cscPath = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$csFile = Join-Path $scriptDir 'ChoicommaPrintBridge.cs'
$exeFile = Join-Path $scriptDir 'ChoicommaPrintBridge.exe'

Write-Host "Compiling $csFile to $exeFile..."

$refs = @(
    '/r:System.dll',
    '/r:System.Drawing.dll',
    '/r:System.Windows.Forms.dll',
    '/r:System.Web.Extensions.dll'
)

$args = @(
    '/nologo',
    '/target:winexe',
    '/optimize+'
) + $refs + @("/out:$exeFile", $csFile)

& $cscPath $args

if ($LASTEXITCODE -eq 0 -and (Test-Path $exeFile)) {
    Write-Host "BUILD SUCCESS: $exeFile"
} else {
    Write-Error "BUILD FAILED"
}
