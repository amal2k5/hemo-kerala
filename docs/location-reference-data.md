# Kerala location reference data

## What is implemented

| Table | Columns | Notes |
|---|---|---|
| `districts` | `id`, `code` (unique slug), `name` (unique) | The 14 districts of Kerala are seeded by migration `2fa9b633033b`. |
| `local_bodies` | `id`, `district_id`, `type`, `name` | Unique on `(district_id, type, name)`. Types: `grama_panchayat`, `municipality`, `corporation`. |

`code` values are stable internal slugs (for example `palakkad`), not official
government identifiers.

## What is intentionally not implemented

- **No local-body dataset is seeded.** Kerala has roughly 941 grama panchayats,
  87 municipalities, and 6 corporations. Inventing or hand-typing this data
  would be unreliable and is outside the Day 3 scope.
- No PostGIS geometry, spatial index, distance query, or donor matching.
  Administrative geography is separate from physical distance.

## Import task (remaining)

1. Obtain an authoritative local-body dataset from the Kerala Local Self
   Government Department (https://lsgkerala.gov.in/) or an equivalent official
   source, with permission for reuse.
2. Map each record to one of the 14 `districts.id` values.
3. Normalise names and classify each record as `grama_panchayat`,
   `municipality`, or `corporation`.
4. Import idempotently via a one-off script or data migration using
   `INSERT ... ON CONFLICT (district_id, type, name) DO NOTHING`.
5. If official codes are available, add an `external_code` column through a new
   Alembic revision and keep it unique. Do not replace surrogate ids.

Until that import runs, `/api/v1/locations/local-bodies` returns an empty list
and donor profiles may store `district_id` plus free-text `locality`. GPS
permission is never required: users can select a district and type a locality
manually.
