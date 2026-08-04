// api/admin-verify-payment.js
//
// Admin endpoint: verify or reject a payment_pending task.
// Approve → status becomes 'offered' (worker is notified)
// Reject  → status becomes 'payment_rejected'
//
// POST /admin/tasks/:id/verify-payment
//   Header: x-admin-password
//   Body:   { action: 'approve' | 'reject', reason?: string }

const RAILWAY = process.env.RAILWAY_API
  || process.env.API_URL
  || 'https://beyondx-backend-production-1a08.up.railway.app'
const RAILWAY_KEY = process.env.RAILWAY_ADMIN_KEY || ''
const ADMIN_PASS  = process.env.ADMIN_PASSWORD    || ''

// Try multiple Railway route patterns since the backend may expose
// the task-status update under different paths.
async function patchTaskStatus(taskId, status, adminNote) {
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': ADMIN_PASS,
    ...(RAILWAY_KEY ? { 'x-admin-key': RAILWAY_KEY } : {}),
  }
  const body = JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) })

  const routes = [
    `${RAILWAY}/admin/tasks/${taskId}/status`,   // admin route (preferred)
    `${RAILWAY}/api/tasks/${taskId}/status`,      // api route fallback
    `${RAILWAY}/admin/tasks/${taskId}`,           // generic PATCH
  ]

  for (const url of routes) {
    try {
      const r = await fetch(url, { method: 'PATCH', headers, body })
      if (r.ok) return { ok: true, url }
      if (r.status === 404) continue   // route doesn't exist, try next
      // Non-404 error means the route exists but something else failed
      const text = await r.text().catch(() => '')
      return { ok: false, status: r.status, detail: text.slice(0, 300) }
    } catch (err) {
      console.warn('[verify-payment] fetch error for', url, err.message)
    }
  }
  return { ok: false, status: 502, detail: 'No Railway route responded for task status update.' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supplied = req.headers['x-admin-password'] || ''
  if (!ADMIN_PASS || supplied !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const url = req.url || ''
  const match = url.match(/\/admin\/tasks\/([^/]+)\/verify-payment/)
  const taskId = match?.[1]
  if (!taskId) return res.status(400).json({ error: 'Task ID missing from URL.' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, reason } = body || {}
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'action must be "approve" or "reject".' })
  }

  const newStatus = action === 'approve' ? 'offered' : 'payment_rejected'
  const result = await patchTaskStatus(taskId, newStatus, reason)

  if (!result.ok) {
    console.error('[verify-payment] all routes failed:', result)
    return res.status(result.status || 502).json({
      error: `Could not update task status on Railway. ${result.detail || ''}`.trim(),
      hint: 'The Railway backend may need a PATCH /admin/tasks/:id/status endpoint.',
    })
  }

  return res.status(200).json({
    ok: true,
    taskId,
    status: newStatus,
    message: action === 'approve'
      ? 'Payment verified. The worker has been offered the task.'
      : 'Payment rejected. Contact the employer to arrange a refund or replacement.',
  })
}
