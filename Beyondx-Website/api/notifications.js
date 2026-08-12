// api/notifications.js
//
// Stores and serves in-app notifications shown in the dashboard bell.
//
// GET  /api/notifications?audience=worker   → { notifications: [...] }  (public)
// POST /api/notifications                    → create one               (admin only)
// DELETE /api/notifications?id=<id>          → remove one               (admin only)
//
// ESM: this project sets "type": "module", so /api files use `export default`.
//
// Required environment variables:
//   SUPABASE_URL              https://<project>.supabase.co
//   SUPABASE_SERVICE_KEY      service_role key (server-side only, never in the browser)
//   ADMIN_API_SECRET          your admin password, sent as x-admin-secret
//
// Expected table:
//   create table notifications (
//     id uuid primary key default gen_random_uuid(),
//     audience text not null check (audience in ('worker','employer','all')),
//     title text not null,
//     body text not null,
//     created_at timestamptz not null default now()
//   );

const TABLE = 'notifications'

function config() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return { url, key, ready: Boolean(url && key) }
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function isAdmin(req) {
  const secret = process.env.ADMIN_API_SECRET
  if (!secret) return false
  return req.headers['x-admin-secret'] === secret
}

export default async function handler(req, res) {
  const { url, key, ready } = config()
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  /* ------------------------------- read -------------------------------- */
  if (req.method === 'GET') {
    // Not configured yet: return an empty list so the dashboard still works.
    if (!ready) return res.status(200).json({ notifications: [], configured: false })

    const audience = String(req.query.audience || 'all')
    const filter = audience === 'all'
      ? ''
      : `&audience=in.(${encodeURIComponent(audience)},all)`

    try {
      const r = await fetch(
        `${url}/rest/v1/${TABLE}?select=id,audience,title,body,created_at&order=created_at.desc&limit=30${filter}`,
        { headers: headers(key) },
      )
      const text = await r.text()
      if (!r.ok) {
        console.error('[notifications] read failed', r.status, text.slice(0, 300))
        const missingTable = r.status === 404 || text.includes('does not exist')
        return res.status(200).json({
          notifications: [], configured: true, error: true,
          missingTable: missingTable || undefined,
        })
      }
      return res.status(200).json({ notifications: JSON.parse(text || '[]'), configured: true })
    } catch (err) {
      console.error('[notifications] read error:', err.message)
      return res.status(200).json({ notifications: [], configured: true, error: true })
    }
  }

  /* ------------------------------ write -------------------------------- */
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!ready) {
    return res.status(500).json({
      error: 'Notifications storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel.',
    })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const audience = String(body?.audience || '').trim()
    const title = String(body?.title || '').trim()
    const text = String(body?.body || '').trim()

    if (!['worker', 'employer', 'all'].includes(audience)) {
      return res.status(400).json({ error: 'audience must be worker, employer or all.' })
    }
    if (!title) return res.status(400).json({ error: 'A title is required.' })
    if (!text) return res.status(400).json({ error: 'A message is required.' })

    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: { ...headers(key), Prefer: 'return=representation' },
        body: JSON.stringify({ audience, title, body: text }),
      })
      const detail = await r.text()
      if (!r.ok) {
        console.error('[notifications] write failed', r.status, detail.slice(0, 300))
        return res.status(502).json({ error: `Could not save (${r.status}).`, reason: detail.slice(0, 200) })
      }
      return res.status(200).json({ ok: true, notification: JSON.parse(detail || '[]')[0] || null })
    } catch (err) {
      console.error('[notifications] write error:', err.message)
      return res.status(500).json({ error: 'Could not save the notification.' })
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '')
    if (!id) return res.status(400).json({ error: 'An id is required.' })
    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers(key),
      })
      if (!r.ok) return res.status(502).json({ error: `Could not delete (${r.status}).` })
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: 'Could not delete the notification.' })
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
