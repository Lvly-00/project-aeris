<#
.SYNOPSIS
    Builds the Aeris desktop installer (thin client).
    Output: frontend/release/Aeris Setup x.x.x.exe

    The desktop app no longer bundles Django, Python, SQLite or the AI
    service — it is a thin client that loads the configured server. The
    server URL is BAKED IN at build time (frontend/electron/server-url.json)
    so users never have to edit files by hand.

.PARAMETER ServerUrl
    The URL the packaged app should load. Defaults to the deployed site.

    Example:
      .\scripts\build-desktop.ps1 -ServerUrl "https://project-aeris-pearl.vercel.app"
#>
param(
    [string]$ServerUrl = "https://project-aeris-pearl.vercel.app"
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$frontendDir = Join-Path $rootDir "frontend"
$serverUrlFile = Join-Path $frontendDir "electron\server-url.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Desktop App (thin client)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("Server URL: {0}" -f $ServerUrl) -ForegroundColor Yellow

Push-Location $frontendDir

try {
    Write-Host "[1/3] Writing baked server URL..." -ForegroundColor Yellow
    $json = @{ url = $ServerUrl } | ConvertTo-Json
    Set-Content -Path $serverUrlFile -Value $json -Encoding UTF8
    Write-Host "  Written to electron\server-url.json" -ForegroundColor Green

    Write-Host "[2/3] Type-checking..." -ForegroundColor Yellow
    npx tsc -b
    if ($LASTEXITCODE -ne 0) { throw "Type-check failed" }

    Write-Host "[3/3] Packaging installer..." -ForegroundColor Yellow
    npx electron-builder --config electron-builder.yml
    if ($LASTEXITCODE -ne 0) { throw "Desktop build failed" }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Build Complete!" -ForegroundColor Cyan
    Write-Host (" Installer: frontend\release\")
    Write-Host (" Server URL baked in: {0}" -f $ServerUrl)
    Write-Host " Override at runtime only if needed: AERIS_SERVER_URL env var or %APPDATA%\aeris-cctv\server-url.txt" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor Cyan
}
finally {
    Pop-Location
}