from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import ImpactPrediction


class PageRouteTests(TestCase):
    def test_key_pages_render(self) -> None:
        paths = [
            "/",
            "/controls.html",
            "/dashboard.html",
            "/Prediction.html",
            "/asteroid_watch.html",
            "/p.html",
            "/team_member.html",
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)


class PredictionApiTests(TestCase):
    def test_create_prediction(self) -> None:
        payload = {
            "asteroid_id": "101955",
            "diameter_m": 150,
            "velocity_kms": 22.1,
            "approach_date": "2035-03-10",
            "energy_megatons": 1.2,
            "impact_probability": 0.00013,
            "risk_level": "Medium",
            "latitude": 23.8,
            "longitude": 90.4,
        }
        response = self.client.post(
            reverse("predictions_api"),
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ImpactPrediction.objects.count(), 1)

    def test_list_predictions(self) -> None:
        ImpactPrediction.objects.create(
            asteroid_id="Sample",
            diameter_m=120,
            velocity_kms=18,
            energy_megatons=0.8,
            impact_probability=0.0002,
            risk_level="Low",
        )
        response = self.client.get(reverse("predictions_api"))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("results", payload)
        self.assertEqual(len(payload["results"]), 1)


class NasaApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()

    @patch("core.views._fetch_nasa_json")
    def test_neo_feed_caches_requests(self, mock_fetch) -> None:
        mock_fetch.return_value = {
            "near_earth_objects": {
                "2026-04-26": []
            }
        }

        url = reverse("nasa_neo_feed_api") + "?date=2026-04-26"
        first = self.client.get(url)
        second = self.client.get(url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(mock_fetch.call_count, 1)
        self.assertEqual(first.headers.get("X-NASA-Cache"), "MISS")
        self.assertEqual(second.headers.get("X-NASA-Cache"), "HIT")

    @override_settings(NASA_RATE_LIMIT_PER_MINUTE=1)
    @patch("core.views._fetch_nasa_json")
    def test_nasa_rate_limit(self, mock_fetch) -> None:
        mock_fetch.return_value = {"date": "2026-04-26"}

        first = self.client.get(reverse("nasa_apod_api"))
        second = self.client.get(reverse("nasa_apod_api"))

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)
