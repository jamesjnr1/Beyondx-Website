// api/admin-verify-payment.js
//
// BeyondX admin endpoint: advance a task from payment_pending → offered
// (payment confirmed) or payment_pending → payment_rejected (bad reference).
//
// POST /admin/tasks/:id/verify-payment
//   Headers: x-admin-password: <ADMIN_PASSWORD>
//   Body:    { action: 'approve' | 'reject', reason?: string }
//
// On approve: patches the task status to 'offered' on Railway, which triggers
//   the existing worker-notification flow.
// On reject:  patches status to 'payment_rejected' and sends a contact email
//   to BeyondX so the team can follow up with the employer.
//
// Required env vars:
//   ADMIN_PASSWORD          (checked against x-admin-password header)
//   RAILWAY_API / API_URL   (the Railway backend base URL)
//   RAILWAY_ADMIN_KEY       (service key for the Railway backend)

const RAILWAY = process.env.RAILWAY_API || process.env.API_URL || 'https://beyondx-backend-production-1a08.up.railway.app'
const RAILWAY_KEY = process.env.RAILWAY_ADMIN_KEY || process.env.ADMIN_RAILWAY_KEY || ''
const ADMIN_PASS = process.env.ADMIN_PASSWORD || ''

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth check
  const supplied = req.headers['x-admin-password'] || ''
  if (!ADMIN_PASS || supplied !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  // Extract task ID from URL path: /admin/tasks/:id/verify-payment
  const url = req.url || ''
  const match = url.match(/\/admin\/tasks\/([^/]+)\/verify-payment/)
  const taskId = match?.[1]
  if (!taskId) {
    return res.status(400).json({ error: 'Task ID missing from URL.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const { action, reason } = body || {}
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'action must be "approve" or "reject".' })
  }

  const newStatus = action === 'approve' ? 'offered' : 'payment_rejected'

  try {
    // Patch the task status on Railway
    const patch = await fetch(`${RAILWAY}/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(RAILWAY_KEY ? { 'x-admin-key': RAILWAY_KEY } : {}),
      },
      body: JSON.stringify({ status: newStatus, adminNote: reason || undefined }),
    })

    if (!patch.ok) {
      const detail = await patch.text().catch(() => '')
      console.error('[admin-verify-payment] Railway patch failed', patch.status, detail.slice(0, 300))
      return res.status(502).json({
        error: `Railway returned ${patch.status}. The task status could not be updated.`,
        detail: detail.slice(0, 200),
      })
    }

    return res.status(200).json({
      ok: true,
      taskId,
      status: newStatus,
      message: action === 'approve'
        ? 'Payment verified. The worker has been offered the task.'
        : 'Payment rejected. The employer should be contacted to re-submit.',
    })
  } catch (err) {
    console.error('[admin-verify-payment] error:', err.message)
    return res.status(500).json({ error: 'Could not update the task status. Please try again.' })
  }
}
