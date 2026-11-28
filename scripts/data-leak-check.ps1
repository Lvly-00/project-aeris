<#
  AERIS read-only data-leak check.
  Run:  powershell -ExecutionPolicy Bypass -File .\scripts\data-leak-check.ps1
  Does not log in, modify, or send data anywhere.
#>
$ErrorActionPreference = 'SilentlyContinue'
$Web  = 'https://project-aeris-pearl.vercel.app'
$Api  = 'https://project-aeris-09w4.onrender.com'
$Repo = Split-Path -Parent $PSScriptRoot
$rows = @()

function Record([string]$Check, [string]$Result, [string]$Detail) {
  $script:rows += [pscustomobject]@{ Check = $Check; Result = $Result; Detail = $Detail }
}
function Head([string]$Url) { curl.exe -sS -I -L --max-time 20 $Url 2>$null | Out-String }
function Body([string]$Url) { curl.exe -sS -L --max-time 30 $Url 2>$null | Out-String }
function Clean([string]$s, [int]$n = 100) {
  $s = ($s -replace '\s+', ' ').Trim()
  if ($s.Length -gt $n) { $s.Substring(0, $n) + '…' } else { $s }
}

Write-Host "`n=== 1. Sensitive files on the Vercel host ===" -ForegroundColor Cyan
foreach ($p in @('/.env','/.git/config','/assets/index-F4_12mxw.js.map','/robots.txt','/sitemap.xml')) {
  $b = Body ($Web + $p)
  if ($b -match 'SECRET_KEY|BREVO_API_KEY|BEGIN (RSA|OPENSSH|PRIVATE)|CLOUDINARY_URL|DATABASE_URL') {
    Record "Web $p" 'LEAK' 'Body contains secret markers'
  } elseif ($b -match '<!DOCTYPE html>') {
    Record "Web $p" 'SAFE' 'SPA fallback returned index.html, not file contents'
  } else {
    Record "Web $p" 'CHECK' (Clean $b 80)
  }
}

Write-Host "`n=== 2. Frontend security headers ===" -ForegroundColor Cyan
$h = Head ($Web + '/')
$need = @('Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy')
$missing = @($need | Where-Object { $h -notmatch "(?mi)^\s*${_}\s*:" })
Record 'Frontend headers' $(if ($missing) { 'WARN' } else { 'PASS' }) $(if ($missing) { 'Missing: ' + ($missing -join ', ') } else { 'All present' })
$hsts = if ($h -match '(?mi)^strict-transport-security') { 'present' } else { 'MISSING' }
Record 'HSTS' $hsts 'Strict-Transport-Security on Vercel host'

Write-Host "`n=== 3. API docs / schema exposure ===" -ForegroundColor Cyan
foreach ($p in @('/api/schema/','/api/docs/','/api/redoc/','/admin/','/api/health/')) {
  $head = Head ($Api + $p)
  $status = [regex]::Match($head, '(?m)^HTTP/\S+\s+(\d{3})')
  $code = if ($status.Success) { $status.Groups[1].Value } else { '?' }
  Record "API $p" $(if ($code -eq '200') { 'EXPOSED' } else { 'OK' }) "HTTP $code"
}

Write-Host "`n=== 4. Internal endpoints must reject us ===" -ForegroundColor Cyan
foreach ($p in @('/internal/cameras/list/','/api/ai/incidents/create/')) {
  $b = Body ($Api + $p)
  Record "Service $p" $(if ($b -match 'Invalid or missing') { 'PASS' } else { 'FAIL' }) (Clean $b 90)
}

Write-Host "`n=== 5. CORS with a hostile origin ===" -ForegroundColor Cyan
$cors = curl.exe -sS -i -X OPTIONS --max-time 20 `
  -H "Origin: https://evil.example.com" `
  -H "Access-Control-Request-Method: GET" `
  ($Api + '/api/accounts/me/') 2>$null | Out-String
Record 'CORS hostile origin' $(if ($cors -match '(?i)access-control-allow-origin') { 'FAIL' } else { 'PASS' }) `
  $(if ($cors -match '(?i)access-control-allow-origin') { 'ACAO returned to evil origin' } else { 'No ACAO header returned' })

Write-Host "`n=== 6. User enumeration ===" -ForegroundColor Cyan
$loginBody = (@{email='nobody-zzz@example.com';password='wrong'} | ConvertTo-Json -Compress).Replace('"','\"')
$login = curl.exe -sS --max-time 20 -H "Content-Type: application/json" `
  -d $loginBody `
  ($Api + '/api/accounts/login/') 2>$null | Out-String
