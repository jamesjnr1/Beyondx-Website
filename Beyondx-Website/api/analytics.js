// api/analytics.js
//
// Serverless proxy for the Vercel Web Analytics API.
// Your VERCEL_TOKEN never reaches the browser — this runs on Vercel's servers.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   VERCEL_TOKEN        Account token, created at vercel.com/account/tokens
//   VERCEL_PROJECT_ID   Project → Settings → General → Project ID
//   VERCEL_TEAM_ID      Only if the project sits under a team (optional for personal accounts)
//   ADMIN_API_SECRET    Set this to your existing admin password
//
// ESM: this project sets "type": "module" in package.json, so .js files
// under /api must use `export default`, not module.exports.
// Usage from the admin page:
//   fetch('/api/analytics?days=14', { headers: { 'x-admin-secret': adminPassword } })

const API = 'https://api.vercel.com/v1/query/web-analytics'

function daysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function query(path, params) {
  const url = new URL(`${API}/${path}`)
  url.searchParams.set('projectId', process.env.VERCEL_PROJECT_ID)
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Vercel API ${res.status} on ${path}: ${detail.slice(0, 300)}`)
  }
  return res.json()
}

// Any query that fails returns null rather than breaking the whole dashboard.
const problems = []
let eventsUnavailable = null
let dimensionHint = null

// Dimensions that may not exist on every plan or API version. If one is
// rejected we hide that panel rather than reporting a fault.
const OPTIONAL = new Set(['browsers'])

async function safe(label, fn) {
  try {
    return await fn()
  } catch (err) {
    // Custom events need a Vercel Pro plan. On Hobby this always 402s,
    // so report it as a plan limitation rather than an error.
    if (label === 'events' && /\b402\b|payment_required/.test(err.message)) {
      eventsUnavailable = 'Custom events (clicks) require a Vercel Pro plan.'
      return null
    }
    console.error(`[analytics] ${label} failed:`, err.message)
    if (OPTIONAL.has(label)) {
      // Capture the API's list of valid dimensions so it is visible in the log.
      const allowed = err.message.match(/allowed values ([^}]+)/)
      if (allowed && !dimensionHint) dimensionHint = allowed[1].slice(0, 300)
      return null
    }
    problems.push(`${label}: ${err.message.slice(0, 160)}`)
    return null
  }
}

export default async function handler(req, res) {
  problems.length = 0
  eventsUnavailable = null
  dimensionHint = null

  // --- gate: keep this endpoint from being world-readable ---
  const secret = process.env.ADMIN_API_SECRET
  if (secret && req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const missing = ['VERCEL_TOKEN', 'VERCEL_PROJECT_ID'].filter((k) => !process.env[k])
  if (missing.length) {
    return res.status(500).json({ error: `Missing environment variables: ${missing.join(', ')}` })
  }

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90)
  const since = daysAgo(days)
  const until = daysAgo(0)
  const range = { since, until }

  // Previous period of the same length, for "vs last period" comparisons
  const prevRange = { since: daysAgo(days * 2), until: since }

  const [totals, prevTotals, overTime, topPages, referrers, devices, countries, browsers, events] =
    await Promise.all([
      safe('totals', () => query('visits/count', range)),
      safe('prevTotals', () => query('visits/count', prevRange)),
      safe('overTime', () => query('visits/aggregate', { ...range, by: 'day' })),
      safe('topPages', () => query('visits/aggregate', { ...range, by: 'requestPath', limit: 8 })),
      safe('referrers', () => query('visits/aggregate', { ...range, by: 'referrerHostname', limit: 8 })),
      safe('devices', () => query('visits/aggregate', { ...range, by: 'deviceType', limit: 8 })),
      safe('countries', () => query('visits/aggregate', { ...range, by: 'country', limit: 8 })),
      safe('browsers', () => query('visits/aggregate', { ...range, by: 'browserName', limit: 8 })),
      safe('events', () => query('events/aggregate', { ...range, by: 'eventName', limit: 20 })),
    ])

  const pct = (now, before) => {
    if (!before || !now) return null
    return Math.round(((now - before) / before) * 100)
  }

  // visits/count returns { data: { pageviews, visitors } }
  const visitors = totals?.data?.visitors ?? null
  const pageViews = totals?.data?.pageviews ?? null
  const prevVisitors = prevTotals?.data?.visitors ?? null
  const prevPageViews = prevTotals?.data?.pageviews ?? null

  const eventRows = events?.data ?? []
  const totalClicks = eventRows.reduce((sum, r) => sum + (r.count || 0), 0)

  // Admin-only endpoint: never cache, so Refresh always returns current numbers.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  // Which project these numbers came from — the quickest way to spot a
  // VERCEL_PROJECT_ID still pointing at an old project.
  const pid = String(process.env.VERCEL_PROJECT_ID || '')
  const projectHint = pid ? `…${pid.slice(-8)}` : null

  return res.status(200).json({
    project: projectHint,
    range: { since, until, days },
    totals: {
      visitors,
      pageViews,
      clicks: totalClicks,
      visitorsChangePct: pct(visitors, prevVisitors),
      pageViewsChangePct: pct(pageViews, prevPageViews),
    },
    overTime: overTime?.data ?? [],
    topPages: topPages?.data ?? [],
    referrers: referrers?.data ?? [],
    devices: devices?.data ?? [],
    countries: countries?.data ?? [],
    browsers: browsers?.data ?? [],
    events: eventRows,
    eventsUnavailable,
    dimensionHint,
    problems,
    generatedAt: new Date().toISOString(),
  })
}
