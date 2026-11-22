// Live tracking map for a job: the job site and, once the Xpert shares it, their
// live position, joined by a dashed line, with distance and a rough arrival time.
//
// Leaflet with OpenStreetMap tiles: no API key, works on slow connections. The Xpert's position comes from /api/location (only while they
// choose to share); the site comes from geocoding the job's location text.
import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowsOut, Crosshair, MapPin, MapTrifold, NavigationArrow, SpinnerGap } from '@phosphor-icons/react'
import { geocode } from '../JobLocationMap'

// OpenStreetMap's own tiles: no API key or account. A soft grey wash (see
// .bx-tiles in index.css) keeps the map calm so the pins stand out.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const POLL_MS = 20_000
const CITY_KMH = 22 // typical Accra traffic speed, for a rough arrival time only

type LatLng = { lat: number; lng: number }
type Live = LatLng & { accuracy?: number; worker_name?: string; updated_at: string; ageMs: number; stale: boolean }

function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function ago(ms: number) {
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  return `${h} hr${h > 1 ? 's' : ''} ago`
}
const initials = (name?: string) => (name || 'X').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const siteIcon = () => L.divIcon({
  className: '',
  iconSize: [40, 48], iconAnchor: [20, 46],
  html: `<div class="bx-site-pin"><svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 47C20 47 38 30.5 38 19A18 18 0 1 0 2 19C2 30.5 20 47 20 47Z" fill="#33520f" stroke="white" stroke-width="2.5"/>
    <path d="M12.5 19.5 20 13l7.5 6.5V27h-5v-5h-5v5h-5z" fill="white"/></svg></div>`,
})
const xpertIcon = (name: string | undefined, stale: boolean) => L.divIcon({
  className: '',
  iconSize: [44, 44], iconAnchor: [22, 22],
  html: `<div class="bx-xpert-pin ${stale ? 'is-stale' : ''}"><span class="bx-xpert-ring"></span><span class="bx-xpert-dot">${initials(name)}</span></div>`,
})

