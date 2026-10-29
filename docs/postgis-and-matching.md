# PostGIS setup and donor matching

## Why PostGIS

Candidate search must be indexed and database-side. The project therefore uses
PostGIS `geography(Point, 4326)` columns rather than application-level
haversine calculations.

- `donor_profiles.location`
- `blood_requests.location`
- `blood_banks.location`

Geography (not geometry) is used so `ST_DWithin` distances are metres and do not
need a projection. SRID 4326 is WGS 84.

The existing `latitude` / `longitude` numeric columns remain the API-facing
input and are preserved for backward compatibility. `location` is derived from
them at write time and is never exposed by any response schema.

## Local development

The development database runs from `docker-compose.yml`:

```text
image: postgis/postgis:18-3.6
host port 5433 -> container port 5432
```

`.env` (gitignored) points at `127.0.0.1:5433`. The native PostgreSQL install on
port 5432 is left untouched.

```bash
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
```

The Day 5 migration (`4adbb2b687bd`) runs `CREATE EXTENSION IF NOT EXISTS
postgis` and creates GiST indexes:

- `ix_donor_profiles_location`
- `ix_blood_requests_location`
- `ix_blood_banks_location`

`CREATE EXTENSION` normally needs a superuser or a role with `CREATE` on the
database. In managed environments where the application role cannot install
extensions, a DBA must pre-create `postgis`; the migration is idempotent.

There is no non-spatial fallback. If PostGIS is unavailable, the migration
fails loudly instead of silently degrading to an unindexed distance scan.

The PostGIS Docker image also installs `postgis_topology` and
`postgis_tiger_geocoder` and adds those schemas to `search_path`. Alembic
connects with `-csearch_path=public` so extension-owned tables never appear as
migration drift.

## Matching endpoint

```http
GET /api/v1/requests/{request_id}/matches?radius_km=10&limit=50&offset=0
Authorization: Bearer <token>
```

Only the request owner may call it. Unknown request: `404`. Another user's
request: `403`. Request in a terminal state: `409`.

### Rules

A donor is a candidate only when all of the following are true:

1. `availability_status = 'available'` (paused and withdrawn donors excluded).
2. `blood_group` equals the requested group (candidate selection only — this is
   **not** a clinical compatibility claim).
3. `location IS NOT NULL` (no fabricated coordinates from district/locality).
4. The donor profile's user is not the requester.
5. `ST_DWithin(donor.location, request.location, radius_km * 1000)` is true.

Results are ordered by exact database distance, then donor profile id for stable
ties. `distance_km` is rounded to 2 decimals. Candidates are capped by `limit`
(default 50, maximum 100).

### Request location requirement

A request without coordinates returns:

```json
{"detail": "Blood request has no coordinates; matching requires a location"}
```

with status `422`. The API never derives coordinates from a district or
locality name.

### Radius limits

- Default: `DONOR_MATCH_DEFAULT_RADIUS_KM=10`
- Maximum: `DONOR_MATCH_MAX_RADIUS_KM=50`

Values `<= 0` or above the maximum are rejected with `422`. The search radius is
never silently expanded.

### Privacy

The response contains only:

- donor profile id
- blood group
- availability status
- district id/name
- locality
- rounded distance
- contact-verified flag

It does **not** contain names, phone numbers, email addresses, user ids, or
latitude/longitude. Contact exchange is deliberately deferred.

### Side effects

Matching is read-only. It does not change request status, create donor
responses, notify anyone, or mark a request fulfilled. A candidate is not a
responder.

## Verification

```bash
alembic -c backend/alembic.ini current
alembic -c backend/alembic.ini check
pytest -q
```

```sql
SELECT PostGIS_Version();
SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_location';
```
