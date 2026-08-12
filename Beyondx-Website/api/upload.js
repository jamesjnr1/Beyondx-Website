// api/upload.js
//
// Stores profile photos and employer logos in Supabase Storage and returns a
// public URL. Called by the dashboards as:
//   POST /api/upload  { imageBase64, fileName, folder }  ->  { url }
//
// ESM: this project sets "type": "module", so /api files use `export default`.
//
// Required environment variables:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// Requires a public storage bucket (default "uploads"), or set SUPABASE_BUCKET.

const MAX_BYTES = 8 * 1024 * 1024 // 8MB, matching the old site's limit

const TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
}

function slug(value) {
  return String(value || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  const bucket = process.env.SUPABASE_BUCKET || 'uploads'
  if (!url || !key) {
    return res.status(500).json({
      error: 'Uploads are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel.',
    })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const { imageBase64, fileName, folder } = body || {}

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'No image was received.' })
  }

  // Accepts a bare base64 string or a full data: URL
  const match = imageBase64.match(/^data:([^;]+);base64,(.*)$/)
  const mime = match ? match[1] : 'image/jpeg'
  const data = match ? match[2] : imageBase64

  const ext = TYPES[mime]
  if (!ext) {
    return res.status(400).json({ error: 'Please choose a PNG, JPG or WebP image.' })
  }

  let bytes
  try {
    bytes = Buffer.from(data, 'base64')
  } catch {
    return res.status(400).json({ error: 'That image could not be read.' })
  }
  if (!bytes.length) return res.status(400).json({ error: 'That image is empty.' })
  if (bytes.length > MAX_BYTES) {
    return res.status(413).json({ error: 'Image must be under 8MB.' })
  }

  const path = `${slug(folder || 'uploads')}/${slug(fileName)}-${Date.now()}.${ext}`

  try {
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: bytes,
    })

    if (!r.ok) {
      const detail = await r.text()
      console.error('[upload] failed', r.status, 'bucket:', bucket, 'path:', path, detail.slice(0, 400))

      let reason = ''
      try {
        const parsed = JSON.parse(detail)
        reason = parsed.message || parsed.error || ''
      } catch {
        reason = detail.slice(0, 200)
      }

      // Match on Supabase's own wording — each of these needs a different fix.
      const missingBucket = /bucket not found/i.test(detail)
      const rls = /row-level security|violates.*policy/i.test(detail)
      const badKey = /\bjwt\b|signature|invalid token|not authenticated/i.test(detail)

      // Include the provider's own words — a bare status code is undiagnosable.
      const error = missingBucket
        ? `The "${bucket}" storage bucket was not found. Create a public bucket named "${bucket}" in Supabase → Storage.`
        : rls
          ? `Supabase blocked the write to "${bucket}". Make sure SUPABASE_SERVICE_KEY is the service_role key (not the anon key), then redeploy.`
          : badKey
            ? 'Supabase rejected the key. Check SUPABASE_SERVICE_KEY is correct, then redeploy.'
            : `Upload failed (${r.status})${reason ? `: ${reason}` : ''}`

      return res.status(502).json({ error, reason: reason || undefined, bucket, missingBucket: missingBucket || undefined })
    }

    return res.status(200).json({
      url: `${url}/storage/v1/object/public/${bucket}/${path}`,
    })
  } catch (err) {
    console.error('[upload] error:', err.message)
    return res.status(500).json({ error: 'Could not upload the image. Please try again.' })
  }
}
