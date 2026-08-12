// api/messages.js
//
// The admin console's inbox: support requests, reports, and other inbound
// messages archived by api/contact.js.
//
// GET    /api/messages?status=open        → { messages: [...] }   (admin only)
// PATCH  /api/messages?id=<id>            → mark handled/unhandled (admin only)
// DELETE /api/messages?id=<id>            → remove                 (admin only)
//
// Required environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_API_SECRET
//
// Expected table:
//   create table support_messages (
//     id uuid primary key default gen_random_uuid(),
//     category text not null,
//     name text,
//     email text,
//     phone text,
//     message text not null,
//     handled boolean not null default false,
//     created_at timestamptz not null default now()
//   );

const TABLE = 'support_messages'

function config() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return { url, key, ready: Boolean(url && key) }
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const secret = process.env.ADMIN_API_SECRET
  if (!secret || req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { url, key, ready } = config()
  if (!ready) {
    return res.status(200).json({
      messages: [],
      configured: false,
      error: 'Message storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel.',
    })
  }

  if (req.method === 'GET') {
    const status = String(req.query.status || 'all')
    const filter = status === 'open' ? '&handled=is.false' : status === 'handled' ? '&handled=is.true' : ''
    try {
      const r = await fetch(
        `${url}/rest/v1/${TABLE}?select=id,category,name,email,phone,message,handled,created_at&order=created_at.desc&limit=100${filter}`,
        { headers: headers(key) },
      )
      const text = await r.text()
      if (!r.ok) {
        console.error('[messages] read failed', r.status, text.slice(0, 300))
        // A 404 from PostgREST means the table itself is missing — say so,
        // rather than leaving a bare status code.
        const missingTable = r.status === 404 || text.includes('does not exist')
        return res.status(200).json({
          messages: [],
          configured: true,
          missingTable: missingTable || undefined,
          error: missingTable
            ? `The "${TABLE}" table does not exist in Supabase yet.`
            : `Could not read (${r.status}).`,
          reason: (() => { try { return JSON.parse(text).message } catch { return text.slice(0, 200) } })(),
        })
      }
      return res.status(200).json({ messages: JSON.parse(text || '[]'), configured: true })
    } catch (err) {
      console.error('[messages] read error:', err.message)
      return res.status(200).json({ messages: [], configured: true, error: 'Could not read messages.' })
    }
  }

  const id = String(req.query.id || '')
  if (!id) return res.status(400).json({ error: 'An id is required.' })

  if (req.method === 'PATCH') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const handled = Boolean(body?.handled)
    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers(key), Prefer: 'return=minimal' },
        body: JSON.stringify({ handled }),
      })
      if (!r.ok) return res.status(502).json({ error: `Could not update (${r.status}).` })
      return res.status(200).json({ ok: true, handled })
    } catch {
      return res.status(500).json({ error: 'Could not update the message.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers(key),
      })
      if (!r.ok) return res.status(502).json({ error: `Could not delete (${r.status}).` })
      return res.status(200).json({ ok: true })
    } catch {
      return res.status(500).json({ error: 'Could not delete the message.' })
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
