import logging
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    LoginSerializer, 
    VerifyPasswordSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    authentication_classes = [JWTAuthentication] 
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        qs = self.get_queryset()
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def update(self, request, pk=None):
        user = self.get_object()
        if request.user != user and request.user.role != "Admin":
            return Response({"error": "Only admins can update other users"}, status=403)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        if request.user.role != "Admin":
            return Response({"error": "Only admins can delete users"}, status=403)
        user = self.get_object()
        if user == request.user:
            return Response({"error": "Cannot delete yourself"}, status=400)
        user.is_active = False
        user.save()
        
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.USER_DEACTIVATED,
            resource_type="User",
            resource_id=user.id,
            details={"deactivated_user": user.username},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["POST"], url_path="login", permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.LOGIN,
            resource_type="Auth",
            details={"ip": request.META.get("REMOTE_ADDR", "")},
        )
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        })

    @action(detail=False, methods=["POST"], url_path="logout")
    def logout(self, request):
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.LOGOUT,
            resource_type="Auth",
        )
        return Response({"detail": "Logged out successfully"})

    @action(detail=False, methods=["GET"], url_path="dispatchers")
    def dispatchers(self, request):
        users = User.objects.filter(
            role__in=[User.Role.TANOD, User.Role.ADMIN, User.Role.OPERATOR],
            is_active=True,
        )
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["POST"], url_path="verify-password")
    def verify_password(self, request):
        serializer = VerifyPasswordSerializer(
            data=request.data, 
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"detail": "Password verified successfully"}, status=status.HTTP_200_OK)