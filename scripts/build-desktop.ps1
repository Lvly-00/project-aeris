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
    [switch]$Publish,
    [string]$Compression = "",
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
        # *.pt is gitignored: fetch the base YOLO weights if this checkout has
        # none (ultralytics downloads them on first use).
        $yoloPath = Join-Path $aiDir "yolo11n.pt"
        if (-not (Test-Path -LiteralPath $yoloPath)) {
            Write-Host "  yolo11n.pt missing; fetching with ultralytics..." -ForegroundColor DarkYellow
            Push-Location $aiDir
            try {
                & $venvPy -c "from ultralytics import YOLO; YOLO('yolo11n.pt')"
                if ($LASTEXITCODE -ne 0) { throw "Could not obtain yolo11n.pt" }
            }
            finally {
                Pop-Location
            }
        }
        Copy-Item -LiteralPath $yoloPath -Destination $staged -Force

        # Accident-detector weights are gitignored too. Ship them when present;
        # without them the sidecar still runs, just without accident detection.
        $accidentWeights = Join-Path $aiDir "models\accident_detector\weights\best.pt"
        $weightsDir = Join-Path $staged "models\accident_detector\weights"
        New-Item -ItemType Directory -Path $weightsDir -Force | Out-Null
        if (Test-Path -LiteralPath $accidentWeights) {
            Copy-Item -LiteralPath $accidentWeights -Destination $weightsDir -Force
        } else {
            Write-Host "  WARNING: accident weights (best.pt) not found; bundling without them" -ForegroundColor DarkYellow
        }

        # The SPA the sidecar serves as the app origin (<staged>\frontend\dist).
        New-Item -ItemType Directory -Path (Join-Path $staged "frontend") -Force | Out-Null
        Copy-Item -Path (Join-Path $frontendDir "dist") -Destination (Join-Path $staged "frontend") -Recurse -Force

        # Write a production .env beside the exe (source: repo .env keys,
        # backend overridden with the baked deployment backend).
        # ai-service\.env is gitignored, so a CI checkout has none. Read it when
        # present, otherwise fall back to the environment/defaults.
        $srcEnv = @{}
        $envPath = Join-Path $aiDir ".env"
        if (Test-Path -LiteralPath $envPath) {
            foreach ($line in Get-Content -LiteralPath $envPath) {
                if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$') {
                    $srcEnv[$matches[1]] = $matches[2].Trim()
                }
            }
        } else {
            Write-Host "  No ai-service\.env found; using environment/defaults" -ForegroundColor DarkYellow
        }
        $aiKey = if ($env:AI_SERVICE_API_KEY) { $env:AI_SERVICE_API_KEY } else { $srcEnv["AI_SERVICE_API_KEY"] }
        $internalKey = if ($env:INTERNAL_API_KEY) { $env:INTERNAL_API_KEY } else { $srcEnv["INTERNAL_API_KEY"] }

        # Never ship the placeholder key: the bundled sidecar authenticates to
        # the backend with these, and a guess silently breaks detection posting.
        $missingKeys = @()
        if (-not $aiKey) { $missingKeys += "AI_SERVICE_API_KEY" }
        if (-not $internalKey) { $missingKeys += "INTERNAL_API_KEY" }
        if ($missingKeys.Count -gt 0) {
            throw (
                "Missing required key(s): " + ($missingKeys -join ", ") +
                ". Set them in ai-service\.env or as environment variables; " +
                "refusing to bundle the placeholder key."
            )
        }
        # Normalise to exactly one /api suffix: -BackendUrl may be given with it.
        $backendApi = "$($bakedBackendUrl.TrimEnd('/') -replace '/api$', '')/api"
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
        # UTF-8 without BOM: the keys are opaque strings, and an OS-generated
        # secret is not guaranteed to be pure ASCII. run_sidecar.py reads the
        # file with utf-8-sig, so a BOM (Windows PowerShell 5.1) is tolerated
        # too, but there is no reason to write one.
        $sidecarEnv = Join-Path $staged ".env"
        [System.IO.File]::WriteAllLines(
            $sidecarEnv,
            [string[]]$envLines,
            (New-Object System.Text.UTF8Encoding($false))
        )
        # Lengths only — never print the keys themselves into the CI log.
        Write-Host (
            "  Sidecar .env: AI_SERVICE_API_KEY ($($aiKey.Length) chars), " +
            "INTERNAL_API_KEY ($($internalKey.Length) chars), BACKEND_API_URL=$backendApi"
        ) -ForegroundColor Green

        # Convenience launcher (used by main.cjs candidates if the exe name differs).
        Set-Content -LiteralPath (Join-Path $staged "start-ai.cmd") -Value "@echo off`r`ncd /d `"%~dp0`"`r`nai-server.exe" -Encoding ascii

        Write-Host "  Sidecar staged to ai-bundle\" -ForegroundColor Green
    } else {
        Write-Host "[4/5] Skipping AI sidecar (pass -IncludeAi to bundle it)..." -ForegroundColor DarkYellow
    }

    Write-Host "[5/5] Packaging installer..." -ForegroundColor Yellow
    # electron-builder ships a 32-bit 7za.exe. Compressing the ~1.3 GB AI
    # sidecar with it can die on Windows with "Insufficient system resources
    # exist to complete the requested service" (error 1450) because a 32-bit
    # process cannot address enough memory for -mx=9 across all cores. Prefer
    # a system-wide 64-bit 7-Zip when one is installed.
    if (-not $env:ELECTRON_BUILDER_7ZIP_PATH) {
        $sevenZip = Join-Path $env:ProgramFiles "7-Zip\7z.exe"
        if (Test-Path -LiteralPath $sevenZip) {
            $env:ELECTRON_BUILDER_7ZIP_PATH = $sevenZip
            Write-Host "  Using 64-bit 7-Zip: $sevenZip" -ForegroundColor Green
        } else {
            Write-Host "  64-bit 7-Zip not found; using electron-builder's 32-bit 7za" -ForegroundColor DarkYellow
            Write-Host "  If packaging fails with 'Insufficient system resources', install 7-Zip or set ELECTRON_BUILDER_COMPRESSION_LEVEL=1" -ForegroundColor DarkYellow
        }
    }
    $builderArgs = @("--config", "electron-builder.yml")
    if ($Compression) { $builderArgs += "--config.compression=$Compression" }
    if ($Publish) { $builderArgs += @("--publish", "always") }
    npx electron-builder @builderArgs
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