<#
.SYNOPSIS
    Builds the Aeris desktop installer (thin client).
    Output: frontend/release/Aeris Setup x.x.x.exe

    The desktop app no longer bundles Django, Python, SQLite or the AI
    service — it is a thin client that loads the deployed server. Point
    installs at the server with the AERIS_SERVER_URL environment variable,
    or a one-line "server-url.txt" file in the app data folder.
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Desktop App (thin client)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $frontendDir

try {
    Write-Host "[1/2] Type-checking and packaging..." -ForegroundColor Yellow
    npm run build:desktop
    if ($LASTEXITCODE -ne 0) { throw "Desktop build failed" }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Build Complete!" -ForegroundColor Cyan
    Write-Host " Installer: frontend\release\" -ForegroundColor Cyan
    Write-Host " Server URL: set AERIS_SERVER_URL or" -ForegroundColor Cyan
    Write-Host "   %APPDATA%\Aeris\server-url.txt on client PCs" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
