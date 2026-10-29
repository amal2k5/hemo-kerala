import { useEffect, useRef } from "react"
import L from "leaflet"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import iconUrl from "leaflet/dist/images/marker-icon.png"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png"

// Bundlers break Leaflet's default icon paths; point them at the bundled assets.
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl: iconShadowUrl,
})

const KERALA_CENTER = [10.5, 76.2]

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })
  return null
}

/**
 * Flies to `position` when it is set from outside the map (geolocation or
 * search). Pin moves made by dragging or clicking the map are marked as
 * internal so they don't trigger a re-centre fight.
 */
function Recenter({ position, internalRef }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    if (internalRef.current) {
      internalRef.current = false
      return
    }
    map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    })
  }, [position, map, internalRef])
  return null
}

/**
 * Reusable OpenStreetMap picker: click anywhere or drag the pin to choose an
 * approximate location. Tiles © OpenStreetMap contributors. Parent owns the
 * selected position; `onPick` receives `{ latitude, longitude }`.
 */
export function MapPicker({ position, onPick }) {
  const internalRef = useRef(false)

  function handlePick(coords) {
    internalRef.current = true
    onPick(coords)
  }

  return (
    // `relative z-0` keeps Leaflet's high z-index panes inside this stacking
    // context so they can't cover the sticky header or dropdowns.
    <div className="relative z-0 h-64 w-full overflow-hidden rounded-md border sm:h-80">
      <MapContainer center={KERALA_CENTER} zoom={7} scrollWheelZoom className="size-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handlePick} />
        <Recenter position={position} internalRef={internalRef} />
        {position ? (
          <Marker
            draggable
            position={[position.latitude, position.longitude]}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng()
                handlePick({ latitude: latlng.lat, longitude: latlng.lng })
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
