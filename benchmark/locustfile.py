import os

from locust import HttpUser, task, between


class AerisUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Credentials come from the environment; never bake real or seeded
        # logins into the repository. Use a dedicated 2FA-exempt test account.
        email = os.environ.get("AERIS_BENCHMARK_EMAIL")
        password = os.environ.get("AERIS_BENCHMARK_PASSWORD")
        self.token = ""
        self.headers = {}
        if not email or not password:
            return

        # The legacy /api/auth/token/ route was removed: it bypassed 2FA.
        # Log in through the real flow, which returns the access token in the
        # body and sets the refresh token as an HttpOnly cookie.
        resp = self.client.post("/api/accounts/login/", json={
            "email": email,
            "password": password,
        })
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access", "")
            if self.token:
                self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def list_incidents(self):
        self.client.get("/api/incidents/", headers=self.headers)

    @task(1)
    def get_dashboard(self):
        self.client.get("/api/incidents/dashboard-stats/", headers=self.headers)

    @task(1)
    def get_audit_logs(self):
        self.client.get("/api/audit/", headers=self.headers)

    @task(2)
    def list_dispatches(self):
        self.client.get("/api/dispatch/dispatches/my/", headers=self.headers)
