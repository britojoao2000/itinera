# Itinera — FastAPI Backend

The `api/` package is a **Python ≥ 3.12 / FastAPI** helper service that lives alongside CouchDB on the server. It handles tasks that the browser cannot: scheduled JSON exports, printable trip PDFs, CouchDB housekeeping, and the container health probe used by Docker Compose.

> **Not a data API.** Trip data lives in CouchDB and syncs directly to the browser via PouchDB — no REST route is needed for CRUD. This service handles background utility work only.

---

## Routes

All routes are mounted under the `/api` prefix (preserved by the Caddy `handle /api/*` directive).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness probe + CouchDB reachability. Always returns 200 while the service is up. |
| `POST` | `/api/backups/run` | Trigger a JSON + attachments dump immediately. |
| `GET` | `/api/backups` | List existing backup files in `EXPORT_DIR`. |
| `GET` | `/api/exports/trips` | Export all trips as structured JSON. |
| `GET` | `/api/exports/trip/{id}` | Export a single trip (with all child documents) as JSON. |
| `GET` | `/api/pdf/trip/{id}` | Generate and return a printable PDF for a trip. |

When `DOCS_ENABLED=true` (default in development), OpenAPI docs are available at:
- Swagger UI: `/api/docs`
- ReDoc: `/api/redoc`
- OpenAPI JSON: `/api/openapi.json`

---

## Startup Sequence

On startup the app:
1. Connects to CouchDB (retries up to `COUCH_READY_RETRIES` times, waiting `COUCH_READY_BACKOFF_SECONDS` between attempts).
2. Ensures the `COUCHDB_DB` database exists (creates it if missing).
3. Provisions all required Mango indexes.
4. Starts the background scheduler (if `SCHEDULER_ENABLED=true`) for periodic backups and compaction.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `COUCHDB_URL` | `http://couchdb:5984` | CouchDB base URL (Docker internal network). |
| `COUCHDB_USER` | `admin` | CouchDB admin username. |
| `COUCHDB_PASSWORD` | *(required)* | CouchDB admin password. |
| `COUCHDB_DB` | `itinera` | Application database name. |
| `HTTP_TIMEOUT_SECONDS` | `30.0` | HTTP client timeout for CouchDB requests. |
| `EXPORT_DIR` | `/data/exports` | Directory where backup dumps are written. |
| `BACKUP_INTERVAL_HOURS` | `24.0` | How often the scheduler triggers a backup. |
| `BACKUP_CRON` | `None` | Override with a cron expression (e.g. `0 3 * * *`). Takes precedence over `BACKUP_INTERVAL_HOURS`. |
| `BACKUP_KEEP` | `14` | Number of backup files to retain (older ones are pruned). |
| `COMPACT_ON_BACKUP` | `true` | Run CouchDB compaction after each backup. |
| `SCHEDULER_ENABLED` | `true` | Enable/disable the background scheduler. |
| `DOCS_ENABLED` | `true` | Enable Swagger/ReDoc/OpenAPI at `/api/docs`, `/api/redoc`, `/api/openapi.json`. Set to `false` in production (default in `docker-compose.yml`). |
| `CORS_ORIGINS` | *(empty)* | Comma-separated list of allowed CORS origins. Not needed in the default same-origin Caddy setup. |
| `COUCH_READY_RETRIES` | `10` | Max attempts to wait for CouchDB to be ready on startup. |
| `COUCH_READY_BACKOFF_SECONDS` | `2.0` | Seconds between CouchDB readiness retries. |

---

## Local Development

**Requirements:** Python ≥ 3.12, a running CouchDB instance (e.g. from `docker compose up couchdb`).

```bash
cd api

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate

# Install with dev extras
pip install -e ".[dev]"

# Copy and configure the environment
cp .env.example .env
# Edit COUCHDB_PASSWORD (and optionally COUCHDB_URL if CouchDB runs elsewhere)

# Start the development server (auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000/api/docs` to explore the interactive Swagger UI.

---

## Running Tests

```bash
cd api
source .venv/bin/activate
pytest
```

Tests use an in-memory mock CouchDB client; no live CouchDB is required.

---

## Docker Build

The service is built by `deploy/api.Dockerfile` (build context: repo root `itinera/`). The `pyproject.toml` uses `hatchling` as the build backend and is `pip install`-able as a standard Python package.

```bash
# From the repo root
docker compose -f deploy/docker-compose.yml build fastapi
```

The image listens on port `8000` (internal only; reached through Caddy at `/api/*`).

---

## Package Structure

```
api/
├── pyproject.toml          # Package metadata + deps (hatchling build backend)
├── .env.example            # Environment variable template
└── app/
    ├── main.py             # App factory + lifespan + router registration
    ├── config.py           # Pydantic Settings (reads env vars)
    ├── couch.py            # Async CouchDB client + index provisioning
    ├── deps.py             # FastAPI dependency injection helpers
    ├── errors.py           # HTTP error handlers
    ├── models.py           # Pydantic request/response schemas
    ├── scheduler.py        # APScheduler setup for periodic backup + compaction
    ├── util.py             # Shared utilities (timestamps, etc.)
    ├── routers/            # Route modules: health, backups, exports, pdf
    ├── services/           # Business logic: backup runner, PDF renderer
    ├── importers/          # Data import helpers
    └── templates/          # Jinja2 templates for PDF generation
```