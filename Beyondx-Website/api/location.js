// api/location.js
//
// Live location for a task that is currently being worked on.
//
// POST /api/location   { taskId, workerId, workerName, lat, lng, accuracy }
//   Worker's device shares its position. Only while they have the job open and
//   have switched sharing on.
//
// GET  /api/location?taskId=<id>
//   Employer reads the latest position for that task.
//
// DELETE /api/location?taskId=<id>
//   Worker stops sharing — the row is removed, not kept.
//
// ESM: this project sets "type": "module", so /api files use `export default`.
//
// Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// Expected table:
//   create table task_locations (
//     task_id text primary key,
//     worker_id text,
//     worker_name text,
//     lat double precision not null,
//     lng double precision not null,
//     accuracy double precision,
//     updated_at timestamptz not null default now()
//   );

const TABLE = 'task_locations'

// A position older than this is stale — the worker has stopped sharing,
// lost signal, or closed the app.
const STALE_AFTER_MS = 5 * 60 * 1000

function config() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return { url, key, ready: Boolean(url && key) }
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  const { url, key, ready } = config()

  if (!ready) {
    return res.status(200).json({
      configured: false,
      location: null,
      error: 'Live tracking is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel.',
    })
  }

  /* --------------------------- worker shares --------------------------- */
  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const taskId = String(body?.taskId || '').trim()
    const lat = num(body?.lat)
    const lng = num(body?.lng)

    if (!taskId) return res.status(400).json({ error: 'A taskId is required.' })
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'A valid position is required.' })
    }

    try {
      const r = await fetch(`${url}/rest/v1/${TABLE}?on_conflict=task_id`, {
        method: 'POST',
        headers: headers(key, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({
          task_id: taskId,
          worker_id: body?.workerId ? String(body.workerId) : null,
          worker_name: body?.workerName ? String(body.workerName) : null,
          lat, lng,
          accuracy: num(body?.accuracy),
          updated_at: new Date().toISOString(),
        }),
      })
      if (!r.ok) {
        const detail = await r.text()
        console.error('[location] write failed', r.status, detail.slice(0, 300))
        const missingTable = /does not exist/i.test(detail) || r.status === 404
        return res.status(502).json({
          error: missingTable
            ? `The "${TABLE}" table does not exist in Supabase yet.`
            : `Could not save the position (${r.status}).`,
          missingTable: missingTable || undefined,
        })
      }
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[location] write error:', err.message)
      return res.status(500).json({ error: 'Could not save the position.' })
    }
  }

  /* -------------------------- worker stops ----------------------------- */
  if (req.method === 'DELETE') {
    const taskId = String(req.query.taskId || '')
    if (!taskId) return res.status(400).json({ error: 'A taskId is required.' })
    try {
      await fetch(`${url}/rest/v1/${TABLE}?task_id=eq.${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers: headers(key),
      })
      return res.status(200).json({ ok: true })
    } catch {
      return res.status(500).json({ error: 'Could not stop sharing.' })
    }
  }

  /* -------------------------- employer reads --------------------------- */
  if (req.method === 'GET') {
    const taskId = String(req.query.taskId || '')
    if (!taskId) return res.status(400).json({ error: 'A taskId is required.' })
    try {
      const r = await fetch(
        `${url}/rest/v1/${TABLE}?task_id=eq.${encodeURIComponent(taskId)}&select=lat,lng,accuracy,worker_name,updated_at`,
        { headers: headers(key) },
      )
      const text = await r.text()
      if (!r.ok) {
        const missingTable = /does not exist/i.test(text) || r.status === 404
        return res.status(200).json({
          configured: true, location: null,
          missingTable: missingTable || undefined,
          error: missingTable ? `The "${TABLE}" table does not exist in Supabase yet.` : undefined,
        })
      }
      const rows = JSON.parse(text || '[]')
      const row = rows[0] || null
      if (!row) return res.status(200).json({ configured: true, location: null })

      const age = Date.now() - new Date(row.updated_at).getTime()
      return res.status(200).json({
        configured: true,
        location: { ...row, ageMs: age, stale: age > STALE_AFTER_MS },
      })
    } catch (err) {
      console.error('[location] read error:', err.message)
      return res.status(200).json({ configured: true, location: null })
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
