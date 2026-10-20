import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { workers as workersApi, ApiError, type Worker } from '../lib/api'
import { categories } from '../data'
import { ID_TYPES, RELATIONSHIPS, REFERENCE_RELATIONSHIPS } from './auth/AuthModals'

const inp = 'w-full rounded-lg border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25'
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const STEPS = ['Skills & experience', 'Identity', 'Guarantor', 'Work reference'] as const
const PHONE = /^0[2357]\d{8}$/

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
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setErr(null); setF((v) => ({ ...v, [k]: e.target.value })) }
  const norm = (p: string) => p.replace(/[\s-]/g, '')

  // Same rules the server applies, checked one step at a time.
  const stepError = (i: number): string | null => {
    if (i === 0) {
      if (!skills.length) return 'Select at least one skill.'
      if (f.experienceSummary.trim().length < 10) return 'Tell us about your work experience (at least a sentence).'
      if (f.videoLink.trim() && !/^https:\/\/\S+$/.test(f.videoLink.trim())) return 'Paste a full video link starting with https://'
      if (!photos.length && !f.videoLink.trim()) return 'Add at least one photo or a video link of your work.'
    }
    if (i === 1) {
      if (!f.idType || !f.idCardNumber.trim()) return 'Choose your ID type and enter the ID number.'
      if (!idPhoto.length) return 'Upload a clear photo of your ID.'
    }
    if (i === 2) {
      if (!f.guarantorName.trim() || !PHONE.test(norm(f.guarantorPhone))) return 'Enter your guarantor\'s name and a valid phone number (e.g. 0241234567).'
      if (norm(f.guarantorPhone) === norm(String(me?.phone || ''))) return 'Your guarantor must have a different number from yours.'
      if (!f.guarantorRelationship) return 'Choose your relationship to your guarantor.'
    }
    if (i === 3) {
      if (!f.referenceName.trim() || !PHONE.test(norm(f.referencePhone))) return 'Enter your reference\'s name and a valid phone number.'
      if (norm(f.referencePhone) === norm(f.guarantorPhone)) return 'Your reference must be a different person from your guarantor.'
      if (norm(f.referencePhone) === norm(String(me?.phone || ''))) return 'Your reference must have a different number from yours.'
      if (!f.referenceRelationship) return 'Choose your relationship to your reference.'
    }
    return null
  }
  const next = () => {
    const e = stepError(step)
    setErr(e)
    if (!e) { setStep((x) => x + 1); window.scrollTo({ top: 0 }) }
  }
  const back = () => { setErr(null); setStep((x) => Math.max(0, x - 1)); window.scrollTo({ top: 0 }) }

  const submit = async () => {
    if (busy) return
    const e = stepError(3)
    if (e) { setErr(e); return }
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
    <div className="mt-6">
      {/* Stepper */}
      <ol className="flex items-center" aria-label="Progress">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                active ? 'border-2 border-forest-600 bg-white text-forest-700' : done ? 'bg-forest-600 text-white' : 'border border-ink-900/15 bg-white text-ink-700/50'
              }`}>
                {done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && <span className={`mx-2 h-0.5 flex-1 rounded-full ${done ? 'bg-forest-600' : 'bg-ink-900/10'}`} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-xs font-medium text-ink-700/70">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{STEPS[step]}</h2>

      <div className="mt-4 space-y-4">
      {step === 0 && (<>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-800">Your skills</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => {
              const on = skills.includes(c.title)
              return (
                <button key={c.title} type="button" onClick={() => setSkills((sk) => (on ? sk.filter((x) => x !== c.title) : [...sk, c.title]))}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium ${on ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/15 text-ink-700'}`}>
                  {c.title}
                </button>
              )
            })}
          </div>
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
      </>)}

      {step === 1 && (<>
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
      </>)}

      {step === 2 && (<>
        <p className="text-sm text-ink-700/80">Someone who can vouch for your character. We text them a short explanation, then call to confirm. Being a guarantor is a character reference only — they take on no money or legal responsibility.</p>
        <Row label="Guarantor full name"><input value={f.guarantorName} onChange={set('guarantorName')} className={inp} /></Row>
        <Row label="Guarantor phone number"><input value={f.guarantorPhone} onChange={set('guarantorPhone')} placeholder="0241234567" inputMode="tel" className={inp} /></Row>
        <Row label="Relationship to guarantor">
          <select value={f.guarantorRelationship} onChange={set('guarantorRelationship')} className={inp}>
            <option value="" disabled>Select a relationship</option>
            {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Row>
      </>)}

      {step === 3 && (<>
        <p className="text-sm text-ink-700/80">A past employer or someone in your trade — not family, and not your guarantor. We will call them.</p>
        <Row label="Reference full name"><input value={f.referenceName} onChange={set('referenceName')} className={inp} /></Row>
        <Row label="Reference phone number"><input value={f.referencePhone} onChange={set('referencePhone')} placeholder="0241234567" inputMode="tel" className={inp} /></Row>
        <Row label="Relationship to reference">
          <select value={f.referenceRelationship} onChange={set('referenceRelationship')} className={inp}>
            <option value="" disabled>Select a relationship</option>
            {REFERENCE_RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Row>
      </>)}
      </div>

      {err && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{err}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0
          ? <button onClick={back} className="rounded-lg border border-ink-900/15 px-6 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5">Back</button>
          : <span />}
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="rounded-lg bg-forest-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-forest-500">Continue</button>
        ) : (
          <button onClick={submit} disabled={busy} className="rounded-lg bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit for verification'}
          </button>
        )}
      </div>
    </div>
  )
}
