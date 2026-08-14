import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, ExternalLink, Loader } from 'lucide-react'

// Tile options — Carto Voyager is cleaner and more modern than raw OSM
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

type Coords = { lat: number; lng: number }

// Geocode a location string using Nominatim, biased to Ghana
async function geocode(location: string): Promise<Coords | null> {
  if (!location || location.toLowerCase() === 'remote') return null
  try {
    const q = encodeURIComponent(`${location}, Ghana`)
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=gh`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await r.json()
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

// Custom BeyondX pin marker SVG
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#6BAB21"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <circle cx="16" cy="16" r="4" fill="#6BAB21"/>
</svg>`

function makePinIcon() {
  return L.divIcon({
    html: PIN_SVG,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: '',
  })
}

interface Props {
  location: string
  /** Height of the map in tailwind h-* syntax — defaults to h-44 */
  heightClass?: string
  /** Show the "Open in Google Maps" link */
  showOpenLink?: boolean
  /** If coords are already known (e.g. worker's home), skip geocoding */
  coords?: Coords
}

export default function JobLocationMap({ location, heightClass = 'h-44', showOpenLink = true, coords: propCoords }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [coords, setCoords] = useState<Coords | null>(propCoords || null)
  const [loading, setLoading] = useState(!propCoords)
  const [failed, setFailed] = useState(false)

  // Geocode the location string if no coords passed
  useEffect(() => {
    if (propCoords) { setCoords(propCoords); setLoading(false); return }
    if (!location || location === 'Remote') { setFailed(true); setLoading(false); return }
    setLoading(true)
    setFailed(false)
    geocode(location).then((c) => {
      if (c) setCoords(c)
      else setFailed(true)
      setLoading(false)
    })
  }, [location, propCoords])

  // Build the map once coords are ready
  useEffect(() => {
    if (!coords || !boxRef.current || mapRef.current) return

    try {
      const map = L.map(boxRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTR,
        subdomains: 'abcd',
      }).addTo(map)

      L.marker([coords.lat, coords.lng], { icon: makePinIcon() })
        .addTo(map)
        .bindPopup(`<strong>${location}</strong>`, { closeButton: false })

      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 80)
    } catch {
      setFailed(true)
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [coords]) // eslint-disable-line react-hooks/exhaustive-deps

  const gmapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + ', Ghana')}`

  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-cream-100 ${heightClass}`}>
        <span className="flex items-center gap-2 text-xs text-ink-700/50">
          <Loader size={13} className="animate-spin" /> Loading map…
        </span>
      </div>
    )
  }

  if (failed || (!coords && !loading)) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 rounded-xl bg-cream-100 border border-ink-900/8 ${heightClass}`}>
        <MapPin size={18} className="text-ink-700/30" />
        <p className="text-xs text-ink-700/50">Map unavailable for this location</p>
        {showOpenLink && (
          <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline">
            Search in Google Maps <ExternalLink size={10} />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={boxRef}
        role="img"
        aria-label={`Map showing job location: ${location}`}
        className={`w-full overflow-hidden rounded-xl border border-ink-900/8 ${heightClass}`}
      />
      {showOpenLink && coords && (
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 hover:underline"
        >
          <ExternalLink size={11} /> Open in Google Maps
        </a>
      )}
    </div>
  )
}
