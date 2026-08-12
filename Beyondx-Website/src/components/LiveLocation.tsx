import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, ExternalLink, RefreshCw } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const POLL_MS = 45_000

type Live = {
  lat: number
  lng: number
  accuracy?: number
  worker_name?: string
  updated_at: string
  ageMs: number
  stale: boolean
}

function ago(ms: number) {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? 'over an hour ago' : `${hrs} hours ago`
}

/**
 * Shows where a worker is while a job is under way. Only appears once the
 * worker has chosen to share — there is no way to request or force it.
 */
export default function LiveLocation({ taskId }: { taskId: string | number }) {
  const [live, setLive] = useState<Live | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/location?taskId=${encodeURIComponent(String(taskId))}`, { cache: 'no-store' })
      const d = await r.json()
      setLive(d?.location || null)
    } catch {
      setLive(null)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
    const t = window.setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => window.clearInterval(t)
  }, [load])

  if (loading) {
    return <p className="mt-3 border-t border-ink-900/10 pt-3 text-xs text-ink-700">Checking for live location…</p>
  }

  if (!live) {
    return (
      <p className="mt-3 flex items-start gap-2 border-t border-ink-900/10 pt-3 text-xs leading-relaxed text-ink-700">
        <MapPin size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-700/50" />
        The worker hasn&rsquo;t shared their location for this job. They can turn it on from their dashboard.
      </p>
    )
  }

  const maps = `https://www.google.com/maps/search/?api=1&query=${live.lat},${live.lng}`

  return (
    <div className="mt-3 border-t border-ink-900/10 pt-3">
      <LocationMap lat={live.lat} lng={live.lng} accuracy={live.accuracy} stale={live.stale} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-800">
          <MapPin size={14} aria-hidden="true" className={`mt-0.5 shrink-0 ${live.stale ? 'text-clay-500' : 'text-forest-600'}`} />
          <span>
            <span className="font-semibold">
              {live.stale ? 'Last seen' : 'Sharing live'}
            </span>{' '}
            <span className="text-ink-700">
              {ago(live.ageMs)}
              {live.accuracy ? ` · accurate to about ${Math.round(live.accuracy)}m` : ''}
            </span>
            {live.stale && (
              <span className="mt-0.5 block text-ink-700/70">
                Sharing may have been turned off, or the phone lost signal.
              </span>
            )}
          </span>
        </p>
        <span className="flex shrink-0 items-center gap-2">
          <button
            onClick={load}
            aria-label="Refresh location"
            className="rounded-full border border-ink-900/15 p-1.5 text-ink-700 transition-colors hover:bg-ink-900/5"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 transition-colors hover:bg-forest-500"
          >
            Open larger <ExternalLink size={12} aria-hidden="true" />
          </a>
        </span>
      </div>
    </div>
  )
}

/**
 * A small live map. Uses Leaflet with OpenStreetMap tiles — no API key, no
 * account, and the marker moves without reloading the panel.
 */
function LocationMap({ lat, lng, accuracy, stale }: { lat: number; lng: number; accuracy?: number; stale: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const haloRef = useRef<L.Circle | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return
    try {
      const map = L.map(boxRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
      })

      // A single dropped tile is normal on a patchy connection — only give up
      // if nothing loads at all within a few seconds.
      let loadedAny = false
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
        .on('tileload', () => { loadedAny = true })
        .addTo(map)
      window.setTimeout(() => { if (!loadedAny) setFailed(true) }, 6000)

      haloRef.current = L.circle([lat, lng], {
        radius: accuracy || 25,
        color: '#6BAB21',
        weight: 1,
        fillColor: '#6BAB21',
        fillOpacity: 0.12,
      }).addTo(map)

      markerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: stale ? '#8f6128' : '#6BAB21',
        fillOpacity: 1,
      }).addTo(map)

      mapRef.current = map
      // The panel is inside a card that may still be sizing when the map mounts.
      setTimeout(() => map.invalidateSize(), 60)
    } catch {
      setFailed(true)
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Move the marker as new positions arrive, without rebuilding the map.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRef.current?.setLatLng([lat, lng])
    markerRef.current?.setStyle({ fillColor: stale ? '#8f6128' : '#6BAB21' })
    haloRef.current?.setLatLng([lat, lng])
    if (accuracy) haloRef.current?.setRadius(accuracy)
    map.panTo([lat, lng], { animate: true })
  }, [lat, lng, accuracy, stale])

  if (failed) {
    return (
      <p className="mb-3 rounded-xl bg-cream-100 p-3 text-xs leading-relaxed text-ink-700 ring-1 ring-ink-900/10">
        The map could not load — this is usually a slow connection. The position and
        map link below still work.
      </p>
    )
  }

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label="Map showing the worker's current location"
      className="mb-3 h-48 w-full overflow-hidden rounded-xl ring-1 ring-ink-900/10 sm:h-56"
    />
  )
}