export default function TrackingMap({ task, xpertName, live: liveEnabled, compact = false }: {
  task: { id: string | number; location?: string }
  xpertName?: string
  /** Poll for the Xpert's position (only while they are on the way or on the job). */
  live: boolean
  /** Smaller map for job lists. */
  compact?: boolean
}) {
  const box = useRef<HTMLDivElement | null>(null)
  const map = useRef<L.Map | null>(null)
  const siteM = useRef<L.Marker | null>(null)
  const xpertM = useRef<L.Marker | null>(null)
  const halo = useRef<L.Circle | null>(null)
  const line = useRef<L.Polyline | null>(null)
  const fitted = useRef(false)

  const [site, setSite] = useState<LatLng | null>(null)
  const [siteState, setSiteState] = useState<'loading' | 'ok' | 'none'>('loading')
  const [live, setLive] = useState<Live | null>(null)
  const [tilesFailed, setTilesFailed] = useState(false)

  const remote = !task.location || task.location.toLowerCase() === 'remote'

  // Job site: geocode once, cached for the session to spare the geocoder.
  useEffect(() => {
    if (remote) { setSiteState('none'); return }
    const key = `bx_geo_${task.location}`
    try {
      const hit = sessionStorage.getItem(key)
      if (hit) { setSite(JSON.parse(hit)); setSiteState('ok'); return }
    } catch { /* storage unavailable */ }
    geocode(task.location as string).then((c) => {
      if (c) { setSite(c); setSiteState('ok'); try { sessionStorage.setItem(key, JSON.stringify(c)) } catch { /* ignore */ } }
      else setSiteState('none')
    })
  }, [task.location, remote])

  // Xpert: poll the shared position while the job is live.
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/location?taskId=${encodeURIComponent(String(task.id))}`, { cache: 'no-store' })
      const d = await r.json()
      setLive(d?.location || null)
    } catch { setLive(null) }
  }, [task.id])
  useEffect(() => {
    if (!liveEnabled) return
    load()
    const t = window.setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => window.clearInterval(t)
  }, [liveEnabled, load])

  const fit = useCallback(() => {
    const m = map.current
    if (!m) return
    const pts: L.LatLngExpression[] = []
    if (site) pts.push([site.lat, site.lng])
    if (live) pts.push([live.lat, live.lng])
    // Leave room top-left for the status card and right for the buttons.
    if (pts.length === 2) m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [50, (box.current?.clientWidth || 800) < 640 ? 50 : compact ? 100 : 120], paddingBottomRight: [70, 50], maxZoom: 16, animate: true })
    else if (pts.length === 1) m.setView(pts[0], 15, { animate: true })
  }, [site, live, compact])

  // Build the map once there is something to show.
  useEffect(() => {
    if (map.current || !box.current || (!site && !live)) return
    const start = site || live!
    const m = L.map(box.current, { center: [start.lat, start.lng], zoom: 15, zoomControl: false, scrollWheelZoom: false, attributionControl: true })
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    let loaded = false
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTR, className: 'bx-tiles' })
      .on('tileload', () => { loaded = true }).addTo(m)
    window.setTimeout(() => { if (!loaded) setTilesFailed(true) }, 7000)
    m.on('click', () => m.scrollWheelZoom.enable())
    map.current = m
    window.setTimeout(() => m.invalidateSize(), 80)
  }, [site, live])

  // Tear the map down only when the component leaves the page.
  useEffect(() => () => {
    map.current?.remove()
    map.current = null; siteM.current = null; xpertM.current = null; halo.current = null; line.current = null; fitted.current = false
  }, [])

  // Keep markers, line and view in step with the data.
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (site) {
      if (!siteM.current) siteM.current = L.marker([site.lat, site.lng], { icon: siteIcon(), zIndexOffset: 100 }).addTo(m).bindTooltip(task.location || 'Job site', { direction: 'top', offset: [0, -44], className: 'bx-map-tip' })
      else siteM.current.setLatLng([site.lat, site.lng])
    }
    if (live) {
      const color = live.stale ? '#b45309' : '#6bab21'
      if (!xpertM.current) {
        xpertM.current = L.marker([live.lat, live.lng], { icon: xpertIcon(xpertName || live.worker_name, live.stale), zIndexOffset: 200 }).addTo(m)
          .bindTooltip(xpertName || live.worker_name || 'Your Xpert', { direction: 'top', offset: [0, -22], className: 'bx-map-tip' })
        halo.current = L.circle([live.lat, live.lng], { radius: live.accuracy || 30, color, weight: 1, fillColor: color, fillOpacity: 0.1 }).addTo(m)
      } else {
        xpertM.current.setLatLng([live.lat, live.lng]).setIcon(xpertIcon(xpertName || live.worker_name, live.stale))
        halo.current?.setLatLng([live.lat, live.lng]).setRadius(live.accuracy || 30).setStyle({ color, fillColor: color })
      }
    }
    if (site && live) {
      const pts: L.LatLngExpression[] = [[live.lat, live.lng], [site.lat, site.lng]]
      if (!line.current) line.current = L.polyline(pts, { color: '#33520f', weight: 3, opacity: 0.7, dashArray: '2 10', lineCap: 'round' }).addTo(m)
      else line.current.setLatLngs(pts)
    }
    if (!fitted.current || live) { fit(); fitted.current = true }
  }, [site, live, xpertName, task.location, fit])

  const dist = site && live ? distanceKm(live, site) : null
  const arrived = dist !== null && dist < 0.15
  const etaMin = dist !== null && !arrived ? Math.max(1, Math.round((dist * 1.3 / CITY_KMH) * 60)) : null // 1.3: roads aren't straight
  const directions = site
    ? (live ? `https://www.google.com/maps/dir/?api=1&origin=${live.lat},${live.lng}&destination=${site.lat},${site.lng}` : `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${task.location || ''}, Ghana`)}`

  const height = compact ? 'h-60 sm:h-64' : 'h-72 sm:h-96'

  if (remote) return null

  if (siteState === 'loading' && !live) {
    return (
      <div className={`grid ${height} place-items-center rounded-2xl border border-ink-900/[0.08] bg-forest-50/50`}>
        <span className="flex items-center gap-2 text-sm text-ink-700/60"><SpinnerGap size={18} className="animate-spin" /> Loading map…</span>
      </div>
    )
  }

  if ((siteState === 'none' && !live) || tilesFailed) {
    return (
      <div className={`flex ${compact ? 'h-40' : 'h-56'} flex-col items-center justify-center gap-2 rounded-2xl border border-ink-900/[0.08] bg-forest-50/50 px-6 text-center`}>
        <MapTrifold size={32} weight="duotone" className="text-forest-600" />
        <p className="text-sm text-ink-700/70">{tilesFailed ? 'The map could not load. This is usually a slow connection.' : 'We could not place this address on the map.'}</p>
        <a href={directions} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-forest-700 hover:underline">Open in Google Maps</a>
      </div>
    )
  }

  const statusCard = (
    <div className="pointer-events-auto rounded-xl border border-white/60 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(18,24,14,0.12)] backdrop-blur-md">
              {live ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <span className="relative flex h-2.5 w-2.5">
                      {!live.stale && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-60" />}
                      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live.stale ? 'bg-amber-500' : 'bg-forest-600'}`} />
                    </span>
                    {arrived ? 'Xpert is at the site' : live.stale ? 'Last seen' : 'Live'}
                    <span className="font-normal text-ink-700/60">· {ago(live.ageMs)}</span>
                  </p>
                  {dist !== null && !arrived && (
                    <p className="mt-1 text-sm text-ink-700">
                      <span className="font-semibold text-ink-900">{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</span> from the site
                      {etaMin && !live.stale ? <> · about <span className="font-semibold text-ink-900">{etaMin} min</span> away</> : null}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900"><MapPin size={16} weight="duotone" className="text-forest-700" /> Job site</p>
                  <p className="mt-0.5 text-xs text-ink-700/70">
                    {liveEnabled ? 'Live position appears when your Xpert shares it from their phone.' : 'Live tracking starts once an Xpert is on the way.'}
                  </p>
                </>
              )}
            </div>
  )

  return (
    <div>
    <div className={`relative isolate overflow-hidden rounded-2xl border border-ink-900/[0.08] bg-forest-50/40 ${height}`}>
      <div ref={box} role="img" aria-label={`Map of the job site${live ? ' and the Xpert’s live position' : ''}`} className="absolute inset-0 z-0" />

      {/* Status card: over the map from small tablets up */}
      <div className="pointer-events-none absolute left-3 top-3 z-[500] hidden max-w-[calc(100%-5rem)] sm:left-4 sm:top-4 sm:block">
        {statusCard}
      </div>

      {/* Legend */}
      {live && site && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden items-center gap-4 rounded-lg bg-white/90 px-3 py-2 text-xs text-ink-700 shadow-sm backdrop-blur sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-forest-500 ring-2 ring-white" /> {xpertName || live.worker_name || 'Xpert'}</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-forest-900 ring-2 ring-white" /> Job site</span>
        </div>
      )}

      {/* Actions */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2 sm:right-4 sm:top-4">
        <button onClick={fit} aria-label="Recenter the map" title="Recenter"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/60 bg-white/90 text-ink-800 shadow-sm backdrop-blur transition-colors hover:text-forest-700">
          <Crosshair size={20} weight="duotone" />
        </button>
        <a href={directions} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Maps" title="Open in Google Maps"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/60 bg-white/90 text-ink-800 shadow-sm backdrop-blur transition-colors hover:text-forest-700">
          {live ? <NavigationArrow size={20} weight="duotone" /> : <ArrowsOut size={20} weight="duotone" />}
        </a>
      </div>
    </div>
    {/* Phones: the status sits under the map so it never covers the pins */}
    <div className="mt-2 sm:hidden [&>div]:shadow-none [&>div]:border-ink-900/[0.08]">{statusCard}</div>
    </div>
  )
}
