AERIS AI sidecar staging directory.

Run `scripts\build-desktop.ps1 -IncludeAi` to populate this folder with the
PyInstaller-built ai-server.exe (plus _internal, .env, yolo11n.pt, the accident
model weights and the built SPA). electron-builder ships it as
resources/ai-service, auto-launched by frontend/electron/main.cjs.

When this folder only contains this README, the installer is built WITHOUT the
bundled AI — the ai-service must be started separately on each machine.