<# .SYNOPSIS
    Generates self-signed SSL certificates for local development.
    Uses the backend's Python venv with the cryptography library.
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sslDir = Join-Path $rootDir "ssl"
$python = Join-Path $rootDir "backend" "venv" "Scripts" "python.exe"

if (!(Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
}

# Ensure cryptography is installed
if (!(Test-Path $python)) {
    Write-Error "Python venv not found at $python. Run 'python -m venv backend\venv' first."
    exit 1
}

& $python -c "import cryptography" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing cryptography..."
    & "$(Split-Path $python)\pip.exe" install cryptography
}

Write-Host "Generating self-signed SSL certificates..."
& $python -c @"
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import datetime, ipaddress

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, 'localhost'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'Barangay CCTV Dev'),
])
cert = (x509.CertificateBuilder()
    .subject_name(subject).issuer_name(issuer)
    .public_key(key.public_key()).serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
    .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
    .add_extension(x509.SubjectAlternativeName([
        x509.DNSName('localhost'),
        x509.IPAddress(ipaddress.ip_address('127.0.0.1')),
    ]), critical=False)
    .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
    .sign(key, hashes.SHA256()))
open(r'$sslDir\server.key', 'wb').write(key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.TraditionalOpenSSL,
    serialization.NoEncryption()))
open(r'$sslDir\server.crt', 'wb').write(cert.public_bytes(serialization.Encoding.PEM))
"@

Write-Host "Certificates generated:"
Write-Host "  $sslDir\server.crt"
Write-Host "  $sslDir\server.key"
Write-Host ""
Write-Host "To trust the cert in your browser, install ssl/server.crt into your Trusted Root store."
