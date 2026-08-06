from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ReportViewSet, basename="report")
urlpatterns = router.urls
