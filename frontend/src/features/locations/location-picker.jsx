import { useEffect, useRef, useState } from "react"
import { LoaderCircle, MapPin, Navigation, Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MapPicker } from "@/features/locations/map-picker"
import { reverseGeocode, searchPlaces } from "@/features/locations/geocoding-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const GEOLOCATION_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
const SEARCH_DEBOUNCE_MS = 400

function geoErrorMessage(error, t) {
  if (error.code === error.PERMISSION_DENIED) return t("locations.permissionDenied")
  if (error.code === error.POSITION_UNAVAILABLE) return t("locations.positionUnavailable")
  if (error.code === error.TIMEOUT) return t("locations.timeout")
  return t("locations.positionUnavailable")
}

/**
 * Shared precise-location picker. Three consent-based flows:
 *  1. "Use my current location" — browser Geolocation API, only on click.
 *  2. Map — OSM tiles via Leaflet; click or drag the pin; optional place search.
 *  3. District/locality dropdowns remain available next to the picker, independent of it.
 *
 * `value` is `{ latitude, longitude, label } | null` (label is display-only
 * and never sent to the backend). `onChange(null)` clears the selection.
 * The picker never runs on page load and never submits anything by itself.
 */
export function LocationPicker({ value, onChange, disabled = false }) {
  const { t } = useTranslation()
  const [mapOpen, setMapOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchState, setSearchState] = useState("idle") // idle | loading | done | failed
  // Guards against a slow reverse-geocode for an older pick overwriting a newer one.
  const pickSequence = useRef(0)

  const coords = value ? { latitude: value.latitude, longitude: value.longitude } : null

  /** Set coordinates immediately with a fallback label, then refine the label. */
  async function pickCoordinates(nextCoords, fallbackLabel) {
    const seq = ++pickSequence.current
    onChange({ ...nextCoords, label: null })
    const label = await reverseGeocode(nextCoords.latitude, nextCoords.longitude)
    if (seq === pickSequence.current) {
      onChange({ ...nextCoords, label: label || fallbackLabel })
    }
  }

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError(t("locations.unsupported"))
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        pickCoordinates(
          { latitude: position.coords.latitude, longitude: position.coords.longitude },
          t("locations.labelCurrentLocation"),
        )
      },
      (error) => {
        setLocating(false)
        setGeoError(geoErrorMessage(error, t))
      },
      GEOLOCATION_OPTIONS,
    )
  }

  // Search UI renders only while a valid query is active, so stale results
  // from a previous query never need to be cleared synchronously.
  const searchActive = mapOpen && searchQuery.trim().length >= 3

  // Debounced place search; failures surface as a state, never a crash.
  // State changes happen only in fetch callbacks; the input handler sets
  // "loading" as a user event.
  useEffect(() => {
    if (!searchActive) return undefined
    let cancelled = false
    const timer = setTimeout(() => {
      searchPlaces(searchQuery.trim())
        .then((results) => {
          if (!cancelled) {
            setSearchResults(results)
            setSearchState("done")
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([])
            setSearchState("failed")
          }
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, searchActive])

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{t("locations.title")}</p>
        <span className="text-xs text-muted-foreground">{t("locations.explainer")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={disabled || locating}
        >
          {locating ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Navigation className="size-4" aria-hidden />
          )}
          {locating ? t("locations.locating") : t("locations.useCurrentLocation")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMapOpen((open) => !open)}
          disabled={disabled}
          aria-expanded={mapOpen}
        >
          <MapPin className="size-4" aria-hidden />
          {mapOpen ? t("locations.hideMap") : t("locations.pickOnMap")}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              pickSequence.current += 1
              setGeoError(null)
              onChange(null)
            }}
            disabled={disabled}
          >
            <X className="size-4" aria-hidden />
            {t("locations.clear")}
          </Button>
        ) : null}
      </div>

      {/* Selected-location label; announce changes politely for screen readers. */}
      <p aria-live="polite" className="text-sm">
        {value ? (
          <span className="inline-flex items-center gap-1.5 font-medium">
            <MapPin className="size-4 text-primary" aria-hidden />
            {value.label || t("locations.labelSelected")}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("locations.noneSelected")}</span>
        )}
      </p>

      {geoError ? (
        <Alert variant="destructive">
          <AlertDescription>{geoError}</AlertDescription>
        </Alert>
      ) : null}

      {mapOpen ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              className="pl-8"
              placeholder={t("locations.searchPlaceholder")}
              aria-label={t("locations.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchState("loading")
              }}
              disabled={disabled}
            />
          </div>

          {searchActive && searchState === "loading" ? (
            <p className="text-sm text-muted-foreground">{t("locations.searching")}</p>
          ) : null}
          {searchActive && searchState === "failed" ? (
            <p className="text-sm text-destructive">{t("locations.searchFailed")}</p>
          ) : null}
          {searchActive && searchState === "done" && searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("locations.noResults")}</p>
          ) : null}
          {searchResults.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-md border bg-background p-1">
              {searchResults.map((result) => (
                <li key={`${result.label}-${result.latitude}-${result.longitude}`}>
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      pickSequence.current += 1
                      onChange({
                        latitude: result.latitude,
                        longitude: result.longitude,
                        label: result.label,
                      })
                    }}
                  >
                    <span className="block truncate">{result.label}</span>
                    {result.detail ? (
                      <span className="block text-xs text-muted-foreground">{result.detail}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <MapPicker position={coords} onPick={(next) => pickCoordinates(next, t("locations.labelMapPin"))} />
          <p className="text-xs text-muted-foreground">{t("locations.dragToAdjust")}</p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{t("locations.approximateNote")}</p>
    </div>
  )
}
