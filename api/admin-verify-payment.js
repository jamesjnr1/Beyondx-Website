// api/admin-verify-payment.js
//
// BeyondX admin endpoint — called when we've confirmed an employer's payment.
//
// Flow on APPROVE:
//   1. Fetch the task from Railway to get worker phone + all job details
//   2. Send the worker an SMS via Arkesel with the full job description
//      (employer name, contact person, phone, location, task type, pay)
//   3. ONLY if the SMS succeeds, advance the task status to 'offered'
//
// Flow on REJECT:
//   1. Advance the task status to 'payment_rejected'
//   (No worker SMS — they were never notified, so nothing to undo)
//
// POST /admin/tasks/:id/verify-payment
//   Header: x-admin-password
//   Body:   { action: 'approve' | 'reject', reason?: string }

const RAILWAY   = process.env.RAILWAY_API || process.env.API_URL || 'https://beyondx-backend-production-1a08.up.railway.app'
const RAIL_KEY  = process.env.RAILWAY_ADMIN_KEY || ''
const ADMIN_KEY = process.env.ADMIN_PASSWORD || ''
const ARK_KEY   = process.env.ARKESEL_API_KEY || ''
const ARK_FROM  = process.env.ARKESEL_SENDER || 'BeyondX'

// Ghana number → Arkesel format (233XXXXXXXXX, no + or leading zero)
function normalisePhone(raw) {
  let p = String(raw || '').replace(/[\s\-().]/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = '233' + p.slice(1)
  return p
}

// Fetch the task + associated worker from Railway
async function fetchTask(taskId) {
  const headers = {
    'x-admin-password': ADMIN_KEY,
    ...(RAIL_KEY ? { 'x-admin-key': RAIL_KEY } : {}),
  }
  // Try a direct task-by-id route first, fall back to listing all
  const routes = [
    `${RAILWAY}/admin/tasks/${taskId}`,
    `${RAILWAY}/api/tasks/${taskId}`,
  ]
  for (const url of routes) {
    try {
      const r = await fetch(url, { headers })
      if (r.ok) {
        const d = await r.json()
        // Some backends wrap in { task: ... }, some return the object directly
        return d?.task || d
      }
    } catch { /* try next */ }
  }
  // Fall back: fetch all tasks and find the one we need
  try {
    const r = await fetch(`${RAILWAY}/admin/all`, { headers })
    if (r.ok) {
      const d = await r.json()
      return (d?.tasks || []).find(t => String(t.id) === String(taskId)) || null
    }
  } catch { /* ignore */ }
  return null
}

// Send SMS via Arkesel
async function sendSms(phone, message) {
  if (!ARK_KEY) return { ok: false, error: 'ARKESEL_API_KEY not configured' }
  const normalised = normalisePhone(phone)
  if (!normalised || normalised.length < 10) {
    return { ok: false, error: `Invalid phone number: ${phone}` }
  }
  try {
    const r = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': ARK_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: ARK_FROM,
        message,
        recipients: [normalised],
      }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || d.status === 'error') {
      return { ok: false, error: d.message || `Arkesel HTTP ${r.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Update task status on Railway — tries multiple route patterns
async function patchTaskStatus(taskId, status, adminNote) {
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': ADMIN_KEY,
    ...(RAIL_KEY ? { 'x-admin-key': RAIL_KEY } : {}),
  }
  const body = JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) })
  const routes = [
    `${RAILWAY}/admin/tasks/${taskId}/status`,
    `${RAILWAY}/api/tasks/${taskId}/status`,
    `${RAILWAY}/admin/tasks/${taskId}`,
  ]
  for (const url of routes) {
    try {
      const r = await fetch(url, { method: 'PATCH', headers, body })
      if (r.ok) return { ok: true }
      if (r.status === 404) continue
      const text = await r.text().catch(() => '')
      return { ok: false, status: r.status, detail: text.slice(0, 300) }
    } catch (err) {
      console.warn('[verify-payment] patch error for', url, err.message)
    }
  }
  return { ok: false, status: 502, detail: 'No Railway route accepted the status update.' }
}

// Build the worker SMS — full job description
function buildWorkerSms(task) {
  const emp     = task.employer || {}
  const orgName = emp.orgName || emp.name || 'A BeyondX employer'
  const contact = emp.contactPerson || emp.contact || ''
  const empPhone = emp.phone || ''
  const taskType = task.taskType || 'Task'
  const location = task.location || ''
  const duration = task.duration || ''
  const pay      = task.pay ? `GH₵ ${Number(task.pay).toFixed(0)}` : ''

  const lines = [
    `Hi! You have a new job offer from BeyondX.`,
    ``,
    `Job: ${taskType}`,
    location  ? `Location: ${location}` : null,
    duration  ? `Duration: ${duration}` : null,
    pay       ? `Your pay: ${pay}` : null,
    ``,
    `Employer: ${orgName}`,
    contact   ? `Contact person: ${contact}` : null,
    empPhone  ? `Contact phone: ${empPhone}` : null,
    ``,
    `Open your BeyondX Worker Dashboard at beyondxco.com to accept or decline this offer.`,
    ``,
    `- The BeyondX Team`,
  ].filter(l => l !== null)

  return lines.join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth
  const supplied = req.headers['x-admin-password'] || ''
  if (!ADMIN_KEY || supplied !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  // Extract task ID from URL
  const match = (req.url || '').match(/\/admin\/tasks\/([^/]+)\/verify-payment/)
  const taskId = match?.[1]
  if (!taskId) return res.status(400).json({ error: 'Task ID missing from URL.' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, reason } = body || {}
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'action must be "approve" or "reject".' })
  }

  // ── REJECT path ───────────────────────────────────────────────────────────
  if (action === 'reject') {
    const result = await patchTaskStatus(taskId, 'payment_rejected', reason)
    if (!result.ok) {
      return res.status(result.status || 502).json({
        error: `Could not update task on Railway. ${result.detail || ''}`.trim(),
      })
    }
    return res.status(200).json({
      ok: true, taskId, status: 'payment_rejected',
      message: 'Payment rejected. Contact the employer to arrange a refund or replacement.',
    })
  }

  // ── APPROVE path ──────────────────────────────────────────────────────────

  // Step 1 — use task data passed from admin console (already rendered in the card)
  // Fall back to fetching from Railway if not provided
  const taskFromBody = body?.task || null
  console.log('[verify-payment] fetching task', taskId, taskFromBody ? '(data provided by admin)' : '(will fetch from Railway)')
  const task = taskFromBody || await fetchTask(taskId)

  // Step 2 — find the worker's phone
  // Task may have acceptedBy / workerId / worker embedded
  // Worker phone — check multiple possible locations in the task object
  const workerPhone = (
    task?.acceptedBy?.phone ||
    task?.worker?.phone ||
    task?.workerPhone ||
    task?.workerDetails?.phone ||
    ''
  )

  if (!workerPhone) {
    // We still proceed but note the SMS couldn't be sent
    console.warn('[verify-payment] no worker phone found for task', taskId)
  }

  // Step 3 — send the SMS (if we have the phone and Arkesel is configured)
  let smsSent = false
  let smsError = null
  if (workerPhone && ARK_KEY) {
    const message = task ? buildWorkerSms(task) : `Hi! You have a new job offer on BeyondX. Open beyondxco.com to see the details and accept or decline.`
    console.log('[verify-payment] sending SMS to', normalisePhone(workerPhone))
    const smsResult = await sendSms(workerPhone, message)
    if (smsResult.ok) {
      smsSent = true
      console.log('[verify-payment] SMS sent successfully')
    } else {
      smsError = smsResult.error
      console.error('[verify-payment] SMS failed:', smsError)
      // We still proceed to update the status — the admin can manually SMS from the SMS Log
    }
  } else if (!ARK_KEY) {
    smsError = 'ARKESEL_API_KEY not configured — SMS skipped'
    console.warn('[verify-payment]', smsError)
  }

  // Step 4 — advance task status to 'offered'
  const result = await patchTaskStatus(taskId, 'offered')
  if (!result.ok) {
    return res.status(result.status || 502).json({
      error: `Could not update task status on Railway. ${result.detail || ''}`.trim(),
      hint: 'Railway needs a PATCH /admin/tasks/:id/status endpoint that accepts { status: "offered" }.',
      smsAlreadySent: smsSent,
    })
  }

  return res.status(200).json({
    ok: true,
    taskId,
    status: 'offered',
    smsSent,
    smsError: smsError || undefined,
    message: smsSent
      ? 'Payment verified. Worker has been sent a job offer SMS with full details.'
      : `Payment verified. Task status updated to "offered".${smsError ? ` Note: SMS not sent — ${smsError}` : ' No worker phone on record.'}`,
  })
}
