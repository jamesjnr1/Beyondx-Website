import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { X, Camera } from 'lucide-react'
import { media, session, ApiError } from '../lib/api'

export type Role = 'WORKER' | 'EMPLOYER'
export type Profile = {
  avatar?: string
  name: string
  contact?: string
  phone: string
  region?: string
  experience?: string
  skills?: string
  bio: string
}

const inp =
  'w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30'

function L({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink-700">{label}</label>
      {children}
    </div>
  )
}

export default function ProfileModal({
  role, initial, onClose, onSave,
}: { role: Role; initial: Profile; onClose: () => void; onSave: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(initial)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const worker = session.worker()
  const employer = session.employer()
  const folderFor = () => (role === 'WORKER' ? 'worker-photos' : 'employer-logos')
  const fileNameFor = () =>
    role === 'WORKER'
      ? ((worker?.workerId as string) || 'worker')
      : ((employer?.orgName as string) || 'employer')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''            // allow re-picking the same file after an error
    if (!f) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)) {
      setPhotoError('Please choose a PNG, JPG or WebP image.')
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      setPhotoError('Image must be under 8MB.')
      return
    }

    // Show it straight away, then replace with the stored URL once uploaded.
    const preview = URL.createObjectURL(f)
    setP((prev) => ({ ...prev, avatar: preview }))
    setPhotoError(null)
    setUploading(true)

    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.readAsDataURL(f)
      })
      const { url } = await media.upload(base64, fileNameFor(), folderFor())
      setP((prev) => ({ ...prev, avatar: url }))
    } catch (err) {
      setP((prev) => ({ ...prev, avatar: initial.avatar }))
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload that image. Please try again.')
    } finally {
      URL.revokeObjectURL(preview)
      setUploading(false)
    }
  }
  const set = (k: keyof Profile) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setP((prev) => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream-50 p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="profile-title" className="font-serif text-xl font-medium text-ink-900">Edit profile</h2>
          <button onClick={onClose} aria-label="Close profile editor" className="rounded-lg p-1 text-ink-700 hover:bg-ink-900/5">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4">
          {p.avatar
            ? <img src={p.avatar} alt="Your profile picture" className="h-20 w-20 rounded-full object-cover ring-1 ring-ink-900/10" />
            : <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-forest-600 text-2xl font-bold text-cream-50">{(p.name || '?').slice(0, 1)}</span>}
          <div>
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5">
              <Camera size={15} aria-hidden="true" /> {uploading ? 'Uploading…' : p.avatar ? 'Change photo' : 'Add photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} className="sr-only" aria-label="Upload profile picture" />
            {photoError && <p role="alert" className="mt-1.5 text-xs text-red-700">{photoError}</p>}
            <p className="mt-1 text-xs text-ink-700">JPG or PNG.</p>
          </div>
        </div>

        <div className="space-y-3">
          {role === 'WORKER' ? (
            <>
              <L label="Full name" htmlFor="pf-name"><input id="pf-name" value={p.name} onChange={set('name')} className={inp} /></L>
              <L label="Phone number" htmlFor="pf-phone"><input id="pf-phone" type="tel" value={p.phone} onChange={set('phone')} className={inp} /></L>
              <L label="Experience" htmlFor="pf-exp"><input id="pf-exp" value={p.experience || ''} onChange={set('experience')} placeholder="e.g. 3 years" className={inp} /></L>
              <L label="Skills (comma separated)" htmlFor="pf-skills"><input id="pf-skills" value={p.skills || ''} onChange={set('skills')} placeholder="Painting, Cleaning" className={inp} /></L>
            </>
          ) : (
            <>
              <L label="Organisation name" htmlFor="pf-org"><input id="pf-org" value={p.name} onChange={set('name')} className={inp} /></L>
              <L label="Contact person" htmlFor="pf-contact"><input id="pf-contact" value={p.contact || ''} onChange={set('contact')} className={inp} /></L>
              <L label="Phone number" htmlFor="pf-phone"><input id="pf-phone" type="tel" value={p.phone} onChange={set('phone')} className={inp} /></L>
              <L label="Region" htmlFor="pf-region"><input id="pf-region" value={p.region || ''} onChange={set('region')} className={inp} /></L>
            </>
          )}
          <L label="About" htmlFor="pf-bio"><textarea id="pf-bio" rows={3} value={p.bio} onChange={set('bio')} className={inp} /></L>
        </div>

        <button disabled={uploading} onClick={() => onSave(p)}
          className="mt-5 w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98]">
          Save changes
        </button>
      </div>
    </div>
  )
}
