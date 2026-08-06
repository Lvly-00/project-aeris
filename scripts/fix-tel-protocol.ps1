<#
.SYNOPSIS
    Fixes the tel: protocol handler on Windows to point to Phone Link.
    Phone Link registers for tel: in its manifest, but Chrome sometimes
    claims the protocol without providing a proper handler.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Fixing tel: protocol for Phone Link ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check current state
$telKey = Get-ItemProperty -Path "HKCU:\SOFTWARE\Classes\tel" -ErrorAction SilentlyContinue
$hasShell = Test-Path "HKCU:\SOFTWARE\Classes\tel\shell\open\command"

Write-Host "Current state:"
if ($telKey) {
    Write-Host "  TEL key exists: YES"
    Write-Host "  Shell handler: $(if ($hasShell) { 'YES' } else { 'NO - this is the problem!' })"
    Write-Host "  UserChoice ProgId: $((Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\Shell\Associations\UrlAssociations\tel\UserChoice' -ErrorAction SilentlyContinue).ProgId)"
} else {
    Write-Host "  TEL key: NOT FOUND"
}
Write-Host ""

# 2. Verify Phone Link is installed
$phoneLink = Get-AppxPackage -Name "Microsoft.YourPhone" -ErrorAction SilentlyContinue
if (-not $phoneLink) {
    Write-Warning "Phone Link is not installed! Install it from the Microsoft Store first."
    exit 1
}
Write-Host "Phone Link installed: $($phoneLink.PackageFullName)" -ForegroundColor Green
$pfn = $phoneLink.PackageFamilyName
Write-Host ""

# 3. Remove broken Chrome handler
$userChoicePath = "HKCU:\SOFTWARE\Microsoft\Windows\Shell\Associations\UrlAssociations\tel"
if (Test-Path $userChoicePath) {
    Write-Host "Removing broken UserChoice (Chrome claimed tel: without proper handler)..."
    Remove-Item -Path $userChoicePath -Recurse -Force
    Write-Host "  Removed UserChoice" -ForegroundColor Green
}

# 4. Remove broken tel key
if ($telKey -and -not $hasShell) {
    Write-Host "Removing broken TEL key (exists but has no handler)..."
    Remove-Item -Path "HKCU:\SOFTWARE\Classes\tel" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed TEL key" -ForegroundColor Green
}

# 5. Create proper tel protocol key
Write-Host "Creating proper TEL protocol key for Phone Link..."
New-Item -Path "HKCU:\SOFTWARE\Classes\tel" -Force | Out-Null
New-Item -Path "HKCU:\SOFTWARE\Classes\tel\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\SOFTWARE\Classes\tel" -Name "(default)" -Value "URL:tel" -Force
Set-ItemProperty -Path "HKCU:\SOFTWARE\Classes\tel" -Name "URL Protocol" -Value "" -Force
Set-ItemProperty -Path "HKCU:\SOFTWARE\Classes\tel\shell\open\command" -Name "(default)" -Value "explorer.exe shell:AppsFolder\Microsoft.YourPhone_8wekyb3d8bbwe!App" -Force
Write-Host "  TEL protocol key created with Phone Link handler" -ForegroundColor Green
Write-Host ""

# 6. Register UserChoice for Phone Link
$userChoicePath2 = "HKCU:\SOFTWARE\Microsoft\Windows\Shell\Associations\UrlAssociations\tel"
if (-not (Test-Path $userChoicePath2)) {
    New-Item -Path $userChoicePath2 -Force | Out-Null
}
New-Item -Path "$userChoicePath2\UserChoice" -Force | Out-Null
Set-ItemProperty -Path "$userChoicePath2\UserChoice" -Name "ProgId" -Value "AppX$pfn!App" -Force
# Note: Windows 11 uses a Hash value for integrity. Without the correct hash,
# the OS may fall back to the default behavior instead of using our ProgId.
# The above is a best-effort. If it doesn't work, use Settings UI.

Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing tel: protocol..."
Start-Process "tel:09951816563"
Write-Host "If Phone Link opened, it's working!"
Write-Host ""
Write-Host "If not, manually set Phone Link as the default for TEL:" -ForegroundColor Yellow
Write-Host "  Settings → Apps → Default apps → Choose defaults by protocol" -ForegroundColor Yellow
Write-Host "  Search for 'TEL' → click it → select 'Phone Link'" -ForegroundColor Yellow
