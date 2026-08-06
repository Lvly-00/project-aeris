# Settings module selector.
#
# Set DJANGO_SETTINGS_MODULE to one of:
#   config.settings.development   (local dev, SQLite, permissive CORS)
#   config.settings.production    (Docker/server, MySQL, strict security)
#   config.settings.desktop       (Electron, SQLite, local media)
#
# If DJANGO_SETTINGS_MODULE points here (config.settings) we transparently
# forward to the right sub-module so existing launch commands keep working.
import os as _os

_env = _os.environ.get("DJANGO_ENV", "development").lower()
_module_map = {
    "development": "config.settings.development",
    "production":  "config.settings.production",
    "desktop":     "config.settings.desktop",
}
_target = _module_map.get(_env, "config.settings.development")

# Only do the transparent redirect when this __init__ is the entry point.
# If a specific sub-module was already selected via DJANGO_SETTINGS_MODULE,
# Django won't import this file at all so there's no double-import risk.
from importlib import import_module as _im  # noqa: E402
_mod = _im(_target)
# Re-export everything from the selected module so
# `from config.settings import X` works regardless of entry point.
from config.settings.base import *  # noqa: F401, F403
