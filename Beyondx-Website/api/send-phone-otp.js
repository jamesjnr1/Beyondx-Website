// api/send-phone-otp.js
//
// Sends a one-time verification code by SMS via Arkesel, and stores it in
// Supabase so /api/verify-phone-otp can check what was typed back against
// it. This proves a worker actually controls the phone number they're
// registering with, before the Railway account is created.
//
// POST /api/send-phone-otp   { phone }   -> { ok: true }
//
// Required environment variables:
//   ARKESEL_API_KEY
//   ARKESEL_SENDER        (optional — defaults to "BeyondX"; must be a sender
//                          ID already registered on the Arkesel account, or
//                          messages may be rejected)
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// Expected table:
//   create table phone_otps (
//     phone text primary key,
//     code text not null,
//     expires_at timestamptz not null,
//     created_at timestamptz not null default now()
//   );

const TABLE = 'phone_otps'
const CODE_TTL_MS = 10 * 60 * 1000       // 10 minutes to enter the code
const RESEND_COOLDOWN_MS = 45 * 1000     // don't let a retry-tap burn a second SMS instantly

function normalisePhone(raw) {
  // Ghanaian numbers arrive as "024...", "233024...", or "+233024..." — Arkesel
  // wants the international form with no leading zero and no plus sign.
  let p = String(raw || '').replace(/[\s-]/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = '233' + p.slice(1)
  return p
}

function supa() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return { url, key, ready: Boolean(url && key) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const arkeselKey = process.env.ARKESEL_API_KEY
  const { url, key, ready } = supa()
  if (!arkeselKey || !ready) {
    return res.status(500).json({ error: 'Phone verification is not configured yet.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const rawPhone = body?.phone
  if (!rawPhone || !/^\+?\d{9,15}$/.test(String(rawPhone).replace(/[\s-]/g, ''))) {
    return res.status(400).json({ error: 'A valid phone number is required.' })
  }
  const phone = normalisePhone(rawPhone)

  try {
    // Refuse a resend within the cooldown window rather than silently sending
    // another SMS every time someone taps the button.
    const existing = await fetch(
      `${url}/rest/v1/${TABLE}?phone=eq.${encodeURIComponent(phone)}&select=created_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    ).then((r) => r.json()).catch(() => [])
    const last = Array.isArray(existing) && existing[0] ? new Date(existing[0].created_at).getTime() : 0
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait a moment before requesting another code.' })
    }

    const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 digits
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()

    const upsert = await fetch(`${url}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ phone, code, expires_at: expiresAt, created_at: new Date().toISOString() }),
    })
    if (!upsert.ok) {
      const detail = await upsert.text()
      console.error('[send-phone-otp] store failed', upsert.status, detail.slice(0, 300))
      const missingTable = upsert.status === 404 || detail.includes('does not exist')
      return res.status(502).json({
        error: missingTable ? `The "${TABLE}" table does not exist in Supabase yet.` : 'Could not send a code right now.',
      })
    }

    const sms = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': arkeselKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: process.env.ARKESEL_SENDER || 'BeyondX',
        message: `Your BeyondX verification code is ${code}. It expires in 10 minutes.`,
        recipients: [phone],
      }),
    })
    const smsData = await sms.json().catch(() => ({}))
    if (!sms.ok || smsData.status === 'error') {
      console.error('[send-phone-otp] Arkesel rejected the send', sms.status, JSON.stringify(smsData).slice(0, 300))
      return res.status(502).json({ error: smsData.message || 'Could not send the SMS. Please try again.' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-phone-otp] error:', err.message)
    return res.status(500).json({ error: 'Could not send a code right now.' })
  }
}
