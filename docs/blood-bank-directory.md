# Blood-bank directory

## Scope

The directory is a read-only public reference of blood banks. It stores no
blood-stock quantities and makes no real-time availability claim. Stock changes
too quickly to represent honestly without a live source, and nothing in this
milestone integrates with one.

## Public API

```http
GET /api/v1/blood-banks
GET /api/v1/blood-banks/{id}
```

No authentication is required. Only records with `is_approved = true` are
visible; unapproved records behave as `404`.

Filters:

- `district_id`
- `verification_status`
- `latitude` + `longitude` + optional `radius_km` (default 10, maximum 100)
- `limit` / `offset`

`latitude` and `longitude` must be supplied together. `radius_km` without both
coordinates is rejected. Location search is PostGIS-backed and ordered by
distance.

Public responses include: name, address, locality, district, public phone/email,
verification status, verification date, source URL, and `last_updated_at`
(the row's `updated_at`). Internal approval state and coordinates are not
exposed.

## Verification semantics

| Status | Meaning |
|---|---|
| `verified` | Checked against an official source; `verification_date` and `source_url` are mandatory |
| `unverified` | Known entry, but no authoritative check has been recorded |
| `stale` | Previously checked, but the source is old or may have changed |
| `unknown` | No meaningful verification information |

A database `CHECK` constraint rejects `verified` rows without both
`verification_date` and `source_url`. The API never upgrades a record to
`verified` on its own.

## Why there are no write endpoints

The project has no administrative role or RBAC yet. Adding a public `POST` or
`PATCH` would either let any user modify official records or invent a fake
authorization model. Both are out of scope for Day 5.

Unauthorized mutations therefore fail with `405 Method Not Allowed`. Write
endpoints should be added only together with a real administrative role and
audit trail.

## Populating legitimate data

Approved rows are loaded by a controlled operator process (SQL or a reviewed
import script), not by public users and not by scraping.

1. Obtain the list from an official source: the Kerala Health Department, the
   Kerala Blood Transfusion Council, an official district health office, or the
   organisation's own published page.
2. Record the exact source URL and the date the data was checked.
3. Store only public contact details. Never add donor or patient data.
4. Use `is_approved = false` while a row is being reviewed, then set it to
   `true` for publication.
5. If a source later changes, set `verification_status = 'stale'` rather than
   guessing a new value.

Template (run as an operator, with values from the source):

```sql
INSERT INTO blood_banks (
    name, address, locality, district_id,
    public_phone, public_email,
    latitude, longitude, location,
    verification_status, verification_date, source_url, is_approved
) VALUES (
    :name, :address, :locality, :district_id,
    :public_phone, :public_email,
    :latitude, :longitude,
    CASE
        WHEN :latitude IS NULL OR :longitude IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
    END,
    :verification_status, :verification_date, :source_url, :is_approved
);
```

Do not invent records, phone numbers, coordinates, or source URLs. Do not scrape
sites without explicit authorization. If no vetted dataset is available, the
directory may legitimately remain empty; the schema and endpoints are ready for
reviewed data.

## Tests

`backend/tests/integration/test_blood_banks.py` covers public listing, district
and distance filters, hidden unapproved rows, the verified-evidence constraint,
honest stale/unknown representation, detail responses, and rejected writes.
