from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("dispatchers", views.DispatcherViewSet)
router.register("dispatches", views.DispatchViewSet)
router.register("messages", views.DispatchMessageViewSet, basename="message")
router.register("timeline", views.IncidentTimelineViewSet, basename="timeline")
urlpatterns = router.urls
