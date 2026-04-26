import json
import os
import time
from datetime import datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import ImpactPrediction


NASA_BASE_URL = "https://api.nasa.gov"
NASA_API_KEY = os.environ.get("NASA_API_KEY", "DEMO_KEY")


def _fetch_nasa_json(endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = dict(params or {})
    query["api_key"] = NASA_API_KEY
    url = f"{NASA_BASE_URL}{endpoint}?{urlencode(query)}"
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req, timeout=15) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def _client_ip(request: HttpRequest) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _is_rate_limited(request: HttpRequest) -> bool:
    window_seconds = 60
    bucket = int(time.time() // window_seconds)
    ip = _client_ip(request)
    key = f"nasa-rate:{ip}:{bucket}"
    current = cache.get(key, 0) + 1
    cache.set(key, current, timeout=window_seconds + 1)
    return current > settings.NASA_RATE_LIMIT_PER_MINUTE


def _nasa_cache_key(endpoint: str, params: dict[str, Any]) -> str:
    parts = [endpoint]
    for key in sorted(params):
        parts.append(f"{key}={params[key]}")
    return "nasa-cache:" + "|".join(parts)


def _nasa_json_response(
    request: HttpRequest,
    endpoint: str,
    params: dict[str, Any] | None = None,
    cache_ttl: int | None = None,
) -> JsonResponse:
    if _is_rate_limited(request):
        return JsonResponse(
            {
                "error": "Rate limit exceeded. Please wait a minute before requesting NASA data again.",
            },
            status=429,
        )

    params = dict(params or {})
    ttl = cache_ttl or settings.NASA_CACHE_TTL_SECONDS
    key = _nasa_cache_key(endpoint, params)

    cached_data = cache.get(key)
    if cached_data is not None:
        response = JsonResponse(cached_data)
        response["X-NASA-Cache"] = "HIT"
        return response

    try:
        data = _fetch_nasa_json(endpoint, params)
    except HTTPError as exc:
        return JsonResponse(
            {"error": f"NASA API HTTP error: {exc.code}"},
            status=502,
        )
    except URLError:
        return JsonResponse({"error": "NASA API is unreachable."}, status=502)
    except (json.JSONDecodeError, TimeoutError):
        return JsonResponse({"error": "NASA API returned invalid data."}, status=502)

    cache.set(key, data, timeout=ttl)
    response = JsonResponse(data)
    response["X-NASA-Cache"] = "MISS"
    return response


def home(request: HttpRequest) -> HttpResponse:
    return render(request, "p2.html")


def controls_page(request: HttpRequest) -> HttpResponse:
    return render(request, "controls.html")


def dashboard_page(request: HttpRequest) -> HttpResponse:
    return render(request, "dashboard.html")


def prediction_page(request: HttpRequest) -> HttpResponse:
    return render(request, "Prediction.html")


def asteroid_watch_page(request: HttpRequest) -> HttpResponse:
    return render(request, "asteroid_watch.html")


def research_page(request: HttpRequest) -> HttpResponse:
    return render(request, "p.html")


def team_page(request: HttpRequest) -> HttpResponse:
    return render(request, "team_member.html")


@csrf_exempt
@require_http_methods(["GET", "POST"])
def predictions_api(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        rows = ImpactPrediction.objects.all()[:50]
        data = [
            {
                "id": row.id,
                "asteroid_id": row.asteroid_id,
                "diameter_m": row.diameter_m,
                "velocity_kms": row.velocity_kms,
                "approach_date": row.approach_date.isoformat() if row.approach_date else None,
                "energy_megatons": row.energy_megatons,
                "impact_probability": row.impact_probability,
                "risk_level": row.risk_level,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
        return JsonResponse({"results": data})

    try:
        payload: dict[str, Any] = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    asteroid_id = str(payload.get("asteroid_id", "")).strip() or "Simulated"
    diameter_m = float(payload.get("diameter_m", 0) or 0)
    velocity_kms = float(payload.get("velocity_kms", 0) or 0)
    energy_megatons = float(payload.get("energy_megatons", 0) or 0)
    impact_probability = float(payload.get("impact_probability", 0) or 0)
    risk_level = str(payload.get("risk_level", "Unknown"))

    if diameter_m <= 0 or velocity_kms <= 0:
        return JsonResponse(
            {"error": "diameter_m and velocity_kms must be positive numbers."},
            status=400,
        )

    approach_date = None
    raw_approach = payload.get("approach_date")
    if raw_approach:
        try:
            approach_date = datetime.strptime(str(raw_approach), "%Y-%m-%d").date()
        except ValueError:
            return JsonResponse({"error": "approach_date must be YYYY-MM-DD."}, status=400)

    entry = ImpactPrediction.objects.create(
        asteroid_id=asteroid_id,
        diameter_m=diameter_m,
        velocity_kms=velocity_kms,
        approach_date=approach_date,
        energy_megatons=energy_megatons,
        impact_probability=impact_probability,
        risk_level=risk_level,
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
    )

    return JsonResponse(
        {
            "message": "Prediction saved.",
            "id": entry.id,
            "created_at": entry.created_at.isoformat(),
        },
        status=201,
    )


def root_redirect(request: HttpRequest) -> HttpResponse:
    return redirect("home")


@require_http_methods(["GET"])
def nasa_neo_feed_api(request: HttpRequest) -> JsonResponse:
    date = request.GET.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
    return _nasa_json_response(
        request,
        "/neo/rest/v1/feed",
        {
            "start_date": date,
            "end_date": date,
        },
    )


@require_http_methods(["GET"])
def nasa_apod_api(request: HttpRequest) -> JsonResponse:
    date = request.GET.get("date")
    params: dict[str, Any] = {}
    if date:
        params["date"] = date
    return _nasa_json_response(request, "/planetary/apod", params)


@require_http_methods(["GET"])
def nasa_mars_latest_api(request: HttpRequest) -> JsonResponse:
    rover = request.GET.get("rover", "curiosity").lower()
    if rover not in {"curiosity", "opportunity", "spirit", "perseverance"}:
        rover = "curiosity"
    return _nasa_json_response(request, f"/mars-photos/api/v1/rovers/{rover}/latest_photos")
