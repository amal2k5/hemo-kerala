# HemoKerala

Backend for **HemoKerala**, a location-first, privacy-first blood-donation
coordination platform for Kerala.

> Status: Phase 1 (foundation) + Phase 2 (identity) in progress. Request,
> matching, notification, and frontend modules are not implemented yet.

## Stack

FastAPI · PostgreSQL · SQLAlchemy 2 · Alembic · Argon2 · JWT

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

# 2. Database (or point .env at an existing PostgreSQL)
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

Donor endpoints always use the authenticated user's identity; no user id is
accepted from the client. Location reference-data seeding is documented in
[docs/location-reference-data.md](docs/location-reference-data.md).

Interactive docs: `http://127.0.0.1:8000/docs`.
