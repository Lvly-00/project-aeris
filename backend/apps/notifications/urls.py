from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.NotificationViewSet, basename="notification")

urlpatterns = [
    path(
        "vapid-public-key/",
        views.VapidPublicKeyView.as_view(),
        name="vapid-public-key",
    ),
    path(
        "push-subscription/",
        views.PushSubscriptionView.as_view(),
        name="push-subscription",
    ),
] + router.urls
