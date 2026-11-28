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


def _log_path(base: Path) -> Path:
    """Runtime log location.

    The desktop shell passes AI_CONFIG_FILE inside the user data folder, which
    stays writable even when the app is installed under Program Files.
    """
    config_file = os.environ.get("AI_CONFIG_FILE", "")
    if config_file:
        try:
            return Path(config_file).parent / "ai-service.log"
        except Exception:
            pass
    return base / "ai-service.log"


def _ensure_stdio(base: Path) -> None:
    """Give a windowed (console=False) frozen build real stdout/stderr.

    PyInstaller sets ``sys.stdout``/``sys.stderr`` to ``None`` for windowed
    executables. uvicorn's default log handlers then fail on the very first
    record, which kills the service before it binds the port -- the desktop app
    only sees "no frames" for every camera. Redirect both streams to a log file
    so logging, and therefore startup, survives.
    """
    if sys.stdout is not None and sys.stderr is not None:
        return
    try:
        stream = open(_log_path(base), "a", encoding="utf-8", buffering=1)
    except OSError:
        return
    if sys.stdout is None:
        sys.stdout = stream
    if sys.stderr is None:
        sys.stderr = stream


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
    _ensure_stdio(base)
    _load_env(base)

    # First lines in ai-service.log: proof the sidecar started, plus the two
    # settings that explain most "cameras offline" reports. Never the keys.
    print(f"[sidecar] starting from {base}", flush=True)
    print(
        "[sidecar] backend="
        f"{os.environ.get('BACKEND_API_URL', '(unset)')} "
        f"port={os.environ.get('AI_SERVICE_PORT', '8005')} "
        f"ai_key={'set' if os.environ.get('AI_SERVICE_API_KEY') else 'MISSING'} "
        f"internal_key={'set' if os.environ.get('INTERNAL_API_KEY') else 'MISSING'}",
        flush=True,
    )

    import uvicorn

    from app.main import app as application

    host = os.environ.get("AI_SERVICE_HOST", "127.0.0.1")
    port = int(os.environ.get("AI_SERVICE_PORT", "8005"))
    uvicorn.run(application, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()