// api/admin-verify-payment.js
//
// POST /admin/tasks/:id/verify-payment
//   Header: x-admin-password
//   Body:   { action: 'approve' | 'reject', reason?: string, task?: object }
//
// APPROVE flow:
//   1. Use task data from body (already in admin UI) OR fetch from Railway
//   2. Send SMS to worker via Arkesel with full job details
//   3. Update task status to 'offered' — tries Railway first, then Supabase direct
//
// REJECT flow:
//   1. Update status to 'payment_rejected'

const RAILWAY    = process.env.RAILWAY_API || process.env.API_URL || 'https://beyondx-backend-production-1a08.up.railway.app'
const RAIL_KEY   = process.env.RAILWAY_ADMIN_KEY || ''
const ADMIN_PASS = process.env.ADMIN_PASSWORD || ''
const ARK_KEY    = process.env.ARKESEL_API_KEY || ''
const ARK_FROM   = process.env.ARKESEL_SENDER || 'BeyondX'
// Supabase direct access — fallback when Railway route not built yet
const SUPA_URL   = process.env.SUPABASE_URL || ''
const SUPA_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''

function normalisePhone(raw) {
  let p = String(raw || '').replace(/[\s\-().]/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = '233' + p.slice(1)
  return p
}

async function sendSms(phone, message) {
  if (!ARK_KEY) return { ok: false, error: 'ARKESEL_API_KEY not set' }
  const n = normalisePhone(phone)
  if (!n || n.length < 10) return { ok: false, error: `Bad phone: ${phone}` }
  try {
    const r = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': ARK_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: ARK_FROM, message, recipients: [n] }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || d.status === 'error') return { ok: false, error: d.message || `Arkesel ${r.status}` }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

function buildSms(task) {
  const emp = task.employer || {}
  const lines = [
    'Hi! You have a new job offer from BeyondX.',
    '',
    `Job: ${task.taskType || 'Task'}`,
    task.location  ? `Location: ${task.location}` : null,
    task.duration  ? `Duration: ${task.duration}` : null,
    task.pay       ? `Your pay: GH₵ ${Number(task.pay).toFixed(0)}` : null,
    '',
    `Employer: ${emp.orgName || emp.name || 'BeyondX employer'}`,
    emp.contactPerson ? `Contact: ${emp.contactPerson}` : null,
    emp.phone         ? `Phone: ${emp.phone}` : null,
    '',
    'Open your BeyondX Worker Dashboard at beyondxco.com to accept or decline.',
    '',
    '- The BeyondX Team',
  ].filter(l => l !== null)
  return lines.join('\n')
}

// Try Railway routes first, then fall back to direct Supabase REST API
async function updateTaskStatus(taskId, status, adminNote) {
  const railHeaders = {
    'Content-Type': 'application/json',
    'x-admin-password': ADMIN_PASS,
    ...(RAIL_KEY ? { 'x-admin-key': RAIL_KEY } : {}),
  }
  const body = JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) })

  // Try Railway routes
  for (const url of [
    `${RAILWAY}/admin/tasks/${taskId}/status`,
    `${RAILWAY}/api/tasks/${taskId}/status`,
    `${RAILWAY}/admin/tasks/${taskId}`,
  ]) {
    try {
      const r = await fetch(url, { method: 'PATCH', headers: railHeaders, body })
      if (r.ok) return { ok: true, via: url }
      if (r.status !== 404) {
        const t = await r.text().catch(() => '')
        return { ok: false, status: r.status, detail: t.slice(0, 200) }
      }
    } catch { /* next */ }
  }

  // Fallback: Supabase REST API direct table update
  if (SUPA_URL && SUPA_KEY) {
    try {
      const r = await fetch(
        `${SUPA_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPA_KEY,
            'Authorization': `Bearer ${SUPA_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status, ...(adminNote ? { admin_note: adminNote } : {}) }),
        }
      )
      if (r.ok || r.status === 204) return { ok: true, via: 'supabase' }
      const t = await r.text().catch(() => '')
      return { ok: false, status: r.status, detail: `Supabase: ${t.slice(0, 200)}` }
    } catch (e) {
      return { ok: false, status: 502, detail: `Supabase error: ${e.message}` }
    }
  }

  return {
    ok: false, status: 501,
    detail: 'No Railway status route exists yet, and SUPABASE_URL / SUPABASE_SERVICE_KEY are not set. Add one of them to Vercel env vars to enable verify payments.'
  }
}

async function fetchTask(taskId) {
  const headers = { 'x-admin-password': ADMIN_PASS, ...(RAIL_KEY ? { 'x-admin-key': RAIL_KEY } : {}) }
  for (const url of [`${RAILWAY}/admin/tasks/${taskId}`, `${RAILWAY}/api/tasks/${taskId}`]) {
    try {
      const r = await fetch(url, { headers })
      if (r.ok) { const d = await r.json(); return d?.task || d }
    } catch { /* next */ }
  }
  try {
    const r = await fetch(`${RAILWAY}/admin/all`, { headers })
    if (r.ok) { const d = await r.json(); return (d?.tasks || []).find(t => String(t.id) === String(taskId)) || null }
  } catch { /* ignore */ }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }

  const supplied = req.headers['x-admin-password'] || ''
  if (!ADMIN_PASS || supplied !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorised' })

  const match = (req.url || '').match(/\/admin\/tasks\/([^/]+)\/verify-payment/)
  const taskId = match?.[1]
  if (!taskId) return res.status(400).json({ error: 'Task ID missing from URL.' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, reason } = body || {}
  if (action !== 'approve' && action !== 'reject') return res.status(400).json({ error: 'action must be "approve" or "reject".' })

  // REJECT
  if (action === 'reject') {
    const result = await updateTaskStatus(taskId, 'payment_rejected', reason)
    if (!result.ok) return res.status(result.status || 502).json({ error: result.detail })
    return res.status(200).json({ ok: true, taskId, status: 'payment_rejected', via: result.via })
  }

  // APPROVE
  const task = body?.task || await fetchTask(taskId)
  const workerPhone = task?.acceptedBy?.phone || task?.worker?.phone || task?.workerPhone || task?.workerDetails?.phone || ''

  let smsSent = false, smsError = null
  if (workerPhone && ARK_KEY) {
    const msg = task ? buildSms(task) : `Hi! You have a new job offer on BeyondX. Open beyondxco.com to accept or decline.`
    const smsResult = await sendSms(workerPhone, msg)
    smsSent = smsResult.ok
    if (!smsResult.ok) smsError = smsResult.error
  } else if (!ARK_KEY) {
    smsError = 'ARKESEL_API_KEY not configured'
  } else {
    smsError = 'No worker phone on record'
  }

  const result = await updateTaskStatus(taskId, 'offered')
  if (!result.ok) {
    return res.status(result.status || 502).json({
      error: result.detail,
      smsSent,
      hint: result.detail,
    })
  }

  return res.status(200).json({
    ok: true, taskId, status: 'offered',
    smsSent, smsError: smsError || undefined, via: result.via,
    message: smsSent
      ? 'Payment verified. Worker SMS sent with full job details.'
      : `Payment verified. Status updated to "offered".${smsError ? ` SMS skipped: ${smsError}` : ''}`,
  })
}
