from locust import HttpUser, task, between

class AerisUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        resp = self.client.post("/api/auth/token/", json={
            "username": "admin", "password": "admin123"
        })
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access", "")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = ""
            self.headers = {}

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
