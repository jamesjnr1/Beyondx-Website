// api/verify-phone-otp.js
//
// Checks a typed code against the one sent by /api/send-phone-otp. On
// success the stored code is deleted so it can't be reused.
//
// POST /api/verify-phone-otp   { phone, code }   -> { ok: true }
//
// Required environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY

const TABLE = 'phone_otps'

function normalisePhone(raw) {
  let p = String(raw || '').replace(/[\s-]/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = '233' + p.slice(1)
  return p
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    return res.status(500).json({ error: 'Phone verification is not configured yet.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const phone = normalisePhone(body?.phone)
  const code = String(body?.code || '').trim()
  if (!phone || !code) {
    return res.status(400).json({ error: 'A phone number and code are required.' })
  }

  try {
    const r = await fetch(
      `${url}/rest/v1/${TABLE}?phone=eq.${encodeURIComponent(phone)}&select=code,expires_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
    const rows = await r.json().catch(() => [])
    const row = Array.isArray(rows) ? rows[0] : null

    if (!row) {
      return res.status(400).json({ error: 'Request a new code — none is on file for this number.' })
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'That code has expired. Request a new one.' })
    }
    if (row.code !== code) {
      return res.status(400).json({ error: 'That code is incorrect.' })
    }

    // One-time use — delete it now that it's served its purpose.
    await fetch(`${url}/rest/v1/${TABLE}?phone=eq.${encodeURIComponent(phone)}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => null)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[verify-phone-otp] error:', err.message)
    return res.status(500).json({ error: 'Could not verify that code right now.' })
  }
}
