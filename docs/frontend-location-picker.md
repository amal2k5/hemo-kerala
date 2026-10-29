# Frontend location picker

## Overview

The donor-profile form, the blood-request form, and the blood-bank "nearby"
filter let users choose an approximate location without ever typing
coordinates:

1. **Use my current location** — the browser Geolocation API, invoked only
   when the user clicks the button and grants permission. Never requested on
   page load, never sent anywhere without that explicit click.
2. **Pick on map** — a Leaflet map with OpenStreetMap tiles. Click the map or
   drag the pin; an optional place search finds localities.
3. **District + locality dropdowns** — the pre-existing reference-data
   selects, unchanged and independent of coordinates.

A human-readable label is shown for the chosen spot; coordinates themselves
are never displayed as form fields. The picker is one reusable component:
`frontend/src/features/locations/location-picker.jsx` (map:
`map-picker.jsx`, geocoding: `geocoding-service.js`).

## Mapping provider

- **Map tiles:** OpenStreetMap standard tile layer via Leaflet 1.9 /
  react-leaflet 5. Free, no API key, no configuration.
  - Attribution is rendered by Leaflet: "© OpenStreetMap contributors".
  - Tile usage policy: https://operations.osfmachine.org/policies/osmtiles.html
    (light, interactive, user-triggered use only — no bulk downloads, which
    this app does not do).
- **Geocoding:** Nominatim (https://nominatim.openstreetmap.org), free and
  keyless.
  - Search is bounded to Kerala via `countrycodes=in` + `viewbox`/`bounded`.
  - Reverse geocoding uses `zoom=14` (area-level labels, deliberately
    approximate).
  - **Rate limit:** the usage policy allows at most 1 request per second.
    `geocoding-service.js` serialises every call through a client-side
    throttle (1.1 s minimum spacing) and the search box debounces input
    (400 ms). Failures degrade to fallback labels; the UI never blocks form
    submission on geocoding.

## Configuration

None required. There are no API keys or environment variables. Two hard-coded
knobs live at the top of `geocoding-service.js` if they ever need tuning:
`NOMINATIM_BASE` and `KERALA_VIEWBOX`.

## Privacy notes

- Coordinates chosen by a user are sent only to the HemoKerala backend in
  the same optional `latitude`/`longitude` fields as before; the backend
  derives the PostGIS `location` column and matching still happens
  server-side.
- Donor coordinates are never exposed by any API response — the matching
  endpoint returns only rounded distances and general areas, and the public
  blood-bank directory exposes neither bank coordinates nor distances.
- The reverse-geocode label is display-only and is never submitted.

## Known limitations

- Nominatim's fair-use rate limit makes its search unsuitable for heavy
  production traffic; if the project outgrows it, swap
  `searchPlaces`/`reverseGeocode` in `geocoding-service.js` for a
  self-hosted Nominatim or another provider — no other module touches it.
- Geolocation accuracy depends on the device (network-level positioning is
  requested deliberately: `enableHighAccuracy: false`).
- Map place search covers Kerala only (intended scope).
