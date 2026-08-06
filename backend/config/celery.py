import os
from decouple import config

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Only configure Celery if Redis is available (skip in desktop mode)
redis_url = config("REDIS_URL", default="")
if redis_url:
    from celery import Celery
    app = Celery("incident_system")
    app.config_from_object("django.conf:settings", namespace="CELERY")
    app.autodiscover_tasks()
else:
    app = None
