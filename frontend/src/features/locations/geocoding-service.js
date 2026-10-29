import i18n from "@/i18n"

/**
 * Geocoding via Nominatim (OpenStreetMap) — free, no API key.
 *
 * Usage policy (https://operations.osfmachine.org/policies/nominatim.html):
 * at most 1 request/second, a valid Referer/User-Agent identifying the app
 * (browsers send Referer automatically), and visible attribution. Both
 * helpers are funnelled through a shared throttle that never exceeds that
 * rate, and Kerala is preferred via `countrycodes` + `viewbox`/`bounded`.
 *
 * If usage ever outgrows Nominatim, swap these two functions for a
 * self-hosted Nominatim or another provider — nothing else imports them.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
// Opposite corners of Kerala (lon/lat pairs): roughly Kovalam to Kasaragod.
const KERALA_VIEWBOX = "74.6,13.0,77.9,8.1"
const MIN_INTERVAL_MS = 1100

let lastRequestAt = 0
let queueTail = Promise.resolve()

/** Serialize Nominatim calls, guaranteeing >= MIN_INTERVAL_MS between them. */
function throttled(run) {
  const queued = queueTail.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastRequestAt = Date.now()
    return run()
  })
  queueTail = queued.catch(() => {})
  return queued
}

async function nominatim(params) {
  const url = `${NOMINATIM_BASE}/${params.path}?${new URLSearchParams(params.query)}`
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": i18n.language || "en",
    },
  })
  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`)
  }
  return response.json()
}

/** Shorten Nominatim's display_name to its leading parts for UI labels. */
export function shortDisplayName(displayName, parts = 3) {
  if (!displayName) return null
  return displayName.split(",").slice(0, parts).join(",").trim()
}

/**
 * Free-text place search, restricted to Kerala. Returns
 * `[{ label, latitude, longitude }]`, or throws on network/rate-limit errors
 * so callers can show a failure state.
 */
export async function searchPlaces(query) {
  const trimmed = query.trim()
  if (!trimmed) return []
  const results = await throttled(() =>
    nominatim({
      path: "search",
      query: {
        format: "jsonv2",
        q: trimmed,
        limit: 5,
        countrycodes: "in",
        viewbox: KERALA_VIEWBOX,
        bounded: 1,
        "accept-language": i18n.language || "en",
      },
    }),
  )
  if (!Array.isArray(results)) return []
  return results
    .filter((item) => item.lat !== undefined && item.lon !== undefined)
    .map((item) => ({
      label: shortDisplayName(item.display_name) || item.display_name,
      detail: [item.type, item.class].filter(Boolean).join(" · "),
      latitude: Number.parseFloat(item.lat),
      longitude: Number.parseFloat(item.lon),
    }))
}

/**
 * Reverse-geocode coordinates into a short human-readable label. Returns
 * `null` on any failure so callers can fall back to their own wording
 * instead of surfacing raw coordinates.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const result = await throttled(() =>
      nominatim({
        path: "reverse",
        query: {
          format: "jsonv2",
          lat: String(latitude),
          lon: String(longitude),
          zoom: 14,
          "accept-language": i18n.language || "en",
        },
      }),
    )
    if (!result || result.error) return null
    return shortDisplayName(result.display_name)
  } catch {
    return null
  }
}
