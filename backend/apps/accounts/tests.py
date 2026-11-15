"""
Focused coverage for transactional-email delivery failures.

Every endpoint that emails a verification code must report a failure when the
provider refuses the message (``send_email`` returns ``False``) instead of
answering as if the code had been delivered.
"""
from unittest.mock import patch

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.lookups.models import Role

from .models import User

SEND_EMAIL = "apps.accounts.views.send_email"
PASSWORD = "Str0ng!Passw0rd"


class EmailDeliveryFailureTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # A data migration already seeds the roles, so reuse the existing row.
        role, _ = Role.objects.get_or_create(name="CCTV Chief")
        cls.user = User.objects.create_user(
            email="chief@example.com",
            password=PASSWORD,
            first_name="Test",
            last_name="Chief",
            role=role,
            two_factor_enabled=True,
        )

    def setUp(self):
        # Login and password reset share a 5/minute throttle bucket; a fresh
        # bucket per test keeps the requests below from being rate limited.
        cache.clear()

    @patch(SEND_EMAIL, return_value=False)
    def test_login_2fa_reports_delivery_failure(self, send_email):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": self.user.email, "password": PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertNotIn("requires_2fa", response.data)
        self.assertIn("could not send", response.data["detail"].lower())
        send_email.assert_called_once()

    @patch(SEND_EMAIL, return_value=False)
    def test_password_reset_reports_delivery_failure(self, send_email):
        response = self.client.post(
            "/api/accounts/password-reset/",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("could not send", response.data["detail"].lower())
        send_email.assert_called_once()

    @patch(SEND_EMAIL, return_value=False)
    def test_two_factor_setup_reports_delivery_failure(self, send_email):
        self.client.force_authenticate(self.user)

        response = self.client.post("/api/accounts/2fa/send/", {}, format="json")

        self.assertEqual(
            response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        self.assertIn("could not send", response.data["detail"].lower())
        send_email.assert_called_once()

    @patch(SEND_EMAIL, return_value=False)
    def test_email_change_initiate_reports_delivery_failure(self, send_email):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/accounts/email-change/initiate/", {}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("could not send", response.data["detail"].lower())
        send_email.assert_called_once()


class LoginAccountLookupTests(APITestCase):
    """The login page can tell an unknown email apart from a wrong password."""

    @classmethod
    def setUpTestData(cls):
        role, _ = Role.objects.get_or_create(name="CCTV Chief")
        cls.user = User.objects.create_user(
            email="chief@example.com",
            password=PASSWORD,
            first_name="Test",
            last_name="Chief",
            role=role,
        )

    def setUp(self):
        cache.clear()

    def test_unknown_email_reports_missing_account(self):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": "nobody@example.com", "password": PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("no account is registered", response.data["detail"].lower())

    def test_wrong_password_keeps_the_combined_message(self):
        response = self.client.post(
            "/api/accounts/login/",
            {"email": self.user.email, "password": "WrongPassw0rd!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Invalid email or password.")
