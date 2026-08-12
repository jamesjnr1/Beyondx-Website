// api/contact.js
//
// Receives contact enquiries and post-registration onboarding answers, then
// emails them to BeyondX via Resend.
//
// ESM: this project sets "type": "module" in package.json, so /api files must
// use `export default`, not module.exports.
//
// Required environment variable:
//   RESEND_API_KEY   from resend.com → API Keys
//
// Optional:
//   CONTACT_TO       destination inbox (defaults to beyondx26@gmail.com)
//   CONTACT_FROM     verified sender. Until you verify a domain in Resend, the
//                    shared sender below works for testing.

// Optional:
//   CONTACT_TO        who receives these emails. Comma-separated for several.
//                     Defaults to the address below.
//   CONTACT_REPLY_TO  where replies go. Comma-separated for several.
//   CONTACT_FROM      verified sender, e.g. "BeyondX <noreply@beyondxco.com>".

// Optional archive of inbound messages, read by the admin console.
async function storeMessage(row) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return
  const r = await fetch(`${url}/rest/v1/support_messages`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      category: row.category,
      name: row.name || null,
      email: row.email || null,
      phone: row.phone || null,
      message: row.message,
    }),
  })
  if (!r.ok) console.error('[contact] archive failed', r.status, (await r.text()).slice(0, 200))
}

const SITE = process.env.SITE_URL || 'https://www.beyondxco.com'
const SUPPORT_ICON = `${SITE}/icons/support-email.png`

const DEFAULT_TO = 'beyondx26@gmail.com'
const DEFAULT_FROM = 'BeyondX <onboarding@resend.dev>'

// Accepts commas, semicolons, spaces or newlines between addresses, and
// ignores anything that is not a plausible email so one typo cannot break the
// whole send.
function addresses(value) {
  return String(value || '')
    .split(/[,;\s]+/)
    .map((a) => a.trim().replace(/^[<"']+|[>"']+$/g, ''))
    .filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a))
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not set')
    return res.status(500).json({ error: 'Email is not configured on the server (RESEND_API_KEY missing).' })
  }

  // Vercel usually parses JSON bodies; fall back for safety.
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const { name, email, phone, message, category } = body || {}

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'A message is required.' })
  }

  const label = category === 'worker_onboarding'
    ? '👋 New Worker Onboarding — BeyondX'
    : category === 'employer_onboarding'
      ? '👋 New Employer Onboarding — BeyondX'
      : category === 'worker_registered'
        ? '🆕 New Worker Registered — BeyondX'
        : category === 'employer_registered'
          ? '🆕 New Employer Registered — BeyondX'
      : category === 'payment_due'
        ? '💸 Payment Due — BeyondX'
        : category === 'worker_report' || category === 'employer_report'
          ? '🚩 Report — BeyondX'
          : category === 'worker_support' || category === 'employer_support'
            ? '🛟 Support Request — BeyondX'
            : 'New contact request — BeyondX'

  const subject = label

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
  ].filter(([, v]) => v)

  const fieldHtml = rows.map(([k, v]) => {
    const value = k === 'Email'
      ? `<a href="mailto:${escapeHtml(v)}" style="color:#1a73e8;">${escapeHtml(v)}</a>`
      : k === 'Phone'
        ? `<a href="tel:${escapeHtml(v)}" style="color:#1a73e8;">${escapeHtml(v)}</a>`
        : escapeHtml(v)
    return `<p style="margin:0 0 14px;"><strong>${escapeHtml(k)}:</strong> ${value}</p>`
  }).join('')

  // Workers register with a phone number, not an email — say so plainly rather
  // than leaving the reader wondering how to reach them.
  const noEmailNote = !email && phone
    ? 'No email on file — use the phone number above to follow up.'
    : ''

  // Support and report emails lead with the support icon. Remote images are
  // often blocked, so the heading still carries the meaning on its own.
  const isSupport = ['worker_support', 'employer_support', 'worker_report', 'employer_report'].includes(category)
  const iconHtml = isSupport
    ? `<img src="${SUPPORT_ICON}" width="34" height="34" alt="" style="vertical-align:middle;margin-right:10px;border:0;outline:none;">`
    : ''

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#12180E;line-height:1.6;font-size:15px;">
      <h2 style="margin:0 0 20px;color:#6BAB21;font-size:22px;line-height:1.3;">${iconHtml}${escapeHtml(label)}</h2>
      ${fieldHtml}
      <p style="margin:0 0 6px;"><strong>Message:</strong></p>
      <div style="white-space:pre-wrap;">${escapeHtml(message)}</div>
      ${noEmailNote ? `<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">${escapeHtml(noEmailNote)}</p>` : ''}
    </div>`

  const text = [
    label,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    message,
    ...(noEmailNote ? ['', noEmailNote] : []),
  ].join('\n')

  try {
    // Replying should reach the person who signed up when we have their email,
    // then the BeyondX addresses so the team is looped in.
    const replyTo = [
      ...(email ? [String(email).trim()] : []),
      ...addresses(process.env.CONTACT_REPLY_TO),
    ].filter((a, i, all) => all.indexOf(a) === i)

    const to = addresses(process.env.CONTACT_TO).length
      ? addresses(process.env.CONTACT_TO)
      : [DEFAULT_TO]
    const from = process.env.CONTACT_FROM || DEFAULT_FROM

    // Visible in the Vercel function log — the quickest way to confirm which
    // addresses the server actually resolved.
    console.log(`[contact] sending to ${to.length}: ${to.join(', ')} | from: ${from}`)

    if (to.length > 1 && from.includes('resend.dev')) {
      console.warn('[contact] Multiple recipients with the shared resend.dev sender — Resend only delivers to your own account email until CONTACT_FROM uses a verified domain.')
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(replyTo.length ? { reply_to: replyTo } : {}),
      }),
    })

    const detail = await r.text()
    if (!r.ok) {
      console.error('[contact] Resend responded', r.status, detail.slice(0, 300))
      // Surface the provider's own reason — without it, a 403 is undiagnosable.
      let reason = ''
      try {
        const parsed = JSON.parse(detail)
        reason = parsed?.message || parsed?.error?.message || ''
      } catch {
        reason = detail.slice(0, 200)
      }
      return res.status(502).json({
        error: `Email provider rejected the message (${r.status}).`,
        reason: reason || undefined,
        hint:
          r.status === 403
            ? 'Resend only delivers to your own account email until you verify a sending domain. Verify a domain and set CONTACT_FROM to an address on it, or send to the address your Resend account is registered with.'
            : undefined,
      })
    }

    // Best effort: also file it so the admin console has a record. A storage
    // failure must never stop the email from being reported as sent.
    await storeMessage({ category: category || 'contact', name, email, phone, message }).catch(() => null)

    return res.status(200).json({
      ok: true,
      recipients: to.length,
      usingSharedSender: from.includes('resend.dev') || undefined,
    })
  } catch (err) {
    console.error('[contact] send failed:', err.message)
    return res.status(500).json({ error: 'Could not send the message. Please try again.' })
  }
}
