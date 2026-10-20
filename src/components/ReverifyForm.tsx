import { useState, type ReactNode } from 'react'
import ImageUpload from './ImageUpload'
import { workers as workersApi, ApiError, type Worker } from '../lib/api'
import { categories } from '../data'
import { ID_TYPES, RELATIONSHIPS, REFERENCE_RELATIONSHIPS } from './auth/AuthModals'

const inp = 'w-full rounded-lg border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25'
const str = (v: unknown) => (typeof v === 'string' ? v : '')

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-700/60">{hint}</span>}
    </label>
  )
}

/** Shown to an existing Xpert whose account is paused until they complete the
 *  new verification. Prefilled with what BeyondX already has on file. */
export default function ReverifyForm({ me, onSubmitted }: { me: Worker | null; onSubmitted: () => void }) {
  const existing = (me?.skillEvidenceUrls as string[] | undefined) || []
  const [skills, setSkills] = useState<string[]>((me?.skills as string[] | undefined) || [])
  const [f, setF] = useState({
    idType: str(me?.idType), idCardNumber: str(me?.idCardNumber), experienceSummary: str(me?.experienceSummary),
    guarantorName: str(me?.guarantorName), guarantorPhone: str(me?.guarantorPhone), guarantorRelationship: str(me?.guarantorRelationship),
    referenceName: str(me?.referenceName), referencePhone: str(me?.referencePhone), referenceRelationship: str(me?.referenceRelationship),
    videoLink: existing.find((u) => !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) || '',
  })
  const [idPhoto, setIdPhoto] = useState<string[]>(me?.idDocumentUrl ? [String(me.idDocumentUrl)] : [])
  const [photos, setPhotos] = useState<string[]>(existing.filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)))
  const [certs, setCerts] = useState<string[]>((me?.certificationUrls as string[] | undefined) || [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((v) => ({ ...v, [k]: e.target.value }))
  const norm = (p: string) => p.replace(/[\s-]/g, '')

  const submit = async () => {
    if (busy) return
    setErr(null); setBusy(true)
    try {
      await workersApi.submitVerification({
        skills, idType: f.idType, idCardNumber: f.idCardNumber.trim(), idDocumentUrl: idPhoto[0],
        experienceSummary: f.experienceSummary.trim(),
        guarantorName: f.guarantorName.trim(), guarantorPhone: norm(f.guarantorPhone), guarantorRelationship: f.guarantorRelationship,
        referenceName: f.referenceName.trim(), referencePhone: norm(f.referencePhone), referenceRelationship: f.referenceRelationship,
        skillEvidenceUrls: [...photos, ...(f.videoLink.trim() ? [f.videoLink.trim()] : [])],
        evidenceTaskType: skills[0], certificationUrls: certs,
      })
      onSubmitted()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not submit. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">1. Your skills and experience</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const on = skills.includes(c.title)
            return (
              <button key={c.title} type="button" onClick={() => setSkills((s) => (on ? s.filter((x) => x !== c.title) : [...s, c.title]))}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium ${on ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/15 text-ink-700'}`}>
                {c.title}
              </button>
            )
          })}
        </div>
        <Row label="Your work experience">
          <textarea value={f.experienceSummary} onChange={set('experienceSummary')} rows={3} className={inp}
            placeholder="e.g. 5 years cleaning offices in Osu; 2 years as a site helper in Tema." />
        </Row>
        <ImageUpload label="Photos of your work" hint="Jobs you've done before — up to 5 photos." urls={photos} onChange={setPhotos} max={5} folder="xpert-evidence" />
        <Row label="Or a short video of your work (optional)">
          <input value={f.videoLink} onChange={set('videoLink')} placeholder="https:// link to a video" className={inp} />
        </Row>
        <ImageUpload label="Certificates (optional)" urls={certs} onChange={setCerts} max={3} folder="xpert-certs" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">2. Identity</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="ID type">
            <select value={f.idType} onChange={set('idType')} className={inp}>
              <option value="" disabled>Select your ID</option>
              {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Row>
          <Row label="ID number"><input value={f.idCardNumber} onChange={set('idCardNumber')} className={inp} /></Row>
        </div>
        <ImageUpload label="Photo of your ID" hint="A clear photo of the front. Only BeyondX staff see it." urls={idPhoto} onChange={setIdPhoto} folder="xpert-id" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">3. Guarantor</h2>
        <p className="-mt-1 text-xs text-ink-700/70">Someone who can vouch for your character. We text them a short explanation, then call to confirm. Being a guarantor is a character reference only — they take on no money or legal responsibility.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Guarantor full name"><input value={f.guarantorName} onChange={set('guarantorName')} className={inp} /></Row>
          <Row label="Guarantor phone number"><input value={f.guarantorPhone} onChange={set('guarantorPhone')} placeholder="0241234567" className={inp} /></Row>
        </div>
        <Row label="Relationship to guarantor">
          <select value={f.guarantorRelationship} onChange={set('guarantorRelationship')} className={inp}>
            <option value="" disabled>Select a relationship</option>
            {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Row>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">4. Work reference</h2>
        <p className="-mt-1 text-xs text-ink-700/70">A past employer or someone in your trade — not family, and not your guarantor.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Reference full name"><input value={f.referenceName} onChange={set('referenceName')} className={inp} /></Row>
          <Row label="Reference phone number"><input value={f.referencePhone} onChange={set('referencePhone')} placeholder="0241234567" className={inp} /></Row>
        </div>
        <Row label="Relationship to reference">
          <select value={f.referenceRelationship} onChange={set('referenceRelationship')} className={inp}>
            <option value="" disabled>Select a relationship</option>
            {REFERENCE_RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Row>
      </section>

      {err && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{err}</p>}
      <button onClick={submit} disabled={busy}
        className="w-full rounded-lg bg-forest-600 px-6 py-3 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-60">
        {busy ? 'Submitting…' : 'Submit for verification'}
      </button>
    </div>
  )
}
