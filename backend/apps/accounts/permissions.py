from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Admin"

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.role == "Admin"


class IsOperator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("Admin", "Operator")


class IsBarangayOfficial(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "Admin", "Operator", "Barangay_Official"
        )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == "Admin"


class CanVerifyIncident(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "Admin", "Operator", "Barangay_Official"
        )


class CanDispatch(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "Admin", "Operator"
        )


class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Admin"
