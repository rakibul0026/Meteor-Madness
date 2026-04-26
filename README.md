# Meteor-Madness (Django Backend)

This project now runs on a Django backend with a SQLite database.

## What Was Added

- Django project setup with `manage.py`
- Backend app `core` with URL routing for all existing pages
- SQLite database configuration (`db.sqlite3`)
- Database models:
	- `ImpactPrediction` for saved prediction simulations
	- `TeamMember` for team records
- API endpoint for predictions:
	- `POST /api/predictions/` to save predictions
	- `GET /api/predictions/` to list recent predictions
- Django admin support for database records

## Run Locally

1. Create a virtual environment (recommended)
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Apply migrations:

```bash
python manage.py migrate
```

4. Create admin user (optional):

```bash
python manage.py createsuperuser
```

5. Start server:

```bash
python manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## Key Routes

- `/` and `/p2.html` - Home
- `/controls.html`
- `/dashboard.html`
- `/Prediction.html`
- `/asteroid_watch.html`
- `/p.html`
- `/team_member.html`
- `/admin/`

## NASA Live APIs (Backend Proxies)

- `/api/nasa/neo-feed/`
- `/api/nasa/apod/`
- `/api/nasa/mars/latest/`

These endpoints use:

- Per-IP rate limiting (default: 60 requests/minute)
- Server-side caching (default: 300 seconds)

Configure with environment variables:

- `NASA_RATE_LIMIT_PER_MINUTE`
- `NASA_CACHE_TTL_SECONDS`
- `NASA_API_KEY`

## Production Settings

Set these environment variables in production:

- `DJANGO_DEBUG=false`
- `DJANGO_SECRET_KEY=<strong-random-secret>`
- `DJANGO_ALLOWED_HOSTS=<comma-separated-hosts>`
- `DJANGO_CSRF_TRUSTED_ORIGINS=<comma-separated-https-origins>`

Example:

```bash
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=change-this
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NASA_API_KEY=your-nasa-key
```

## Static Files (Production)

Static files are served with WhiteNoise and collected into `staticfiles`.

```bash
python manage.py collectstatic --noinput
```

## Deployment (Render)

Included files:

- `Procfile`
- `render.yaml`
- `runtime.txt`

Render build uses:

- `pip install -r requirements.txt`
- `python manage.py collectstatic --noinput`
- `python manage.py migrate`

## Automated Tests

Run all tests:

```bash
python manage.py test
```

Tests cover:

- Key page routes
- Prediction API (create/list)
- NASA proxy caching behavior
- NASA proxy rate limiting