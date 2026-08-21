from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role_name(user) -> str:
    return user.role.name if user.is_authenticated and user.role_id else ""


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _role_name(request.user) == "CCTV Chief"

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsOperator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _role_name(request.user) in ("CCTV Chief", "CCTV Operator")


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and _role_name(request.user) == "CCTV Chief"


class CanVerifyIncident(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _role_name(request.user) in (
            "CCTV Chief", "CCTV Operator"
        )


class CanDispatch(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _role_name(request.user) in (
            "CCTV Chief", "CCTV Operator"
        )


class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and _role_name(request.user) == "CCTV Chief"
