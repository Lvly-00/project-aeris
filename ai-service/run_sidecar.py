"""
Packaged entry point for the AI sidecar (built with PyInstaller via
ai-sidecar.spec, invoked by scripts/build-desktop.ps1 with -IncludeAi).

Runs uvicorn WITHOUT reload — reload spawns a subprocess of the frozen exe and
is unnecessary/broken in a packaged app. Runtime files (.env, model weights,
config json) are resolved relative to the exe directory, which is the working
directory used when the desktop app launches the sidecar.
"""
import os
import sys
from pathlib import Path


def _load_env(base: Path) -> None:
    """Load `.env` beside the exe into os.environ (decouple checks env first)."""
    env_file = base / ".env"
    if not env_file.is_file():
        return
    for raw in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


def main() -> None:
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).resolve().parent
    else:
        base = Path.cwd()
    os.chdir(base)
    _load_env(base)

    import uvicorn

    from app.main import app as application

    host = os.environ.get("AI_SERVICE_HOST", "127.0.0.1")
    port = int(os.environ.get("AI_SERVICE_PORT", "8005"))
    uvicorn.run(application, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()