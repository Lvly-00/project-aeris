$ErrorActionPreference = "Stop"
$src = "C:\Users\HP\Documents\Code\Incident\frontend\dist"
$dst = "C:\Program Files\Aeris\resources\frontend"

# Remove old assets
Remove-Item "$dst\assets\*" -Force -ErrorAction SilentlyContinue

# Copy new files
Copy-Item "$src\assets\*" "$dst\assets\" -Force
Copy-Item "$src\index.html" "$dst\index.html" -Force

# Verify
$html = Get-Content "$dst\index.html" -Raw
Write-Host "index.html contains: $($html | Select-String 'index-.*\.js' | ForEach-Object { $_.Matches[0].Value })"
Write-Host "Assets:"
Get-ChildItem "$dst\assets" | ForEach-Object { Write-Host "  $($_.Name) ($($_.Length) bytes)" }
