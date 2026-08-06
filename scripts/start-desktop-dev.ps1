<#
.SYNOPSIS
    Starts the desktop app in development mode.
    Launches: Vite dev server, Django backend, and Electron window.
#>

$ErrorActionPreference = "Continue"
$scriptPath = Split-Path -Parent $PSCommandPath
$rootDir = Split-Path -Parent $scriptPath
$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"
$python = Join-Path (Join-Path (Join-Path $rootDir "backend") "venv") "Scripts\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Aeris - Desktop Dev Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Make sure frontend is built (for Django static serving fallback)
Write-Host "[1/3] Building frontend..." -ForegroundColor Yellow
Push-Location $frontendDir
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Frontend build failed, but we'll use Vite dev server"
}
Pop-Location

# 2. Apply migrations (if needed)
Write-Host "[2/3] Applying database migrations..." -ForegroundColor Yellow
$env:DESKTOP_MODE = "True"
$env:DESKTOP_FRONTEND_DIR = "$frontendDir\dist"
$env:DEBUG = "True"
$env:PYTHONUNBUFFERED = "1"
Push-Location $backendDir
& $python manage.py migrate 2>&1
& $python manage.py seed_default_admin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed!"
    exit 1
}
Pop-Location
Write-Host "  Migrations applied" -ForegroundColor Green

# 3. Build frontend + start Vite dev server
Write-Host "[3/3] Starting dev environment..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Starting Vite dev server + Electron"
Write-Host "  (Electron auto-starts Django backend)"
Write-Host ""

Push-Location $frontendDir
Write-Host "  Starting Vite dev server..." -ForegroundColor Gray
$viteJob = Start-Job -ScriptBlock {
  Set-Location -LiteralPath $using:frontendDir
  npm run dev
}

Write-Host "  Starting Electron..." -ForegroundColor Cyan
npm run electron
Pop-Location

# Cleanup
Stop-Job $viteJob -ErrorAction SilentlyContinue
Remove-Job $viteJob -ErrorAction SilentlyContinue
