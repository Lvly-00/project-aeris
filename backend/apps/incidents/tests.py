"""
Grouping rules for AI-detected incidents.

A camera must only alert once per ongoing incident: repeat detections are
folded into the open incident, and the camera re-arms only after that incident
is dismissed or resolved.
"""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.lookups.models import CameraStatus, IncidentStatus, Role
from apps.notifications.models import Notification
from apps.dispatch.models import IncidentTimeline

from .models import Incident

DETECTION_URL = "/api/incidents/create-from-detection/"
STATUS_URL = "/api/incidents/{id}/status/"
BY_CAMERA_URL = "/api/incidents/by-camera/"
VERDICT_URL = "/api/detections/{id}/verdict/"
DASHBOARD_URL = "/api/incidents/dashboard-stats/"


class IncidentTestBase(TestCase):
    """Shared auth + camera fixture for the incident API tests."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="chief@example.com",
            password="pw",
            first_name="CCTV",
            last_name="Chief",
            role=Role.objects.get(name="CCTV Chief"),
            receive_notifications=True,
        )
        self.client.force_authenticate(self.user)

        self.status_detected = IncidentStatus.objects.get(name="Detected")
        self.status_dismissed = IncidentStatus.objects.get(name="Dismissed")
        self.status_resolved = IncidentStatus.objects.get(name="Resolved")

        camera_status = CameraStatus.objects.get(name="Online")
        self.camera = Camera.objects.create(
            name="Gate Camera",
            stream_url="rtsp://example/stream",
            stream_type=Camera.StreamType.RTSP,
            status=camera_status,
        )
        self.other_camera = Camera.objects.create(
            name="Hall Camera",
            stream_url="rtsp://example/other",
            stream_type=Camera.StreamType.RTSP,
            status=camera_status,
        )

    def detect(self, camera=None, source="ai", confidence=0.9, incident_type="Fire", repeat=None):
        payload = {
            "incident_type": incident_type,
            "confidence_score": confidence,
            "camera_id": (camera or self.camera).id,
        }
        if source is not None:
            payload["source"] = source
        if repeat is not None:
            payload["repeat"] = repeat
        return self.client.post(DETECTION_URL, payload, format="json")


class IncidentGroupingTests(IncidentTestBase):
    # --- first detection -------------------------------------------------

    def test_first_detection_creates_incident_and_alerts(self):
        res = self.detect()

        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data["grouped"])
        self.assertEqual(res.data["source"], "ai")
        self.assertEqual(res.data["detection_count"], 1)
        self.assertEqual(Incident.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 1)

    # --- repeat detections ----------------------------------------------

    def test_repeat_detection_is_grouped_into_open_incident(self):
        first = self.detect()
        incident_id = first.data["id"]

        for _ in range(5):
            res = self.detect()
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.data["grouped"])
            self.assertEqual(res.data["id"], incident_id)

        self.assertEqual(Incident.objects.count(), 1)
        incident = Incident.objects.get(pk=incident_id)
        self.assertEqual(incident.detection_count, 6)
        # Only the first detection alerted.
        self.assertEqual(Notification.objects.count(), 1)

    def test_grouping_keeps_the_highest_confidence(self):
        self.detect(confidence=0.42)
        res = self.detect(confidence=0.97)
        self.assertAlmostEqual(res.data["confidence_score"], 0.97)

        res = self.detect(confidence=0.55)
        self.assertAlmostEqual(res.data["confidence_score"], 0.97)
        self.assertEqual(Incident.objects.get().detection_count, 3)

    def test_grouping_is_scoped_per_camera(self):
        self.detect(self.camera)
        res = self.detect(self.other_camera)

        self.assertFalse(res.data["grouped"])
        self.assertEqual(Incident.objects.count(), 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_repeat_detection_of_other_type_still_groups_by_camera(self):
        self.detect(self.camera, incident_type="Fire")
        res = self.detect(self.camera, incident_type="Vehicle_Accident")

        # Grouping is per camera, not per type: one open incident per camera.
        self.assertTrue(res.data["grouped"])
        self.assertEqual(Incident.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 1)

    # --- re-arming -------------------------------------------------------

    def test_dismissal_re_arms_the_camera(self):
        first = self.detect()
        incident_id = first.data["id"]

        self.client.patch(
            STATUS_URL.format(id=incident_id),
            {"status": "Dismissed"},
            format="json",
        )

        res = self.detect()
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data["grouped"])
        self.assertNotEqual(res.data["id"], incident_id)
        self.assertEqual(Incident.objects.count(), 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_resolution_re_arms_the_camera(self):
        first = self.detect()
        incident_id = first.data["id"]

        # Detected -> Verified -> Dispatched -> Resolved
        for status in ("Verified", "Dispatched", "Resolved"):
            self.client.patch(
                STATUS_URL.format(id=incident_id),
                {"status": status},
                format="json",
            )

        res = self.detect()
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data["grouped"])
        self.assertEqual(Notification.objects.count(), 2)

    def test_verified_incident_still_absorbs_repeat_detections(self):
        first = self.detect()
        self.client.patch(
            STATUS_URL.format(id=first.data["id"]),
            {"status": "Verified"},
            format="json",
        )

        res = self.detect()
        self.assertTrue(res.data["grouped"])
        self.assertEqual(Notification.objects.count(), 1)

    # --- simulations stay ungrouped --------------------------------------

    def test_simulations_are_never_grouped(self):
        first = self.detect(source="simulation")
        res = self.detect(source="simulation")

        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data["grouped"])
        self.assertNotEqual(res.data["id"], first.data["id"])
        self.assertEqual(Incident.objects.count(), 2)
        self.assertEqual(Notification.objects.count(), 2)
    def test_callers_without_source_default_to_simulation(self):
        first = self.detect(source=None)
        res = self.detect(source=None)

        self.assertEqual(res.data["source"], "simulation")
        self.assertFalse(res.data["grouped"])
        self.assertNotEqual(res.data["id"], first.data["id"])

    def test_simulation_does_not_block_live_detections(self):
        # A test alert must not occupy the camera's live slot, or it would mask
        # a real detection until someone dismissed it.
        self.detect(source="simulation")
        res = self.detect(source="ai")

        self.assertFalse(res.data["grouped"])
        self.assertEqual(res.data["source"], "ai")
        self.assertEqual(Incident.objects.count(), 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_repeat_live_detections_still_group(self):
        self.detect(source="ai")
        # A simulation lands mid-flight, then live detections resume.
        self.detect(source="simulation")
        res = self.detect(source="ai")

        live = Incident.objects.get(source="ai")
        self.assertTrue(res.data["grouped"])
        self.assertEqual(res.data["id"], live.id)
        self.assertEqual(live.detection_count, 2)

    def test_simulations_record_reviewable_detections(self):
        self.detect(source="simulation", repeat=3)

        self.assertEqual(Detection.objects.count(), 3)
        self.assertEqual(
            Detection.objects.filter(verdict=Detection.Verdict.PENDING).count(), 3
        )

    def test_simulation_repeat_is_capped(self):
        self.detect(source="simulation", repeat=99)
        self.assertEqual(Detection.objects.count(), 10)

    def test_simulation_repeat_defaults_to_one(self):
        self.detect(source="simulation")
        self.assertEqual(Detection.objects.count(), 1)

    def test_burst_counter_matches_the_rows_kept(self):
        res = self.detect(source="simulation", repeat=4)

        incident = Incident.objects.get(pk=res.data["id"])
        self.assertEqual(incident.detection_count, 4)
        self.assertEqual(res.data["detection_count"], 4)
        self.assertEqual(Detection.objects.filter(incident=incident).count(), 4)

    def test_burst_counter_is_not_inflated_by_the_retention_cap(self):
        # A burst can never exceed the cap, but a repeat live incident past the
        # cap must still count every hit it saw.
        self.detect(source="ai", repeat=1)
        for _ in range(55):
            self.detect(source="ai")

        incident = Incident.objects.get(source="ai")
        self.assertEqual(incident.detection_count, 56)
        self.assertEqual(Detection.objects.filter(incident=incident).count(), 50)

    # --- validation ------------------------------------------------------

    def test_unknown_camera_is_rejected(self):
        res = self.client.post(
            DETECTION_URL,
            {"incident_type": "Fire", "confidence_score": 0.9, "camera_id": 9999},
            format="json",
        )
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Incident.objects.count(), 0)

    @patch("apps.incidents.views.create_incident_notification")
    @patch("apps.incidents.views.broadcast_incident")
    def test_grouped_detection_broadcasts_nothing(self, mock_broadcast, mock_notify):
        self.detect()
        mock_broadcast.reset_mock()
        mock_notify.reset_mock()

        self.detect()

        mock_broadcast.assert_not_called()
        mock_notify.assert_not_called()

    # --- every detection hit is listed -----------------------------------

    def test_each_detection_hit_is_recorded(self):
        self.detect()
        for _ in range(4):
            self.detect()

        incident = Incident.objects.get()
        self.assertEqual(incident.detection_count, 5)
        self.assertEqual(Detection.objects.filter(incident=incident).count(), 5)
        self.assertEqual(
            Detection.objects.filter(verdict=Detection.Verdict.PENDING).count(), 5
        )

    def test_detection_rows_carry_type_confidence_and_bbox(self):
        self.detect(incident_type="Smoke", confidence=0.66)
        detection = Detection.objects.get()

        self.assertEqual(detection.incident_type.name, "Smoke")
        self.assertEqual(detection.camera_id, self.camera.id)
        self.assertAlmostEqual(detection.confidence_score, 0.66)
        self.assertIsNotNone(detection.frame_timestamp)

    def test_simulations_get_their_own_detection_rows(self):
        self.detect(source="simulation")
        self.detect(source="simulation")

        # One reviewable row per simulated incident, not folded together.
        self.assertEqual(Detection.objects.count(), 2)
        self.assertEqual(Incident.objects.count(), 2)

    def test_detections_without_a_camera_are_skipped(self):
        res = self.client.post(
            DETECTION_URL,
            {"incident_type": "Fire", "confidence_score": 0.9, "source": "ai"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Detection.objects.count(), 0)

    def test_detection_rows_are_capped(self):
        for _ in range(55):
            self.detect()

        incident = Incident.objects.get()
        # The true total keeps counting up...
        self.assertEqual(incident.detection_count, 55)
        # ...but we retain a reviewable number of rows.
        self.assertEqual(Detection.objects.filter(incident=incident).count(), 50)

    # --- check / cross verdicts ------------------------------------------

    def test_verdict_marks_a_detection_true(self):
        self.detect()
        detection = Detection.objects.get()

        res = self.client.patch(
            VERDICT_URL.format(id=detection.pk),
            {"verdict": "true"},
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["verdict"], "true")
        self.assertTrue(res.data["is_verified"])
        self.assertEqual(res.data["reviewed_by"], self.user.id)
        self.assertIsNotNone(res.data["reviewed_at"])

        detection.refresh_from_db()
        self.assertEqual(detection.verdict, Detection.Verdict.TRUE)
        self.assertEqual(detection.reviewed_by_id, self.user.id)

    def test_verdict_marks_a_detection_false(self):
        self.detect()
        detection = Detection.objects.get()

        res = self.client.patch(
            VERDICT_URL.format(id=detection.pk),
            {"verdict": "false"},
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["verdict"], "false")
        # Reviewed, but explicitly not a real incident.
        self.assertTrue(res.data["is_verified"])

    def test_verdict_does_not_change_incident_status(self):
        self.detect()
        detection = Detection.objects.get()

        self.client.patch(
            VERDICT_URL.format(id=detection.pk),
            {"verdict": "false"},
            format="json",
        )

        # Annotation only — the incident workflow is untouched.
        self.assertEqual(Incident.objects.get().status.name, "Detected")

    def test_verdict_can_be_reset_to_pending(self):
        self.detect()
        detection = Detection.objects.get()

        self.client.patch(VERDICT_URL.format(id=detection.pk), {"verdict": "true"}, format="json")
        res = self.client.patch(
            VERDICT_URL.format(id=detection.pk), {"verdict": "pending"}, format="json"
        )

        self.assertEqual(res.data["verdict"], "pending")
        self.assertFalse(res.data["is_verified"])
        self.assertIsNone(res.data["reviewed_at"])

    def test_invalid_verdict_is_rejected(self):
        self.detect()
        detection = Detection.objects.get()

        res = self.client.patch(
            VERDICT_URL.format(id=detection.pk),
            {"verdict": "maybe"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    # --- incidents page grouped by camera --------------------------------

    def test_by_camera_returns_one_row_per_camera(self):
        self.detect(self.camera)
        self.detect(self.camera)
        self.detect(self.other_camera)

        res = self.client.get(BY_CAMERA_URL)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)
        by_name = {row["camera_name"]: row for row in res.data}
        self.assertEqual(by_name["Gate Camera"]["detection_count"], 2)
        self.assertEqual(by_name["Hall Camera"]["detection_count"], 1)
        self.assertEqual(by_name["Gate Camera"]["verdict_counts"], {"pending": 2, "true": 0, "false": 0})

    def test_by_camera_counts_verdicts(self):
        self.detect()
        self.detect()
        detections = list(Detection.objects.order_by("id"))
        self.client.patch(VERDICT_URL.format(id=detections[0].pk), {"verdict": "true"}, format="json")
        self.client.patch(VERDICT_URL.format(id=detections[1].pk), {"verdict": "false"}, format="json")

        res = self.client.get(BY_CAMERA_URL)
        row = res.data[0]
        self.assertEqual(row["verdict_counts"], {"pending": 0, "true": 1, "false": 1})

    def test_by_camera_uses_the_newest_incident_per_camera(self):
        first = self.detect(self.camera)
        self.client.patch(
            STATUS_URL.format(id=first.data["id"]),
            {"status": "Dismissed"},
            format="json",
        )
        second = self.detect(self.camera)

        res = self.client.get(BY_CAMERA_URL)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["incident"]["id"], second.data["id"])

    def test_by_camera_omits_closed_incidents(self):
        incident = self.detect(self.camera).data["id"]
        self.client.patch(STATUS_URL.format(id=incident), {"status": "Dismissed"}, format="json")

        res = self.client.get(BY_CAMERA_URL)
        self.assertEqual(res.data, [])

    def test_by_camera_surfaces_camerardless_incidents_as_one_row(self):
        # Deleting a camera nulls out its incidents. They used to be dropped
        # here while still inflating the dashboard total.
        self.detect(self.camera)
        orphan = self.detect(source="simulation").data["id"]
        Incident.objects.filter(pk=orphan).update(camera=None)

        res = self.client.get(BY_CAMERA_URL)

        self.assertEqual(len(res.data), 2)
        row = next(r for r in res.data if r["camera"] is None)
        self.assertEqual(row["camera_name"], "Unassigned")
        self.assertIsNone(row["location_name"])
        self.assertEqual(row["incident"]["id"], orphan)

    def test_delete_by_camera_clears_every_camerardless_incident(self):
        first = self.detect(source="simulation").data["id"]
        second = self.detect(source="simulation").data["id"]
        Incident.objects.filter(pk__in=[first, second]).update(camera=None)
        self.detect(self.camera)  # a real camera row that must survive

        res = self.client.delete(BY_CAMERA_URL, {"camera_ids": [None]}, format="json")

        self.assertEqual(res.data["deleted"], 2)
        remaining = set(Incident.objects.values_list("pk", flat=True))
        self.assertNotIn(first, remaining)
        self.assertNotIn(second, remaining)
        self.assertEqual(len(self.client.get(BY_CAMERA_URL).data), 1)

    def test_delete_by_camera_mixes_real_and_camerardless_ids(self):
        orphan = self.detect(source="simulation").data["id"]
        Incident.objects.filter(pk=orphan).update(camera=None)
        self.detect(self.camera)

        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": [self.camera.id, None]}, format="json"
        )

        self.assertEqual(res.data["deleted"], 2)
        self.assertEqual(self.client.get(BY_CAMERA_URL).data, [])

    def test_by_camera_reports_every_detected_type(self):
        self.detect(self.camera, incident_type="Fire")
        self.detect(self.camera, incident_type="Smoke")
        self.detect(self.camera, incident_type="Vehicle_Accident")

        res = self.client.get(BY_CAMERA_URL)
        row = res.data[0]
        # The incident's own type leads, then the rest detected on that camera.
        self.assertEqual(row["incident_types"], ["Fire", "Smoke", "Vehicle_Accident"])

    def test_by_camera_never_exceeds_three_types(self):
        for incident_type in ("Fire", "Smoke", "Vehicle_Accident"):
            self.detect(self.camera, incident_type=incident_type)

        res = self.client.get(BY_CAMERA_URL)
        self.assertEqual(len(res.data[0]["incident_types"]), 3)

    def test_by_camera_falls_back_to_incident_type_with_no_detections(self):
        self.detect(source="simulation")

        res = self.client.get(BY_CAMERA_URL)
        self.assertEqual(res.data[0]["incident_types"], ["Fire"])

    def test_delete_by_camera_clears_every_stacked_batch(self):
        # Each simulate press opens its own incident, so one camera can hold
        # several. Deleting the row must clear them all, not just the newest.
        first = self.detect(source="simulation").data["id"]
        second = self.detect(source="simulation").data["id"]
        third = self.detect(source="ai").data["id"]
        self.assertEqual(len({first, second, third}), 3)

        # The list only ever shows the newest one.
        res = self.client.get(BY_CAMERA_URL)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["incident"]["id"], third)

        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": [self.camera.id]}, format="json"
        )
        self.assertEqual(res.data["deleted"], 3)
        self.assertEqual(Incident.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_delete_by_camera_leaves_closed_incidents_untouched(self):
        closed = self.detect().data["id"]
        self.client.patch(
            STATUS_URL.format(id=closed), {"status": "Dismissed"}, format="json"
        )
        self.detect(source="simulation")

        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": [self.camera.id]}, format="json"
        )

        self.assertEqual(res.data["deleted"], 1)
        self.assertEqual(Incident.objects.count(), 1)
        self.assertEqual(Incident.objects.get(pk=closed).status.name, "Dismissed")

    def test_delete_by_camera_only_touches_the_given_cameras(self):
        keep = self.detect(camera=self.other_camera).data["id"]
        self.detect(source="simulation")

        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": [self.camera.id]}, format="json"
        )

        self.assertEqual(res.data["deleted"], 1)
        self.assertTrue(Incident.objects.filter(pk=keep).exists())

    def test_delete_by_camera_rejects_a_bad_payload(self):
        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": ["abc"]}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_delete_by_camera_with_no_ids_is_a_no_op(self):
        self.detect()
        res = self.client.delete(
            BY_CAMERA_URL, {"camera_ids": []}, format="json"
        )
        self.assertEqual(res.data["deleted"], 0)
        self.assertEqual(Incident.objects.count(), 1)


class DashboardStatsTests(IncidentTestBase):
    """
    The dashboard must report real figures, so these lock the numbers to the
    tables instead of any placeholder.
    """

    def test_stats_match_the_tables(self):
        # Simulations never fold together, so each call is a distinct incident.
        self.detect(source="simulation")
        self.detect(camera=self.other_camera, incident_type="Smoke", source="simulation")
        closed = self.detect(source="simulation").data["id"]
        self.client.patch(
            STATUS_URL.format(id=closed), {"status": "Dismissed"}, format="json"
        )

        res = self.client.get(DASHBOARD_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_incidents"], 3)
        self.assertEqual(res.data["active_incidents"], 2)
        self.assertEqual(res.data["total_cameras"], 2)

    def test_stats_exclude_soft_deleted_users(self):
        inactive = User.objects.create_user(
            email="gone@example.com",
            password="x",
            is_active=False,
            role=Role.objects.get(name="CCTV Operator"),
        )

        res = self.client.get(DASHBOARD_URL)

        self.assertEqual(
            res.data["total_users"], User.objects.filter(is_active=True).count()
        )
        self.assertFalse(
            User.objects.filter(is_active=True, pk=inactive.pk).exists()
        )

    def test_tanod_count_only_counts_that_role(self):
        res = self.client.get(DASHBOARD_URL)
        self.assertEqual(
            res.data["total_tanods"],
            User.objects.filter(is_active=True, role__name="Barangay Tanod").count(),
        )

    def test_by_type_is_ordered_by_count(self):
        self.detect(incident_type="Smoke", source="simulation")
        self.detect(incident_type="Smoke", source="simulation")
        self.detect(incident_type="Fire", source="simulation")

        res = self.client.get(DASHBOARD_URL)
        by_type = res.data["by_type"]

        self.assertEqual(by_type[0], {"name": "Smoke", "count": 2})
        self.assertEqual(by_type[1], {"name": "Fire", "count": 1})

    def test_verdict_tally_matches_the_detections(self):
        self.detect(source="simulation")
        detection = Detection.objects.get()
        self.client.patch(
            VERDICT_URL.format(id=detection.id), {"verdict": "true"}, format="json"
        )

        res = self.client.get(DASHBOARD_URL)
        verdicts = res.data["verdicts"]

        for choice in ("pending", "true", "false"):
            self.assertEqual(
                verdicts[choice],
                Detection.objects.filter(verdict=choice).count(),
                f"verdict {choice} mismatch",
            )

    def test_verdict_tally_ignores_detections_from_deleted_incidents(self):
        self.detect(source="simulation")
        incident = Incident.objects.get()
        detection = Detection.objects.get()

        self.assertEqual(self.client.get(DASHBOARD_URL).data["verdicts"]["pending"], 1)

        self.client.delete(f"/api/incidents/{incident.id}/", format="json")

        # The row survives via SET_NULL but must stop skewing the ring.
        self.assertIsNone(Detection.objects.get(pk=detection.pk).incident)
        verdicts = self.client.get(DASHBOARD_URL).data["verdicts"]
        self.assertEqual(verdicts["pending"], 0)
        self.assertEqual(sum(verdicts.values()), 0)


class StatsBroadcastTests(IncidentTestBase):
    """
    Writes with no incident payload must still nudge the dashboard, otherwise
    its tiles stay stale until the polling interval expires.
    """

    def test_deleting_incidents_signals_a_stats_change(self):
        self.detect(source="simulation")

        with patch("apps.incidents.views.broadcast_stats_changed") as broadcast:
            self.client.delete(
                BY_CAMERA_URL, {"camera_ids": [self.camera.id]}, format="json"
            )

        broadcast.assert_called_once()

    def test_creating_a_camera_signals_a_stats_change(self):
        with patch("apps.cameras.views.broadcast_stats_changed") as broadcast:
            self.client.post(
                "/api/cameras/",
                {"name": "New", "stream_url": "rtsp://x/y", "stream_type": "RTSP"},
                format="json",
            )
        broadcast.assert_called_once()

    def test_deleting_a_camera_signals_a_stats_change(self):
        with patch("apps.cameras.views.broadcast_stats_changed") as broadcast:
            self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")
        broadcast.assert_called_once()

    def test_user_changes_signal_a_stats_change(self):
        tanod_role = Role.objects.get(name="Barangay Tanod")
        with patch("apps.accounts.views.broadcast_stats_changed") as broadcast:
            self.client.post(
                "/api/accounts/register/",
                {
                    "email": "tanod@example.com",
                    "password": "Str0ngPass!23",
                    "password2": "Str0ngPass!23",
                    "first_name": "Tam",
                    "last_name": "Og",
                    "role": tanod_role.name,
                },
                format="json",
            )
        broadcast.assert_called_once()

    def test_reassigning_a_role_signals_a_stats_change(self):
        with patch("apps.accounts.views.broadcast_stats_changed") as broadcast:
            res = self.client.patch(
                f"/api/accounts/{self.user.id}/",
                {"role": Role.objects.get(name="Barangay Tanod").name},
                format="json",
            )
        self.assertEqual(res.status_code, 200)
        broadcast.assert_called_once()

    def test_deleting_an_incident_signals_a_stats_change(self):
        self.detect(source="simulation")
        incident = Incident.objects.get()

        with patch("apps.incidents.views.broadcast_stats_changed") as broadcast:
            res = self.client.delete(f"/api/incidents/{incident.id}/", format="json")

        self.assertEqual(res.status_code, 204)
        broadcast.assert_called_once()

    def test_camera_writes_signal_a_camera_change(self):
        cases = [
            ("created", "post", "/api/cameras/", {
                "name": "Fresh",
                "stream_url": "rtsp://fresh/stream",
                "stream_type": "RTSP",
            }),
            ("updated", "patch", f"/api/cameras/{self.camera.id}/", {"name": "Renamed"}),
            ("deleted", "delete", f"/api/cameras/{self.camera.id}/", None),
        ]

        for action, method, path, body in cases:
            with self.subTest(action=action):
                with patch(
                    "apps.cameras.views.broadcast_camera_changed"
                ) as broadcast:
                    res = getattr(self.client, method)(path, body, format="json")
                self.assertEqual(
                    res.status_code,
                    {"post": 201, "patch": 200, "delete": 204}[method],
                )

                broadcast.assert_called_once()
                self.assertEqual(broadcast.call_args[0][1], action)


class CameraDeletionCascadeTests(IncidentTestBase):
    """A camera and the incidents it raised are one unit of record."""

    def test_deleting_a_camera_removes_its_incidents(self):
        mine = self.detect(self.camera).data["id"]
        theirs = self.detect(self.other_camera).data["id"]

        self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")

        remaining = set(Incident.objects.values_list("pk", flat=True))
        self.assertNotIn(mine, remaining)
        self.assertIn(theirs, remaining)

    def test_deleting_a_camera_removes_its_detections_and_timeline(self):
        incident = self.detect(self.camera).data["id"]
        # Detections arrive via create-from-detection, which writes no timeline
        # row; a status transition does. Detected -> Dismissed is allowed.
        res = self.client.patch(
            STATUS_URL.format(id=incident), {"status": "Dismissed"}, format="json"
        )
        self.assertEqual(res.status_code, 200)

        detection_ids = set(Detection.objects.filter(incident_id=incident).values_list("pk", flat=True))
        timeline_ids = set(IncidentTimeline.objects.filter(incident_id=incident).values_list("pk", flat=True))
        self.assertTrue(detection_ids)
        self.assertTrue(timeline_ids)

        self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")

        self.assertFalse(Detection.objects.filter(pk__in=detection_ids).exists())
        self.assertFalse(IncidentTimeline.objects.filter(pk__in=timeline_ids).exists())

    def test_deleting_a_camera_removes_its_notifications(self):
        self.detect(self.camera)
        notification_ids = set(
            Notification.objects.values_list("pk", flat=True)
        )
        self.assertTrue(notification_ids)

        self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")

        self.assertFalse(Notification.objects.filter(pk__in=notification_ids).exists())

    def test_deleting_a_camera_removes_closed_incidents_too(self):
        incident = self.detect(self.camera).data["id"]
        self.client.patch(
            STATUS_URL.format(id=incident), {"status": "Resolved"}, format="json"
        )

        self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")

        self.assertFalse(Incident.objects.filter(pk=incident).exists())

    def test_camera_list_no_longer_shows_the_deleted_camera(self):
        self.detect(self.camera)

        self.client.delete(f"/api/cameras/{self.camera.id}/", format="json")

        res = self.client.get("/api/cameras/")
        ids = [row["id"] for row in (res.data.get("results") or res.data)]
        self.assertNotIn(self.camera.id, ids)

    def test_renaming_a_camera_shows_up_on_the_incident_row(self):
        self.detect(self.camera)

        self.client.patch(
            f"/api/cameras/{self.camera.id}/",
            {"name": "North Gate", "location_name": "Roof"},
            format="json",
        )

        row = self.client.get(BY_CAMERA_URL).data[0]
        self.assertEqual(row["camera_name"], "North Gate")
        self.assertEqual(row["location_name"], "Roof")


class CameraBulkDeletionTests(IncidentTestBase):
    """The grid's mass delete: one call, same cascade as a single delete."""

    URL = "/api/cameras/bulk-destroy/"

    def test_bulk_delete_removes_every_listed_camera(self):
        res = self.client.delete(
            self.URL,
            {"camera_ids": [self.camera.id, self.other_camera.id]},
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)
        self.assertEqual(
            set(res.data["deleted"]), {self.camera.id, self.other_camera.id}
        )
        self.assertFalse(Camera.objects.filter(id__in=[self.camera.id, self.other_camera.id]).exists())

    def test_bulk_delete_takes_incidents_with_their_cameras(self):
        mine = self.detect(self.camera).data["id"]
        theirs = self.detect(self.other_camera).data["id"]

        res = self.client.delete(
            self.URL, {"camera_ids": [self.camera.id]}, format="json"
        )

        self.assertEqual(res.status_code, 200)
        remaining = set(Incident.objects.values_list("pk", flat=True))
        self.assertNotIn(mine, remaining)
        self.assertIn(theirs, remaining)

    def test_bulk_delete_leaves_unselected_cameras_alone(self):
        survivor = Camera.objects.create(
            name="Roof Camera",
            stream_url="rtsp://example/roof",
            stream_type=Camera.StreamType.RTSP,
            status=CameraStatus.objects.get(name="Online"),
        )

        self.client.delete(
            self.URL,
            {"camera_ids": [self.camera.id, self.other_camera.id]},
            format="json",
        )

        self.assertTrue(Camera.objects.filter(id=survivor.id).exists())

    def test_bulk_delete_broadcasts_once_per_camera(self):
        with patch("apps.cameras.views.broadcast_stats_changed") as stats, patch(
            "apps.cameras.views.broadcast_camera_changed"
        ) as changed:
            res = self.client.delete(
                self.URL,
                {"camera_ids": [self.camera.id, self.other_camera.id]},
                format="json",
            )

        self.assertEqual(res.status_code, 200)
        stats.assert_called_once()
        self.assertEqual(changed.call_count, 2)
        self.assertEqual(
            {call.args[1] for call in changed.call_args_list}, {"deleted"}
        )

    def test_bulk_delete_ignores_ids_that_do_not_exist(self):
        res = self.client.delete(
            self.URL,
            {"camera_ids": [self.camera.id, 999999]},
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["deleted"], [self.camera.id])
        self.assertTrue(Camera.objects.filter(id=self.other_camera.id).exists())

    def test_bulk_delete_requires_a_non_empty_list(self):
        for payload in ({}, {"camera_ids": []}, {"camera_ids": "not-a-list"}):
            with self.subTest(payload=payload):
                res = self.client.delete(self.URL, payload, format="json")
                self.assertEqual(res.status_code, 400)

        self.assertEqual(Camera.objects.count(), 2)

    def test_bulk_delete_rejects_non_integer_ids(self):
        res = self.client.delete(
            self.URL, {"camera_ids": ["abc"]}, format="json"
        )

        self.assertEqual(res.status_code, 400)
        self.assertEqual(Camera.objects.count(), 2)

    def test_bulk_delete_with_no_match_is_a_404(self):
        res = self.client.delete(
            self.URL, {"camera_ids": [999999]}, format="json"
        )

        self.assertEqual(res.status_code, 404)
        self.assertEqual(Camera.objects.count(), 2)