Record 'Login enumeration' $(if ($login -match 'No account is registered') { 'LEAK' } else { 'OK' }) (Clean $login 110)
$resetBody = (@{email='nobody-zzz@example.com'} | ConvertTo-Json -Compress).Replace('"','\"')
$reset = curl.exe -sS --max-time 20 -H "Content-Type: application/json" `
  -d $resetBody `
  ($Api + '/api/accounts/password-reset/') 2>$null | Out-String
Record 'Reset enumeration' $(if ($reset -match 'No account is registered') { 'LEAK' } else { 'OK' }) (Clean $reset 110)

Write-Host "`n=== 7. Frontend JavaScript bundle ===" -ForegroundColor Cyan
$js = Body ($Web + '/assets/index-F4_12mxw.js')
$urls = ([regex]::Matches($js, 'https://[A-Za-z0-9./_-]+') | ForEach-Object { $_.Value } | Sort-Object -Unique) -join ', '
Record 'Bundle endpoints' 'INFO' (Clean $urls 180)
$secs = [regex]::Matches($js, 'API_KEY|SECRET_KEY|BEGIN (RSA|OPENSSH|PRIVATE)|DATABASE_URL') |
        Select-Object -First 5 | ForEach-Object { $_.Value }
Record 'Bundle secrets' $(if ($secs) { 'LEAK' } else { 'PASS' }) $(if ($secs) { $secs -join ', ' } else { 'none found' })

Write-Host "`n=== 8. Git repository ===" -ForegroundColor Cyan
Push-Location $Repo
$tracked = git ls-files | Out-String
$susp = @($tracked -split "`n" | ForEach-Object { $_.Trim() } | Where-Object {
  $_ -match '\.env|sqlite|server\.key|\.pem|credential|secret'
})
# Templates and VITE_* frontend build-target files are intentionally tracked;
# report them for manual review rather than treating them as leaked secrets.
$templates = @($susp | Where-Object {
  $_ -match '(^|/)\.env\.(example|sample|template)$' -or
  $_ -match '\.env\.example$' -or
  $_ -match '(^|/)frontend/\.env\.[A-Za-z0-9_-]+$'
})
$real = @($susp | Where-Object { $templates -notcontains $_ })
if ($real) {
  Record 'Tracked sensitive files' 'LEAK' ($real -join ', ')
} elseif ($templates) {
  Record 'Tracked sensitive files' 'INFO' ('Example/template files only — review manually: ' + ($templates -join ', '))
} else {
  Record 'Tracked sensitive files' 'PASS' 'none'
}
$hardRaw = git grep -inE 'admin123|sk-[A-Za-z0-9]{20,}|xox[baprs]-|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}' -- . 2>$null | Out-String
# Password-strength lists and this scanner intentionally contain common weak
# passwords as examples; they are not leaked credentials.
$hard = @($hardRaw -split "`n" | Where-Object {
  $_ -match '\S' -and
  $_ -notmatch 'backend/apps/accounts/validators\.py' -and
  $_ -notmatch 'frontend/src/shared/utils/password\.ts' -and
  $_ -notmatch 'scripts/data-leak-check\.ps1'
}) -join "`n"
if ($hard.Trim()) {
  Record 'Hardcoded credentials' 'LEAK' (Clean $hard 140)
} elseif ($hardRaw.Trim()) {
  Record 'Hardcoded credentials' 'INFO' 'Only weak-password denylists / scanner patterns matched'
} else {
  Record 'Hardcoded credentials' 'PASS' 'none found'
}
$db = 'backend/db.sqlite3.bak-pre-lookup-refactor'
$dbTracked = git ls-files --error-unmatch $db 2>$null
if ($dbTracked) {
  Record 'Tracked DB backup' 'LEAK' 'Still in the git index: user accounts + password hashes'
} elseif (Test-Path $db) {
  Record 'Tracked DB backup' 'INFO' 'Removed from git index but still on disk; delete locally and purge from history'
  @'
import sqlite3
c = sqlite3.connect("backend/db.sqlite3.bak-pre-lookup-refactor")
print("Accounts in local DB backup:", c.execute("select count(*) from accounts_user").fetchone()[0])
'@ | & ".\backend\portable-python\python.exe" -
} else {
  Record 'Tracked DB backup' 'PASS' 'Not tracked and not present locally'
}
Pop-Location

Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
$rows | Format-Table -AutoSize -Wrap
Write-Host "LEAK/FAIL/WARN/EXPOSED = needs fixing. PASS/SAFE/OK = looks fine. INFO = review manually." -ForegroundColor Yellow
