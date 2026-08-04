// api/journey.js
//
// GET /api/journey?taskId=<id>   — returns all recorded location points for a task
//
// Used by the admin console to show the full route a worker travelled.
// Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars.
//
// Supabase table (run once in SQL editor):
//   create table task_location_history (
//     id          bigserial primary key,
//     task_id     text not null,
//     worker_id   text,
//     worker_name text,
//     lat         double precision not null,
//     lng         double precision not null,
//     accuracy    double precision,
//     recorded_at timestamptz not null default now()
//   );
//   create index on task_location_history (task_id, recorded_at);

const ADMIN_PASS = process.env.ADMIN_PASSWORD || ''

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Admin-only
  const supplied = req.headers['x-admin-password'] || req.query.adminPass || ''
  if (ADMIN_PASS && supplied !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const taskId = String(req.query.taskId || '').trim()
  if (!taskId) return res.status(400).json({ error: 'taskId is required' })

  const supaUrl = process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_KEY
  if (!supaUrl || !supaKey) {
    return res.status(503).json({
      error: 'Journey tracking not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel env vars.',
      points: [],
    })
  }

  try {
    const url = `${supaUrl}/rest/v1/task_location_history?task_id=eq.${encodeURIComponent(taskId)}&order=recorded_at.asc&limit=1000`
    const r = await fetch(url, { headers: headers(supaKey) })
    if (!r.ok) {
      const detail = await r.text()
      return res.status(502).json({ error: `Supabase error ${r.status}`, detail: detail.slice(0, 200), points: [] })
    }
    const points = await r.json()
    return res.status(200).json({ taskId, points, count: points.length })
  } catch (err) {
    return res.status(500).json({ error: err.message, points: [] })
  }
}
