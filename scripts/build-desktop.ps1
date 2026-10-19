<#
.SYNOPSIS
    Builds the Aeris desktop installer (bundled client).
    Output: frontend/release/Aeris Setup x.x.x.exe

    The desktop app is a BUNDLE: it loads the local ai-service origin
    (http://localhost:8005), which serves BOTH the built SPA and /ai/*.
    The API and WebSocket point at the deployed backend
    (https://project-aeris.onrender.com).

    This script:
      1. Bakes electron/server-url.json        -> { url, backendUrl }
      2. Builds the frontend bundle            -> npx vite build --mode bundle (frontend/dist)
      3. (optional) Builds the AI sidecar      -> PyInstaller -> frontend/build/ai-service
      4. Packages the installer                -> npx electron-builder

.PARAMETER ServerUrl
    The local app origin baked into the installer. Default http://localhost:8005.

.PARAMETER BackendUrl
    The deployed backend origin for /api + WebSocket/media. Default
    https://project-aeris.onrender.com.

.PARAMETER IncludeAi
    Also build the AI service into a self-contained PyInstaller sidecar and
    bundle it as resources\ai-service (auto-launched by the packaged app).
    Slower: packaging torch/opencv/ultralytics takes several minutes.

.PARAMETER Local
    Fully-local test build: app origin http://localhost:8005, backend
    http://localhost:8000 (requires the local Django backend running too).

.NOTES
    Do NOT use `npm run build:desktop` interchangeably — it re-bakes the
    server URLs via scripts/write-server-url.cjs and will clobber this script's
    baked values. Use THIS script.

    Without -IncludeAi the installed app expects the ai-service to already be
    running on the ServerUrl origin (for example started from the repo).
#>
param(
    [string]$ServerUrl = "",
    [string]$BackendUrl = "",
    [switch]$IncludeAi,
    [switch]$Local
)

$ErrorActionPreference = "Stop"

# Bundled deployment values.
$DefaultBundleUrl = "http://localhost:8005"              # local ai-service origin (SPA + /ai)
$DefaultBackendUrl = "https://project-aeris.onrender.com" # deployed API/WS backend

$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$frontendDir = Join-Path $rootDir "frontend"
$aiDir = Join-Path $rootDir "ai-service"
$serverUrlFile = Join-Path $frontendDir "electron\server-url.json"

# ── Resolve the baked app origin AND backend origin ─────────────────────────
if ($ServerUrl) {
    $bakedUrl = $ServerUrl
} elseif ($env:AERIS_SERVER_URL) {
    $bakedUrl = $env:AERIS_SERVER_URL
} else {
    $bakedUrl = $DefaultBundleUrl
}

if ($BackendUrl) {
    $bakedBackendUrl = $BackendUrl
} elseif ($env:AERIS_BACKEND_URL) {
    $bakedBackendUrl = $env:AERIS_BACKEND_URL
} elseif ($Local) {
    $bakedBackendUrl = "http://localhost:8000"
} else {
    $bakedBackendUrl = $DefaultBackendUrl
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Desktop App (bundled client)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("App origin (SPA + /ai): {0}" -f $bakedUrl) -ForegroundColor Yellow
Write-Host ("Backend origin (/api + WS): {0}" -f $bakedBackendUrl) -ForegroundColor Yellow
Write-Host ("Bundled AI sidecar: {0}" -f $(if ($IncludeAi) { "YES (PyInstaller)" } else { "no" })) -ForegroundColor Yellow
Write-Host ""

Push-Location $frontendDir

try {
    Write-Host "[1/5] Writing baked server URLs..." -ForegroundColor Yellow
    $json = @{ url = $bakedUrl; backendUrl = $bakedBackendUrl } | ConvertTo-Json
    Set-Content -Path $serverUrlFile -Value $json -Encoding UTF8
    Write-Host "  Written to electron\server-url.json" -ForegroundColor Green

    Write-Host "[2/5] Type-checking..." -ForegroundColor Yellow
    npx tsc -b
    if ($LASTEXITCODE -ne 0) { throw "Type-check failed" }

    Write-Host "[3/5] Building frontend bundle (mode=bundle)..." -ForegroundColor Yellow
    npx vite build --mode bundle
    if ($LASTEXITCODE -ne 0) { throw "Frontend bundle build failed" }
    Write-Host "  Built dist\ (served by the ai-service at the app origin)" -ForegroundColor Green

    if ($IncludeAi) {
        Write-Host "[4/5] Building AI sidecar (PyInstaller)..." -ForegroundColor Yellow
        $venvPy = Join-Path $aiDir ".venv\Scripts\python.exe"
        if (-not (Test-Path -LiteralPath $venvPy)) { throw "ai-service venv not found: $venvPy" }

        Push-Location $aiDir
        try {
            # Ensure PyInstaller is available inside the ai-service venv.
            & $venvPy -m pip install --quiet pyinstaller
            if ($LASTEXITCODE -ne 0) { throw "pip install pyinstaller failed" }

            Write-Host "  PyInstaller: ai-sidecar.spec (this takes several minutes)..." -ForegroundColor DarkYellow
            & $venvPy -m PyInstaller --noconfirm --clean ai-sidecar.spec
            if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed" }
        }
        finally {
            Pop-Location
        }

        # Stage the sidecar into frontend\ai-bundle for electron-builder.
        # Keep the tracked placeholders (README.txt/.gitignore) so the repo
        # always has the directory; clear any stale build artifacts.
        $staged = Join-Path $frontendDir "ai-bundle"
        $keepPlaceholders = @("README.txt", ".gitignore")
        if (Test-Path -LiteralPath $staged) {
            Get-ChildItem -LiteralPath $staged -Force |
                Where-Object { $keepPlaceholders -notcontains $_.Name } |
                Remove-Item -Recurse -Force
        } else {
            New-Item -ItemType Directory -Path $staged -Force | Out-Null
        }

        $buildOut = Join-Path $aiDir "dist\ai-server"
        if (-not (Test-Path -LiteralPath $buildOut)) { throw "PyInstaller output missing: $buildOut" }
        Copy-Item -Path (Join-Path $buildOut "*") -Destination $staged -Recurse -Force

        # Runtime files that ultralytics/torch load as files (never embedded).
        Copy-Item -LiteralPath (Join-Path $aiDir "yolo11n.pt") -Destination $staged -Force
        $weightsDir = Join-Path $staged "models\accident_detector\weights"
        New-Item -ItemType Directory -Path $weightsDir -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $aiDir "models\accident_detector\weights\best.pt") -Destination $weightsDir -Force

        # The SPA the sidecar serves as the app origin (<staged>\frontend\dist).
        New-Item -ItemType Directory -Path (Join-Path $staged "frontend") -Force | Out-Null
        Copy-Item -Path (Join-Path $frontendDir "dist") -Destination (Join-Path $staged "frontend") -Recurse -Force

        # Write a production .env beside the exe (source: repo .env keys,
        # backend overridden with the baked deployment backend).
        $srcEnv = @{}
        foreach ($line in Get-Content -LiteralPath (Join-Path $aiDir ".env")) {
            if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$') {
                $srcEnv[$matches[1]] = $matches[2].Trim()
            }
        }
        $aiKey = if ($srcEnv["AI_SERVICE_API_KEY"]) { $srcEnv["AI_SERVICE_API_KEY"] } else { "ai-service-key" }
        $internalKey = if ($srcEnv["INTERNAL_API_KEY"]) { $srcEnv["INTERNAL_API_KEY"] } else { $aiKey }
        $backendApi = "$($bakedBackendUrl.TrimEnd('/'))/api"
        $envLines = @(
            "AI_SERVICE_HOST=127.0.0.1",
            "AI_SERVICE_PORT=8005",
            "AI_SERVICE_API_KEY=$aiKey",
            "INTERNAL_API_KEY=$internalKey",
            "BACKEND_API_URL=$backendApi",
            "YOLO_MODEL_PATH=yolo11n.pt",
            "ACCIDENT_MODEL_PATH=models/accident_detector/weights/best.pt",
            "DEVICE=cpu",
            "DEFAULT_CONF_THRESHOLD=0.3",
            "IOU_THRESHOLD=0.5",
            "FRAME_SKIP=2",
            "DETECTION_FPS=10.0",
            "FRAME_WIDTH=640",
            "FRAME_HEIGHT=640",
            "API_TIMEOUT=10",
            "RECONNECT_BASE_DELAY=1.0",
            "RECONNECT_MAX_DELAY=30.0"
        )
        Set-Content -LiteralPath (Join-Path $staged ".env") -Value $envLines -Encoding ascii

        # Convenience lamag uncher (used by main.cjs candidates if the exe name differs).
        Set-Content -LiteralPath (Join-Path $staged "start-ai.cmd") -Value "@echo off`r`ncd /d `"%~dp0`"`r`nai-server.exe" -Encoding ascii

        Write-Host "  Sidecar staged to ai-bundle\" -ForegroundColor Green
    } else {
        Write-Host "[4/5] Skipping AI sidecar (pass -IncludeAi to bundle it)..." -ForegroundColor DarkYellow
    }

    Write-Host "[5/5] Packaging installer..." -ForegroundColor Yellow
    npx electron-builder --config electron-builder.yml
    if ($LASTEXITCODE -ne 0) { throw "Desktop build failed" }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Build Complete!" -ForegroundColor Cyan
    Write-Host (" Installer: frontend\release\")
    Write-Host (" App origin baked in: {0}" -f $bakedUrl)
    Write-Host (" Backend origin baked in: {0}" -f $bakedBackendUrl)
    if ($IncludeAi) {
        Write-Host " AI sidecar bundled: the installed app auto-starts the AI service." -ForegroundColor Green
    } else {
        Write-Host " AI sidecar NOT bundled: start the ai-service (uvicorn app.main:app --port 8005) on each machine." -ForegroundColor DarkYellow
    }
    Write-Host " Runtime overrides: AERIS_SERVER_URL / AERIS_BACKEND_URL env, or %APPDATA%\aeris-cctv\server-url.txt" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor Cyan
}
finally {
    Pop-Location
}