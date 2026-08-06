# URL root — ROOT_URLCONF = "config.urls" resolves to this package.
# All routing logic lives in main.py; this file just re-exports it
# so Django's URL resolver finds urlpatterns at the package level.
from .main import urlpatterns, handler404, handler500  # noqa: F401
