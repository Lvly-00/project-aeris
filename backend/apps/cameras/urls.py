from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.CameraViewSet, basename="camera")
urlpatterns = router.urls
