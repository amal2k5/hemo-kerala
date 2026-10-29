# HemoKerala

Backend for **HemoKerala**, a location-first, privacy-first blood-donation
coordination platform for Kerala.

> Status: Days 1–5 complete — foundation, identity, donor profiles, blood
> requests/responses, PostGIS donor matching, and the public blood-bank
> directory. Notifications and the frontend are not implemented yet.

## Stack

FastAPI · PostgreSQL + PostGIS · SQLAlchemy 2 · GeoAlchemy2 · Alembic · Argon2 · JWT

## Project layout

```text
backend/
├── app/
│   ├── main.py              # app factory, CORS, exception handlers, router mount
│   ├── core/                # config, security, logging, domain exceptions
│   ├── db/                  # declarative base, session/engine, mixins
│   ├── api/                 # shared dependencies + versioned router aggregator
│   └── modules/             # one package per domain (auth, users, health, ...)
├── alembic/                 # migrations
└── tests/                   # unit, integration, security
```

Layer rule: `router → service → repository → models`. Routers do HTTP only,
services hold business rules, repositories hold queries. Services raise
`DomainError` subclasses; `core/exceptions.py` maps them to HTTP responses.

## Local setup

```bash
# 1. Environment
cp .env.example .env          # then edit credentials

# 2. Database (PostGIS image; container 5432 is exposed on host 5433)
docker compose up -d postgres

# 3. Install
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e . --group dev

# 4. Migrate and run
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

## Commands

| Task | Command (run from repo root) |
|---|---|
| Run API | `uvicorn app.main:app --reload --app-dir backend` |
| Tests | `pytest` |
| Lint | `ruff check backend` |
| Format | `ruff format backend` |
| New migration | `alembic -c backend/alembic.ini revision --autogenerate -m "message"` |
| Apply migrations | `alembic -c backend/alembic.ini upgrade head` |
| Check migration drift | `alembic -c backend/alembic.ini check` |

## API (v1)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Liveness |
| `GET` | `/api/v1/health/ready` | Readiness (checks DB) |
| `POST` | `/api/v1/auth/register` | Register account |
| `POST` | `/api/v1/auth/login` | JSON login → JWT |
| `POST` | `/api/v1/auth/token` | OAuth2 password flow (Swagger) |
| `GET` | `/api/v1/auth/me` | Current user |
| `POST` | `/api/v1/donors/profile` | Create own donor profile |
| `GET` | `/api/v1/donors/profile` | Read own donor profile |
| `PATCH` | `/api/v1/donors/profile` | Partially update own donor profile |
| `PATCH` | `/api/v1/donors/profile/availability` | Pause, resume, or withdraw availability |
| `GET` | `/api/v1/locations/districts` | Kerala district reference data (public) |
| `GET` | `/api/v1/locations/local-bodies` | Local bodies, filterable by district/type (public) |
| `POST` | `/api/v1/requests` | Create a blood request |
| `GET` | `/api/v1/requests` | List active requests (paginated) |
| `GET` | `/api/v1/requests/{id}` | Request details |
| `POST` | `/api/v1/requests/{id}/cancel` | Cancel own request |
| `POST` | `/api/v1/requests/{id}/confirm-fulfilment` | Report request outcome (owner only) |
| `POST` | `/api/v1/requests/{id}/responses` | Respond as a donor |
| `GET` | `/api/v1/requests/{id}/responses` | View responses (owner: all; donor: own) |
| `PATCH` | `/api/v1/requests/{id}/responses/{response_id}` | Update own response |
| `GET` | `/api/v1/requests/{id}/matches?radius_km=10` | Opted-in donor candidates near a request (owner only) |
| `GET` | `/api/v1/blood-banks` | Public directory (district/verification/location filters) |
| `GET` | `/api/v1/blood-banks/{id}` | Public directory entry |

Donor endpoints always use the authenticated user's identity; no user id is
accepted from the client. Location reference-data seeding is documented in
[docs/location-reference-data.md](docs/location-reference-data.md). Spatial
setup and matching rules are in
[docs/postgis-and-matching.md](docs/postgis-and-matching.md); directory
verification and data-loading rules are in
[docs/blood-bank-directory.md](docs/blood-bank-directory.md).

The directory is read-only over HTTP. Until an administrative role exists,
approved records are loaded by a controlled operator process, never by public
endpoints.

Interactive docs: `http://127.0.0.1:8000/docs`.
