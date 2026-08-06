from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.AIConfigurationViewSet, basename="ai-config")
urlpatterns = router.urls
