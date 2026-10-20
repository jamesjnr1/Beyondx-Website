import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { media } from '../lib/api'

/** Upload one or more photos through /api/upload and keep their URLs. */
export default function ImageUpload({ label, hint, urls, onChange, max = 1, folder }: {
  label: string; hint?: string; urls: string[]; onChange: (urls: string[]) => void; max?: number; folder: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) { setErr('Choose a PNG, JPG or WebP photo.'); return }
    if (file.size > 8 * 1024 * 1024) { setErr('That photo is over 8MB.'); return }
    setErr(null); setBusy(true)
    try {
      const base64: string = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('read')); r.readAsDataURL(file)
      })
      const { url } = await media.upload(base64, file.name, folder)
      onChange(max === 1 ? [url] : [...urls, url].slice(0, max))
    } catch { setErr('Upload failed — please try again.') }
    finally { setBusy(false) }
  }
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mb-2 text-xs text-ink-700/70">{hint}</p>}
      {urls.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {urls.map((u) => (
            <span key={u} className="relative">
              <img src={u} alt="" className="h-16 w-16 rounded-md border border-ink-900/10 object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => onChange(urls.filter((x) => x !== u))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {urls.length < max && (
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-900/15 px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-900/5 ${busy ? 'opacity-60' : ''}`}>
          <Camera size={15} aria-hidden="true" /> {busy ? 'Uploading…' : urls.length ? 'Add another photo' : 'Upload photo'}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} disabled={busy} className="sr-only" />
        </label>
      )}
      {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
    </div>
  )
}
