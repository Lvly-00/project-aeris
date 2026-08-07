from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Registering with empty string means the base is /api/accounts/
router.register("", views.UserViewSet, basename="user")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("me/", views.UserDetailView.as_view(), name="user-detail"),
    path("", include(router.urls)),
]