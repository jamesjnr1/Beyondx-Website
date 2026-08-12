// api/google-verify.js
//
// Confirms a "Sign in with Google" credential is genuine, and returns the
// verified name/email from it. This step needs no backend of ours — Google
// signs the token, and anyone can check that signature against Google's own
// public keys. What happens with the verified email afterwards (creating or
// matching an account) still goes through the existing Railway endpoints
// exactly as before; this only proves the email is real and owned by whoever
// is signing up.
//
// POST /api/google-verify   { credential: "<Google ID token>" }
//   -> { email, name, picture, emailVerified: true }
//
// Required environment variable:
//   GOOGLE_CLIENT_ID   the OAuth Client ID from Google Cloud Console
//                      (the same one used in the frontend button — this is
//                      not a secret, but pinning it here stops a token
//                      issued for a different app being accepted by mistake)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const credential = body?.credential
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'No Google credential was received.' })
  }

  try {
    // Google's tokeninfo endpoint checks the signature and expiry for us —
    // no crypto library needed on our side. It's rate-limited for high
    // volume, but registration traffic is nowhere near that.
    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    )
    const data = await r.json()

    if (!r.ok) {
      return res.status(401).json({ error: data.error_description || 'That Google sign-in could not be verified.' })
    }
    if (data.aud !== clientId) {
      // A token issued for a different app — reject rather than trust it.
      console.error('[google-verify] audience mismatch:', data.aud)
      return res.status(401).json({ error: 'This sign-in was not issued for BeyondX.' })
    }
    if (data.email_verified !== 'true' && data.email_verified !== true) {
      return res.status(401).json({ error: 'Google has not verified this email address.' })
    }

    return res.status(200).json({
      email: data.email,
      name: data.name || '',
      picture: data.picture || '',
      emailVerified: true,
    })
  } catch (err) {
    console.error('[google-verify] error:', err.message)
    return res.status(500).json({ error: 'Could not verify that sign-in. Please try again.' })
  }
}
