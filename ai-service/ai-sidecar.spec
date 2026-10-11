# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the AERIS AI sidecar (one-dir build).

Build from the ai-service root:
    .venv\Scripts\python.exe -m PyInstaller --noconfirm --clean ai-sidecar.spec

Output: dist/ai-server/ (executable + _internal). scripts\build-desktop.ps1
stages this into frontend/build/ai-service so electron-builder ships it under
resources/ai-service, where frontend/electron/main.cjs auto-launches it.
Runtime files (.env, yolo11n.pt, model weights) are copied beside the exe by
the build script — not embedded here (ultralytics/torch load them as files).
"""
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules

datas = []
binaries = []
hiddenimports = []

# ultralytics ships data dirs + dynamic imports; cv2 needs its plugins.
for pkg in ("ultralytics", "cv2"):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

hiddenimports += collect_submodules("app")
hiddenimports += [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
]

a = Analysis(
    ["run_sidecar.py"],
    pathex=[os.getcwd()],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ai-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="ai-server",
)