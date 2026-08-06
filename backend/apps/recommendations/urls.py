from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.RecommendationViewSet, basename="recommendation")
urlpatterns = router.urls
