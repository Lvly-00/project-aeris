<#
.SYNOPSIS
    Builds the desktop app for distribution.
    Output: frontend/release/Barangay CCTV Setup x.x.x.exe
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Desktop App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Clean venv of dev-only packages to reduce installer size
Write-Host "[0/4] Cleaning venv..." -ForegroundColor Yellow
$venvPkgs = Join-Path (Join-Path (Join-Path (Join-Path $rootDir "backend") "venv") "Lib") "site-packages"
$venvScripts = Join-Path (Join-Path (Join-Path $rootDir "backend") "venv") "Scripts"
@("pip", "setuptools", "wheel") | ForEach-Object {
    $pkgDir = Join-Path $venvPkgs $_
    if (Test-Path -LiteralPath $pkgDir) { Remove-Item -Recurse -Force $pkgDir }
}
Get-ChildItem -Path $venvScripts -Filter "pip*" | Remove-Item -Force
Get-ChildItem -Path $venvScripts -Filter "*.exe.manifest" | Remove-Item -Force
Write-Host "  Venv cleaned" -ForegroundColor Green

# 1. Build frontend
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Push-Location $frontendDir
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
Write-Host "  Frontend built" -ForegroundColor Green

# 2. Collect backend static files
Write-Host "[2/4] Collecting Django static files..." -ForegroundColor Yellow
$backendDir = Join-Path $rootDir "backend"
$python = Join-Path (Join-Path (Join-Path (Join-Path $rootDir "backend") "venv") "Scripts") "python.exe"
Push-Location $backendDir
$env:DESKTOP_MODE = "True"
$env:DESKTOP_DB_DIR = Join-Path $env:TEMP "barangay_build"
$env:DESKTOP_FRONTEND_DIR = Join-Path $frontendDir "dist"
& $python manage.py collectstatic --noinput 2>&1
Pop-Location
Write-Host "  Static files collected" -ForegroundColor Green

# 3. Package with electron-builder
Write-Host "[3/4] Packaging with electron-builder..." -ForegroundColor Yellow
Push-Location $frontendDir
npm exec electron-builder -- --config electron-builder.yml
if ($LASTEXITCODE -ne 0) { throw "Packaging failed" }
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Build Complete!" -ForegroundColor Cyan
Write-Host " Installer: frontend\release\" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
