from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ZoneViewSet, basename="zone")
urlpatterns = router.urls
