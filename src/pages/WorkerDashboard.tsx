import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { MapPin, Calendar, Check, Star, RotateCcw, RefreshCw, AlertCircle, Camera, Plus, Trash2, Phone, AlertTriangle, ChevronRight, Map, ClipboardList, Wallet, Bus, Clock, Users, CheckCircle2, Loader2, LayoutDashboard, ShieldCheck, UserRound, HelpCircle, Flag, CircleDot } from 'lucide-react'
import JobLocationMap from '../components/JobLocationMap'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar, { DashboardMobileNav, type DashboardNavItem } from '../components/DashboardSidebar'
import ActivityFeed, { type ActivityItem } from '../components/ActivityFeed'
import ProfileModal, { type Profile } from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LocationShare from '../components/LocationShare'
import CoordinatorApply from '../components/CoordinatorApply'
import CoordinatorDashboard from './CoordinatorDashboard'
import { tasks as tasksApi, workers as workersApi, media, contact, session, ApiError, type Task, type Worker } from '../lib/api'
import { isRemote } from '../data'
import { isCoordinator } from '../lib/coordinator'
import { useRefreshOnResume } from '../hooks/useRefreshOnResume'
import NotificationsBanner from '../components/NotificationsBanner'
import { useAuth } from '../components/auth/AuthContext'
import { BEYONDX_PHONE } from '../lib/payments'
import { RatingRow, FlagModal } from '../components/tasks/JobParts'

// ---------------------------------------------------------------------------
// Work Experience & Certifications Card
//
// TWO SEPARATE SECTIONS on a single card:
//
//   A. Work Experience — text entries (role, employer, duration) + optional
//      photo. Photos go into worker-experience/ in Supabase storage and are
//      PRIVATE to BeyondX: the URL is stored on the worker record but the
//      employer-facing profile never renders it. BeyondX team can view it
//      during manual vetting.
//
//   B. Certifications — structured (name, issuing body, year) + optional
//      certificate image stored in worker-certs/. Certifications ARE shown
//      to employers: a "Certified" chip on the worker's profile and a count
//      on their card in the hire flow. Verified by BeyondX before the chip
//      goes green; defaults to "Declared" until BeyondX marks it verified.
//
// Both are stored as JSON strings in worker fields: experienceEntries and
// certifications. The PATCH goes through the existing /api/workers/me
// endpoint — if Railway ignores unknown fields, entries are preserved on the
// frontend session until the backend supports them.
// ---------------------------------------------------------------------------

type ExperienceEntry = {
  id: string
  role: string
  employer: string
  duration: string
  photoUrl?: string            // private — not rendered in employer view
}

type Certification = {
  id: string
  name: string
  issuedBy: string
  year: string
  imageUrl?: string            // public — shown to employers as evidence
  verified?: boolean           // BeyondX sets this; false = "Declared", true = "Verified"
}

function parseJSON<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback
  if (Array.isArray(raw)) return raw as unknown as T
  try { return JSON.parse(String(raw)) } catch { return fallback }
}

function FileUploadButton({
  onUploaded,
  folder,
  fileName,
  label = 'Attach photo',
}: {
  onUploaded: (url: string) => void
  folder: string
  fileName: string
  label?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)) {
      setErr('Choose a PNG, JPG or WebP.'); return
    }
    if (f.size > 8 * 1024 * 1024) { setErr('Max 8MB.'); return }
    setErr(null); setUploading(true)
    try {
      const base64: string = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result))
        r.onerror = () => rej(new Error('Read error'))
        r.readAsDataURL(f)
      })
      const result = await media.upload(base64, fileName, folder)
      onUploaded(result.url)
    } catch { setErr('Upload failed — try again.') }
    finally { setUploading(false) }
  }

  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
        <Camera size={13} aria-hidden="true" /> {uploading ? 'Uploading…' : label}
      </button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" />
      {err && <p className="mt-1 text-[0.8125rem] text-red-700">{err}</p>}
    </div>
  )
}

function HomeAreaInline({ worker, onSaved }: { worker: Worker | null; onSaved: (p: Record<string, unknown>) => void }) {
  const [area, setArea] = useState((worker?.homeArea as string) || '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setArea((worker?.homeArea as string) || '') }, [worker?.homeArea])
  const save = async () => {
    if (!area.trim() || busy) return
    setBusy(true)
    try {
      await workersApi.updateMe({ homeArea: area.trim() })
      onSaved({ homeArea: area.trim() })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* silent */ } finally { setBusy(false) }
  }
  return (
    <div className="flex gap-2">
      <input type="text" value={area} onChange={(e) => setArea(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="e.g. Madina, Tema, Dansoman…"
        className="flex-1 rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
      />
      <button onClick={save} disabled={busy || !area.trim()}
        className="shrink-0 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? '…' : saved ? '✓' : 'Save'}
      </button>
    </div>
  )
}

function WorkExperienceCard({
  worker,
  onSaved,
}: {
  worker: Worker | null
  onSaved: (patch: Record<string, unknown>) => void
}) {
  const workerId = (worker?.workerId as string) || 'worker'
  const [open, setOpen] = useState(false)
  const [expEntries, setExpEntries] = useState<ExperienceEntry[]>(() =>
    parseJSON<ExperienceEntry[]>(worker?.experienceEntries, [])
  )
  const [certs, setCerts] = useState<Certification[]>(() =>
    parseJSON<Certification[]>(worker?.certifications, [])
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'exp' | 'certs'>('exp')

  useEffect(() => {
    setExpEntries(parseJSON<ExperienceEntry[]>(worker?.experienceEntries, []))
    setCerts(parseJSON<Certification[]>(worker?.certifications, []))
  }, [worker?.experienceEntries, worker?.certifications])

  const addExp = () =>
    setExpEntries((prev) => [...prev, { id: Date.now().toString(), role: '', employer: '', duration: '' }])

  const updateExp = (id: string, field: keyof ExperienceEntry, val: string) =>
    setExpEntries((prev) => prev.map((e) => e.id === id ? { ...e, [field]: val } : e))

  const removeExp = (id: string) => setExpEntries((prev) => prev.filter((e) => e.id !== id))

  const addCert = () =>
    setCerts((prev) => [...prev, { id: Date.now().toString(), name: '', issuedBy: '', year: '', verified: false }])

  const updateCert = (id: string, field: keyof Certification, val: string | boolean) =>
    setCerts((prev) => prev.map((c) => c.id === id ? { ...c, [field]: val } : c))

  const removeCert = (id: string) => setCerts((prev) => prev.filter((c) => c.id !== id))

  const save = async () => {
    setSaving(true)
    try {
      const patch = {
        experienceEntries: JSON.stringify(expEntries),
        certifications: JSON.stringify(certs),
      }
      await workersApi.updateMe(patch)
      onSaved(patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* parent handles errors */ }
    finally { setSaving(false) }
  }

  const expCount = expEntries.length
  const certCount = certs.length
  const summary = [
    expCount > 0 ? `${expCount} experience${expCount > 1 ? 's' : ''}` : null,
    certCount > 0 ? `${certCount} cert${certCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ') || 'None added yet'

  const inp = 'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-gray-200'

  return (
    <div className="rounded-none bg-transparent">
      {/* Accordion header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-ink-900/[0.02] transition-colors focus:outline-none"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-ink-900">Work experience & certifications</p>
          <p className="mt-0.5 text-xs text-ink-700/60">{summary}</p>
        </div>
        <ChevronRight size={16} className={`shrink-0 text-ink-700/50 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-ink-900/6">
        <div className="flex border-b border-ink-900/6">
        {([['exp', 'Experience'], ['certs', 'Certifications']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`relative flex-1 py-3 text-sm font-medium transition-colors focus:outline-none ${tab === id ? 'text-ink-900' : 'text-ink-700/50 hover:text-ink-900'}`}>
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink-900" />}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {/* ── Experience ── */}
        {tab === 'exp' && (
          <div className="space-y-4">
            {expEntries.length === 0 && (
              <p className="text-center text-sm text-ink-700/60 py-4">
                No experience added yet. Add your past work to help BeyondX match you better.
              </p>
            )}
            {expEntries.map((e) => (
              <div key={e.id} className="rounded-xl border border-ink-900/10 bg-gray-50 p-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">Role / Job title</label>
                    <input value={e.role} onChange={(ev) => updateExp(e.id, 'role', ev.target.value)}
                      placeholder="e.g. Farm labourer" className={inp} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">Employer / Location</label>
                    <input value={e.employer} onChange={(ev) => updateExp(e.id, 'employer', ev.target.value)}
                      placeholder="e.g. Kofi Farms, Tema" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">How long</label>
                  <input value={e.duration} onChange={(ev) => updateExp(e.id, 'duration', ev.target.value)}
                    placeholder="e.g. 6 months (2023)" className={inp} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <FileUploadButton
                      folder="worker-experience"
                      fileName={`${workerId}-exp-${e.id}`}
                      label={e.photoUrl ? 'Photo attached' : 'Attach photo (private)'}
                      onUploaded={(url) => updateExp(e.id, 'photoUrl', url)}
                    />
                    {e.photoUrl && (
                      <p className="mt-1 flex items-center gap-1 text-[0.8125rem] font-medium text-forest-700"><Check size={11} aria-hidden="true" /> Photo saved — visible only to BeyondX</p>
                    )}
                  </div>
                  <button onClick={() => removeExp(e.id)} aria-label="Remove entry"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-700/40 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addExp}
              className="flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-500 transition-colors">
              <Plus size={15} aria-hidden="true" /> Add experience
            </button>
          </div>
        )}

        {/* ── Certifications ── */}
        {tab === 'certs' && (
          <div className="space-y-4">
            {certs.length === 0 && (
              <p className="text-center text-sm text-ink-700/60 py-4">
                No certifications yet. Add any training, certificates or qualifications you hold.
              </p>
            )}
            {certs.map((c) => (
              <div key={c.id} className="rounded-xl border border-ink-900/10 bg-gray-50 p-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">Certification name</label>
                    <input value={c.name} onChange={(ev) => updateCert(c.id, 'name', ev.target.value)}
                      placeholder="e.g. Pesticide Safety Certificate" className={inp} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">Issued by</label>
                    <input value={c.issuedBy} onChange={(ev) => updateCert(c.id, 'issuedBy', ev.target.value)}
                      placeholder="e.g. Ghana EPA" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-700/50">Year obtained</label>
                  <input value={c.year} onChange={(ev) => updateCert(c.id, 'year', ev.target.value)}
                    placeholder="e.g. 2022" className={inp} style={{ maxWidth: 120 }} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <FileUploadButton
                      folder="worker-certs"
                      fileName={`${workerId}-cert-${c.id}`}
                      label={c.imageUrl ? 'Certificate attached' : 'Attach certificate image'}
                      onUploaded={(url) => updateCert(c.id, 'imageUrl', url)}
                    />
                    {c.imageUrl && (
                      <p className="mt-1 text-[0.8125rem] text-forest-700">
                        <span className="flex items-center gap-1"><Check size={11} aria-hidden="true" /> Image attached — shown to employers after BeyondX review</span>
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ${c.verified ? 'bg-gray-100 text-forest-700' : 'bg-ink-900/8 text-ink-700/70'}`}>
                        {c.verified ? 'BeyondX Verified' : 'Declared — pending review'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removeCert(c.id)} aria-label="Remove certification"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-700/40 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addCert}
              className="flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-500 transition-colors">
              <Plus size={15} aria-hidden="true" /> Add certification
            </button>
          </div>
        )}

        {/* Save bar */}
        <div className="mt-5 flex items-center justify-between border-t border-ink-900/8 pt-4">
          <p className="text-xs text-ink-700/60">
            {tab === 'exp' ? 'Your photos are private — employers only see text.' : 'Certifications show as badges on your employer profile after BeyondX review.'}
          </p>
          <button onClick={save} disabled={saving}
            className="rounded-md bg-forest-600 px-5 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}


// Lets a worker declare which skill categories they have their own tools for.
// Employers see a "Has tools" badge on their profile, and it feeds the tool
// modifier pricing in the dispatch modal. Workers are asked to fill this in
// via a broadcast SMS — this is the screen they land on when they do.
// ---------------------------------------------------------------------------

const cedis = (n?: number | string) => `GH\u20b5 ${Number(n || 0).toLocaleString()}`

const employerName = (t: Task) =>
  typeof t.employer === 'string' ? t.employer : t.employer?.orgName || t.employer?.name || 'BeyondX employer'

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} aria-hidden="true" className={i <= n ? 'fill-forest-600 text-forest-600' : 'text-ink-900/20'} />
      ))}
    </span>
  )
}

/** Report something on site that differs from what was agreed, or a safety
 *  issue. Goes to BeyondX staff. */
function ReportModal({ task, onClose, onSent }: { task: Task; onClose: () => void; onSent: () => void }) {
  const [category, setCategory] = useState<'scope_change' | 'safety' | 'other' | ''>('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async () => {
    if (!category || text.trim().length < 5 || busy) return
    setBusy(true); setErr(null)
    try { await tasksApi.report(task.id, category, text.trim()); onSent() }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send your report. Please try again.'); setBusy(false) }
  }
  const options: [typeof category, string, string][] = [
    ['scope_change', 'Different from what was agreed', 'More work, different tasks, or conditions that weren\'t described'],
    ['safety', 'Safety concern', 'Anything that puts you or others at risk'],
    ['other', 'Something else', 'Anything else BeyondX should know'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="report-title" className="text-lg font-semibold text-ink-900">Report an issue</h2>
        <p className="mt-1 text-sm text-ink-700/75">{task.taskType}{task.location ? ` · ${task.location}` : ''}. Your report goes straight to the BeyondX team — the employer doesn't see it.</p>
        <div className="mt-4 space-y-2">
          {options.map(([id, title, hint]) => (
            <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 ${category === id ? 'border-ink-900' : 'border-ink-900/15'}`}>
              <input type="radio" name="report-cat" checked={category === id} onChange={() => setCategory(id)} className="mt-1" />
              <span><span className="block text-sm font-medium text-ink-900">{title}</span><span className="block text-xs text-ink-700/70">{hint}</span></span>
            </label>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What did you see or experience? Include when it happened."
          className="mt-4 w-full rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5">Cancel</button>
          <button onClick={submit} disabled={!category || text.trim().length < 5 || busy}
            className="flex-1 rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send report'}</button>
        </div>
      </div>
    </div>
  )
}

/** "How was this job?" — the Xpert's structured feedback after a job. Only the
 *  overall score is shown to the employer; the rest is private to BeyondX. */
function RateEmployerModal({ task, onClose, onDone, onFlag }: { task: Task; onClose: () => void; onDone: () => void; onFlag: () => void }) {
  const [scores, setScores] = useState({ taskAccuracyRating: 0, employerBehaviorRating: 0, paymentRating: 0, workingConditionsRating: 0, scopeChangesRating: 0, communicationRating: 0, rating: 0 })
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const done = Object.values(scores).every((n) => n > 0)
  const set = (k: keyof typeof scores) => (n: number) => setScores((v) => ({ ...v, [k]: n }))
  const submit = async () => {
    if (!done || busy) return
    setBusy(true); setErr(null)
    try { await tasksApi.workerReview(task.id, scores, comment.trim()); onDone() }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save your feedback.'); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rate-emp-title" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="rate-emp-title" className="text-lg font-semibold text-ink-900">How was this job?</h2>
        <p className="mt-1 text-sm text-ink-700/75">{task.taskType} for {employerName(task)}. Your answers go to BeyondX; the employer only sees your overall score.</p>
        <div className="mt-4 space-y-2.5">
          <RatingRow label="Task matched what was described" value={scores.taskAccuracyRating} onChange={set('taskAccuracyRating')} />
          <RatingRow label="Employer behaviour" value={scores.employerBehaviorRating} onChange={set('employerBehaviorRating')} />
          <RatingRow label="Payment" value={scores.paymentRating} onChange={set('paymentRating')} />
          <RatingRow label="Working conditions" value={scores.workingConditionsRating} onChange={set('workingConditionsRating')} />
          <RatingRow label="Scope changes handled fairly" value={scores.scopeChangesRating} onChange={set('scopeChangesRating')} />
          <RatingRow label="Communication" value={scores.communicationRating} onChange={set('communicationRating')} />
          <RatingRow label="Overall" value={scores.rating} onChange={set('rating')} />
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Anything else BeyondX should know? (private)"
          className="mt-4 w-full rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />
        <button onClick={onFlag} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-700 hover:underline">
          <Flag size={12} aria-hidden="true" /> Something specific happened? Report an incident
        </button>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5">Later</button>
          <button onClick={submit} disabled={!done || busy} className="flex-1 rounded-md bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Submit feedback'}</button>
        </div>
      </div>
    </div>
  )
}

/** Plain-language verification checklist — never internal status names. */
function VerificationSteps({ me }: { me: Worker | null }) {
  const steps = (me?.verificationSteps as { key: string; label: string; state: 'done' | 'in_progress' | 'needed'; detail: string }[] | undefined) || []
  if (!steps.length) return null
  return (
    <ul className="mt-4 space-y-2">
      {steps.map((st) => (
        <li key={st.key} className="flex items-start gap-3 rounded-lg border border-ink-900/8 bg-white px-4 py-3">
          {st.state === 'done' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
            : st.state === 'needed' ? <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            : <CircleDot size={18} className="mt-0.5 shrink-0 text-ink-700/50" aria-hidden="true" />}
          <span><span className="block text-sm font-semibold text-ink-900">{st.label}</span><span className="block text-sm text-ink-700">{st.detail}</span></span>
        </li>
      ))}
    </ul>
  )
}

/** Shown instead of the dashboard until BeyondX approves the application. */
function ApplicationStatus({ me }: { me: Worker | null }) {
  const { logout } = useAuth()
  const status = String(me?.accountStatus || 'under_review')
  const name = ((me?.fullName as string) || 'there').split(' ')[0]
  const copy: Record<string, { title: string; body: string }> = {
    under_review: { title: 'Your application is under review', body: "Thanks for applying to be a BeyondX Xpert. We're checking your ID, calling your guarantor and reference, and looking at your work. You'll get an SMS as soon as you're approved — then you can start taking jobs here." },
    rejected: { title: "We couldn't approve your application", body: 'Unfortunately we could not approve your application at this time.' },
    suspended: { title: 'Your account is suspended', body: 'Your BeyondX account is suspended, so you can\'t take jobs right now.' },
  }
  if (status === 'under_review' && me?.activatedAt) {
    copy.under_review = { title: 'Your account is under review', body: 'BeyondX is reviewing your account, so you can\'t take new jobs for now. We will contact you.' }
  }
  const c = copy[status] || copy.under_review
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/8 bg-white p-8 shadow-sm">
        <p className="text-sm text-ink-700/70">Hi {name},</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">{c.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">{c.body}</p>
        {status === 'under_review' && !me?.activatedAt && <VerificationSteps me={me} />}
        {!!me?.applicationNote && status !== 'under_review' && (
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-ink-800"><span className="font-semibold">Note from BeyondX:</span> {String(me.applicationNote)}</p>
        )}
        <p className="mt-5 text-sm text-ink-700">Questions? Call BeyondX on <span className="font-medium text-ink-900">{BEYONDX_PHONE}</span>.</p>
        <button onClick={logout} className="mt-6 rounded-md border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5">Log out</button>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, extra }: { icon: ReactNode; label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-900/8 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center gap-2.5 text-sm font-medium text-ink-700">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-900/10 text-forest-600">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="text-2xl font-bold text-ink-900">{value}</span>
        {extra}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm border border-ink-900/8">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
        </div>
      ))}
    </div>
  )
}

function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-900/15 bg-gray-50 p-10 text-center">
      {icon && <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/5 text-ink-700/50">{icon}</span>}
      <p className="text-sm text-ink-700">{text}</p>
    </div>
  )
}

function TaskCard({ task, children }: { task: Task; children?: ReactNode }) {
  // Employer contact and site details are revealed once the Xpert accepts.
  const revealed = ['accepted', 'pending_confirmation', 'employer_confirmed', 'completed'].includes(String(task.status))
  const empPhone = revealed && typeof task.employer === 'object' ? (task.employer as Record<string, unknown>)?.phone as string | undefined : undefined
  const empContact = revealed && typeof task.employer === 'object' ? (task.employer as Record<string, unknown>)?.contactPerson as string | undefined : undefined
  const empOrg = typeof task.employer === 'object' ? (task.employer as Record<string, unknown>)?.orgName as string | undefined : undefined
  const [showMap, setShowMap] = useState(false)

  const isOffer = task.status === 'offered'
  const expiresAt = task.offerExpiresAt as string | undefined
  const slotsNeeded = (task.slotsNeeded as number) || 1
  const filledSlots = (task.filledSlots as number) || 0
  const slotsRemaining = (task.slotsRemaining as number) ?? (slotsNeeded - filledSlots)
  const hoursLeft = expiresAt ? Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600000) : null
  const hasSchedule = !!(task.scheduledDate as string)
  const scheduledLabel = hasSchedule
    ? new Date(`${task.scheduledDate as string}T${(task.scheduledTime as string) || '08:00'}:00`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null
  const transportAmt = (task.transportAllowance as number) || 0
  const isIntercityJob = transportAmt >= 80  // Tier 4

  return (
    <div className={`overflow-hidden rounded-2xl bg-white border transition-shadow hover:shadow-md ${isOffer ? 'border-ink-900/10' : 'border-ink-900/8'} shadow-sm`}>

      {/* Offer / intercity banner */}
      {isOffer && (
        <div className="flex items-center gap-2 bg-forest-600 px-4 py-2">
          <span className="flex h-1.5 w-1.5 rounded-[9999px] bg-white animate-pulse" aria-hidden="true" />
          <span className="text-xs font-semibold text-cream-50">Direct offer — respond to secure this job</span>
        </div>
      )}
      {isIntercityJob && (
        <div className="flex items-center gap-2 bg-red-600 px-4 py-2">
          <AlertTriangle size={12} className="shrink-0 text-cream-50" aria-hidden="true" />
          <span className="text-xs font-semibold text-cream-50">Long-distance assignment — review before accepting</span>
        </div>
      )}

      <div className="px-4 py-4 sm:px-5 sm:py-5">

        {/* Title + pay */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold leading-snug text-ink-900">{task.taskType || 'Task'}</p>
            {empOrg && <p className="mt-0.5 text-xs text-ink-700/50">{empOrg}</p>}
            {Number((task.employer as Record<string, unknown> | undefined)?.rating || 0) > 0 && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-700/70">
                <Star size={11} className="fill-forest-600 text-forest-600" aria-hidden="true" />
                {Number((task.employer as Record<string, unknown>).rating).toFixed(1)} employer rating
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-forest-700">{cedis(task.pay)}</p>
            {transportAmt > 0 && (
              <p className="mt-0.5 text-[0.8125rem] text-ink-700/50">+ GH₵{transportAmt} transport</p>
            )}
          </div>
        </div>

        {/* Meta row — location · duration · schedule */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {task.location && task.location !== 'Remote' && (
            <button onClick={() => setShowMap(v => !v)}
              className="inline-flex items-center gap-1 text-xs text-ink-700/60 hover:text-forest-700 transition-colors"
              aria-expanded={showMap}>
              <MapPin size={11} className={showMap ? 'text-forest-600' : ''} aria-hidden="true" />
              {task.location}
              <Map size={10} className="opacity-40" aria-hidden="true" />
            </button>
          )}
          {task.location === 'Remote' && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-700/60">
              <MapPin size={11} aria-hidden="true" />Remote
            </span>
          )}
          {task.duration && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-700/60">
              <Calendar size={11} aria-hidden="true" />{task.duration}
            </span>
          )}
          {scheduledLabel && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-700">
              <Clock size={11} aria-hidden="true" />{scheduledLabel}
            </span>
          )}
        </div>

        {/* Description — plain text, no box */}
        {task.description && task.description !== task.taskType && !task.description.includes('Payment Ref') && (
          <p className="mt-3 text-sm leading-relaxed text-ink-700/75 whitespace-pre-line">
            {task.description}
          </p>
        )}

        {/* Requirements are visible before accepting; site details after */}
        {([['Required skills', task.requiredSkills], ['Special requirements', task.specialRequirements], ['Equipment or materials', task.equipmentNotes]] as const)
          .filter(([, v]) => v).map(([k, v]) => (
            <p key={k} className="mt-2 text-xs text-ink-700"><span className="font-semibold text-ink-900">{k}:</span> {v}</p>
          ))}
        {revealed && (task.siteNotes || empContact || !!task.photoUrls?.length) && (
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-ink-700">
            <p className="font-semibold text-ink-900">Site information</p>
            {task.siteNotes && <p className="mt-1 whitespace-pre-line">{task.siteNotes}</p>}
            {empContact && <p className="mt-1">Contact on site: {empContact}{empPhone ? ` · ${empPhone}` : ''}</p>}
            {!!task.photoUrls?.length && (
              <div className="mt-2 flex flex-wrap gap-2">{task.photoUrls.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" className="h-12 w-12 rounded object-cover" /></a>)}</div>
            )}
          </div>
        )}

        {/* Map */}
        {showMap && task.location && task.location !== 'Remote' && (
          <div className="mt-3">
            <JobLocationMap location={task.location as string} heightClass="h-44" showOpenLink />
          </div>
        )}

        {/* Transport notice */}
        {isOffer && transportAmt > 0 && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${isIntercityJob ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-forest-800'}`}>
            <Bus size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p><strong>GH₵{transportAmt} transport allowance</strong> added to your {cedis(task.pay)} rate.
            {isIntercityJob && <span className="ml-1 text-red-700">Factor in travel time both ways.</span>}
            </p>
          </div>
        )}

        {/* Slots + expiry */}
        {(isOffer || !isOffer) && slotsNeeded > 1 && slotsRemaining > 0 && (
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-700">
            <Users size={11} aria-hidden="true" />
            {isOffer ? `${slotsRemaining} spot${slotsRemaining !== 1 ? 's' : ''} left` : `${slotsRemaining} of ${slotsNeeded} spots remaining`}
          </p>
        )}
        {isOffer && hoursLeft !== null && (
          <p className="mt-1.5 text-xs font-medium text-red-600">Offer expires in {hoursLeft}h</p>
        )}

        {/* Payment pending */}
        {task.status === 'payment_pending' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
            <Loader2 size={12} aria-hidden="true" className="shrink-0 animate-spin" />
            Verifying payment — you'll be dispatched once confirmed
          </div>
        )}
      </div>

      {/* Footer */}
      {children && (
        <div className="flex items-center justify-between border-t border-ink-900/6 px-4 py-3 sm:px-5">
          {empPhone
            ? <a href={`tel:${empPhone}`} className="inline-flex items-center gap-1.5 text-xs text-ink-700/40 hover:text-ink-900 transition-colors"><Phone size={11} aria-hidden="true" />{empPhone}</a>
            : <span />}
          <div className="flex items-center gap-2">{children}</div>
        </div>
      )}
    </div>
  )
}

export default function WorkerDashboard() {
  const [section, setSection] = useState<'overview' | 'assignments' | 'verification' | 'earnings' | 'profile' | 'support'>('overview')
  const [tab, setTab] = useState<'available' | 'mine' | 'declined'>('available')
  const [offers, setOffers] = useState<Task[]>([])
  const [open, setOpen] = useState<Task[]>([])
  const [mine, setMine] = useState<Task[]>([])
  const [history, setHistory] = useState<Task[]>([])
  const [declined, setDeclined] = useState<Task[]>([])
  const [me, setMe] = useState<Worker | null>(session.worker())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | number | null>(null)
  const [editing, setEditing] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [toast, setToast] = useState<ToastMsg>(null)
  const [reportTask, setReportTask] = useState<Task | null>(null)
  const [rateTask, setRateTask] = useState<Task | null>(null)
  const [flagTask, setFlagTask] = useState<Task | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [openRes, mineRes, histRes, meRes] = await Promise.all([
        tasksApi.open(),
        tasksApi.mine(),
        tasksApi.workerHistory(),
        workersApi.me().catch(() => null),
      ])
      const mineTasks = mineRes?.tasks || []
      setOffers(mineTasks.filter((t) => t.status === 'offered'))
      setOpen((openRes?.tasks || []).filter((t) => t.status === 'open'))
      setMine(mineTasks.filter((t) => t.status === 'accepted' || t.status === 'pending_confirmation' || t.status === 'payment_pending'))

      setHistory(histRes?.tasks || [])
      if (meRes?.worker) { setMe(meRes.worker); session.patchWorker(meRes.worker) }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRefreshOnResume(load)

  const act = async (t: Task, fn: () => Promise<unknown>, msg: string, detail: string) => {
    if (busyId) return
    setBusyId(t.id)
    try {
      await fn()
      setToast({ id: Date.now(), kind: 'success', title: msg, detail })
      setAnnounce(msg)
      await load()
    } catch (e) {
      setToast({ id: Date.now(), kind: 'info', title: 'That did not go through', detail: e instanceof ApiError ? e.message : 'Please try again.' })
    } finally {
      setBusyId(null)
    }
  }

  const [locationTask, setLocationTask] = useState<Task | null>(null)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationErr, setLocationErr] = useState<string | null>(null)
  const [autoShareTaskId, setAutoShareTaskId] = useState<string | number | null>(null)

  // Called when worker taps Accept — shows the location modal first
  const promptAccept = (t: Task) => {
    setLocationTask(t)
    setLocationErr(null)
  }

  const doAccept = async (skipLocation = false) => {
    if (!locationTask || locationBusy) return
    setLocationBusy(true)
    setLocationErr(null)

    const performAccept = async () => {
      const t = locationTask
      setBusyId(t.id)
      try {
        if (t.status === 'offered') {
          await tasksApi.acceptOffer(t.id)
        } else {
          await tasksApi.accept(t.id)
        }
        // The one-time position captured here (lat/lng) only decides whether
        // to auto-start continuous sharing below via LocationShare's
        // autoStart — it isn't persisted itself; LocationShare's own
        // getCurrentPosition + POST /api/location is what actually reports
        // the worker's position once sharing begins.
        setLocationTask(null)
        setToast({ id: Date.now(), kind: 'success', title: 'Job accepted', detail: `${t.taskType || 'The task'} is now in My Tasks.` })
        setAnnounce('Job accepted')
        await load()
      } catch (e) {
        const isStale = e instanceof ApiError && (e.status === 409 || e.status === 404)
        setToast({
          id: Date.now(),
          kind: 'info',
          title: isStale ? 'This job changed' : 'That did not go through',
          detail: e instanceof ApiError ? e.message : 'Please try again.',
        })
        // The job was expired, cancelled, or reassigned since this screen
        // loaded — refresh so the stale card actually disappears instead
        // of sitting there ready to fail again on a retry.
        if (isStale) { setLocationTask(null); load() }
      } finally {
        setBusyId(null)
      }
    }

    if (skipLocation || !navigator.geolocation) {
      await performAccept()
      setLocationBusy(false)
      return
    }

    // Geolocation must be requested synchronously inside the click handler —
    // the browser blocks the permission prompt if called after any await.
    navigator.geolocation.getCurrentPosition(
      async () => {
        await performAccept()
        setAutoShareTaskId(locationTask.id)
        setLocationBusy(false)
      },
      async () => {
        // Denied or unavailable — accept anyway without coordinates
        await performAccept()
        setLocationBusy(false)
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  const acceptOffer = (t: Task) => promptAccept(t)
  const acceptOpen  = (t: Task) => promptAccept(t)
  const markDone = (t: Task) =>
    act(
      t,
      async () => {
        await tasksApi.workerDone(t.id)
        // Notify BeyondX by email, as the main site does. Never let a failed
        // notification look like the task itself failed.
        const pay = Number(t.pay || 0).toFixed(2)
        contact
          .send({
            name: displayName,
            phone: (me?.phone as string) || undefined,
            message:
              `Worker ${displayName} (${(me?.workerId as string) || '—'}) marked a task as done.\n\n` +
              `Task: ${t.taskType || '—'}\n` +
              `Location: ${t.location || '—'}\n` +
              `Employer: ${employerName(t)}\n` +
              `Amount: GHS ${pay}`,
            category: 'task_completed',
          })
          .catch(() => null)
      },
      'Marked complete',
      `${employerName(t)} will confirm, then BeyondX releases your payment.`,
    )

  const checkIn = (t: Task, step: 'arrived' | 'started') =>
    act(
      t,
      () => (step === 'arrived' ? tasksApi.arrived(t.id) : tasksApi.started(t.id)),
      step === 'arrived' ? 'Arrival recorded' : 'Work started',
      step === 'arrived' ? 'The employer can see you are on site.' : 'Tap Mark complete when the job is done.',
    )

  const [confirmDeclineTask, setConfirmDeclineTask] = useState<Task | null>(null)

  const declineOffer = async (t: Task) => {
    // Show the "are you sure?" modal first — set to null to close
    setConfirmDeclineTask(t)
  }

  const doDecline = async (t: Task) => {
    setConfirmDeclineTask(null)
    if (busyId) return
    setBusyId(t.id)
    try {
      await tasksApi.declineOffer(t.id)
      setDeclined((d) => [t, ...d])
      setToast({ id: Date.now(), kind: 'info', title: 'Offer declined', detail: 'The employer has been notified and will decide whether to reassign or request a refund.' })
      // Notify BeyondX immediately so the team can contact the employer
      const emp = employerName(t)
      contact.send({
        name: displayName,
        phone: (me?.phone as string) || undefined,
        message:
          `Worker ${displayName} (${(me?.workerId as string) || '—'}) DECLINED a task offer.\n\n` +
          `Task: ${t.taskType || '—'}\n` +
          `Location: ${t.location || '—'}\n` +
          `Employer: ${emp}\n` +
          `Amount: GHS ${Number(t.pay || 0).toFixed(2)}\n\n` +
          `Action needed: Contact the employer to ask whether they want a replacement Xpert or a refund of their payment.`,
        category: 'task_declined',
      }).catch(() => null)
      await load()
    } catch (e) {
      const isStale = e instanceof ApiError && (e.status === 409 || e.status === 404)
      setToast({
        id: Date.now(),
        kind: 'info',
        title: isStale ? 'This job changed' : 'That did not go through',
        detail: e instanceof ApiError ? e.message : 'Please try again.',
      })
      if (isStale) load()
    } finally {
      setBusyId(null)
    }
  }

  // Direct offers (dispatched by BeyondX to this specific worker) show first,
  // followed by open tasks any worker can browse and accept first-come,
  // first-served. Re-enabled — this was restricted during the early-stage
  // rollout; the platform has since grown past that.
  const available = [...offers, ...open]
  const displayName = (me?.fullName as string) || (me?.name as string) || 'Xpert'
  const photo = (me?.photoUrl as string) || undefined
  const completed = history.length
  const earned = history.reduce((sum, t) => sum + Number(t.pay || 0), 0)

  const profile: Profile = {
    avatar: photo,
    name: displayName,
    phone: (me?.phone as string) || '',
    experience: '',
    skills: Array.isArray(me?.skills) ? (me?.skills as string[]).join(', ') : '',
    bio: (me?.bio as string) || '',
    hasTools: 'hasTools' in (me || {}) ? Boolean((me as Record<string,unknown>)?.hasTools) : undefined,
  }

  const assignmentTabs = [
    { id: 'available', label: `Available (${available.length})` },
    { id: 'mine', label: `My Tasks (${mine.length})` },
    { id: 'declined', label: `Declined (${declined.length})` },
  ] as const

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', label: 'My Assignments', icon: ClipboardList, badge: available.length },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ]
  // Short set for the top bar — the sidebar carries the full list.
  const headerNavItems = navItems.filter((i) => ['overview', 'assignments', 'profile', 'support'].includes(i.id))

  const activityDate = (t: Task) => t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined

  const recentActivity: ActivityItem[] = [
    ...mine.map((t) => ({
      id: `mine-${t.id}`,
      icon: <Clock size={15} aria-hidden="true" />,
      title: `${t.taskType || 'Task'} — in progress`,
      detail: [employerName(t), activityDate(t)].filter(Boolean).join(' · '),
      status: { label: 'In progress', tone: 'info' as const },
    })),
    ...declined.slice(0, 3).map((t) => ({
      id: `declined-${t.id}`,
      icon: <RotateCcw size={15} aria-hidden="true" />,
      title: `${t.taskType || 'Task'} declined`,
      detail: [employerName(t), activityDate(t)].filter(Boolean).join(' · '),
      status: { label: 'Declined', tone: 'info' as const },
    })),
    ...history.slice(0, 5).map((t) => ({
      id: `history-${t.id}`,
      icon: <CheckCircle2 size={15} aria-hidden="true" />,
      title: `${t.taskType || 'Task'} completed`,
      detail: [employerName(t), activityDate(t)].filter(Boolean).join(' · '),
      status: { label: 'Completed', tone: 'success' as const },
    })),
  ].slice(0, 8)

  // The soonest scheduled task in My Tasks — falls back to the first accepted
  // task when none carry a schedule, since any accepted job is still "next".
  const nextAssignment = [...mine].sort((a, b) => {
    const da = a.scheduledDate ? new Date(`${a.scheduledDate}T${a.scheduledTime || '08:00'}`).getTime() : Infinity
    const db = b.scheduledDate ? new Date(`${b.scheduledDate}T${b.scheduledTime || '08:00'}`).getTime() : Infinity
    return da - db
  })[0]
  const nextAssignmentWhen = nextAssignment?.scheduledDate
    ? new Date(`${nextAssignment.scheduledDate}T${nextAssignment.scheduledTime || '08:00'}:00`)
        .toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : undefined

  // Approved Coordinators get a different dashboard entirely (team
  // management, bulk-job quoting, payout splits) — see CoordinatorDashboard.
  if ((me?.accountStatus || 'active') !== 'active') return <ApplicationStatus me={me} />
  if (isCoordinator(me)) return <CoordinatorDashboard />

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader role="XPERT" title="Xpert Dashboard" name={displayName} avatar={photo} onEditProfile={() => setEditing(true)} tasks={[...offers, ...mine, ...history]}
        navItems={headerNavItems} active={section} onSelect={(id) => setSection(id as typeof section)} />
      <div className="lg:flex">
        <DashboardSidebar items={navItems} active={section} onSelect={(id) => setSection(id as typeof section)} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <p aria-live="polite" className="sr-only">{announce}</p>

        <NotificationsBanner role="worker" />

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}
            </p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">
              Try again
            </button>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900 sm:text-[1.75rem]">Welcome back, {displayName.split(' ')[0]}!</h1>
          <p className="mt-0.5 text-sm text-ink-700/70">Here's what's happening with your profile and assignments.</p>
        </div>

        <div>
          <DashboardMobileNav items={navItems} active={section} onSelect={(id) => setSection(id as typeof section)} />

          <div className="min-w-0 flex-1">
            {section === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-ink-700">Your Current Status</p>
                    <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-forest-700">
                      <Check size={20} strokeWidth={3} aria-hidden="true" /> Active
                    </p>
                    <p className="mt-3 text-sm text-ink-700/75">
                      {offers.length > 0
                        ? `You have ${offers.length} offer${offers.length === 1 ? '' : 's'} awaiting your response.`
                        : "You're all set — eligible for new assignments."}
                    </p>
                    <button onClick={() => setSection('verification')} className="mt-4 text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-500">
                      View status details →
                    </button>
                  </div>

                  <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
                    <p className="border-b border-ink-900/8 pb-3 text-sm font-semibold text-ink-900">Next Assignment</p>
                    {nextAssignment ? (
                      <>
                        <p className="mt-3 text-lg font-semibold text-ink-900">{nextAssignment.taskType || 'Task'}</p>
                        <div className="mt-1.5 space-y-1 text-sm text-ink-700/75">
                          {nextAssignmentWhen && (
                            <p className="flex items-center gap-1.5"><Calendar size={13} aria-hidden="true" /> {nextAssignmentWhen}</p>
                          )}
                          {nextAssignment.location && (
                            <p className="flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" /> {nextAssignment.location}</p>
                          )}
                        </div>
                        <button onClick={() => { setSection('assignments'); setTab('mine') }}
                          className="mt-4 rounded-lg bg-forest-600 px-7 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98]">
                          View Details
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-ink-700/70">No upcoming assignment yet.</p>
                        <button onClick={() => { setSection('assignments'); setTab('available') }}
                          className="mt-3 rounded-md border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-900/5">
                          Browse available jobs
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat icon={<ClipboardList size={18} />} label="Completed Jobs" value={`${completed}`} />
                  <Stat icon={<Wallet size={18} />} label="Total Earnings" value={cedis(earned)} />
                  <Stat icon={<Star size={18} />} label="Average Rating"
                    value={me?.rating && Number(me.rating) > 0 ? Number(me.rating).toFixed(1) : '—'}
                    extra={me?.rating && Number(me.rating) > 0 ? <Stars n={Math.round(Number(me.rating))} /> : undefined} />
                </div>

                <div>
                  {loading ? <Skeleton /> : (
                    <ActivityFeed title="Recent Activity" items={recentActivity} empty="No activity yet — accepted and completed jobs will show up here." />
                  )}
                </div>
              </div>
            )}

            {section === 'assignments' && (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-md bg-ink-900/5 p-1" role="tablist" aria-label="Assignment status">
                    {assignmentTabs.map((t) => (
                      <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                        className={`shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none ${tab === t.id ? 'bg-white text-forest-700 shadow-sm' : 'text-ink-700 hover:text-ink-900'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setLoading(true); load() }} aria-label="Refresh tasks"
                    className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-ink-700/60 transition-colors hover:bg-ink-900/5 hover:text-ink-900">
                    <RefreshCw size={13} aria-hidden="true" /> Refresh
                  </button>
                </div>

                <div className="space-y-3">
                  {loading ? <Skeleton /> : (
                    <>
                      {tab === 'available' && (available.length ? available.map((t) => (
                        <TaskCard key={t.id} task={t}>
                          {t.status === 'offered' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => declineOffer(t)} disabled={busyId === t.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5 disabled:opacity-60">
                                Decline
                              </button>
                              <button onClick={() => acceptOffer(t)} disabled={busyId === t.id}
                                className="inline-flex items-center gap-1.5 rounded-md bg-forest-600 px-5 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                                <Check size={15} aria-hidden="true" /> {busyId === t.id ? 'Accepting…' : 'Accept offer'}
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => acceptOpen(t)} disabled={busyId === t.id}
                              className="inline-flex items-center gap-1.5 rounded-md bg-forest-600 px-5 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                              <Check size={15} aria-hidden="true" /> {busyId === t.id ? 'Accepting…' : 'Accept'}
                            </button>
                          )}
                        </TaskCard>
                      )) : <Empty text="No jobs available right now. Check back soon." icon={<ClipboardList size={20} aria-hidden="true" />} />)}

                      {tab === 'mine' && (
                        <>
                          {mine.length ? mine.map((t) => {
                            // Mark Complete is only available on the scheduled day (or any day if no date set)
                            const scheduledDate = t.scheduledDate as string | undefined
                            const today = new Date().toISOString().split('T')[0]
                            const canMarkDone = !scheduledDate || scheduledDate <= today

                            return (
                            <div key={t.id}>
                              <TaskCard task={t}>
                                {t.status === 'payment_pending' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200">
                                    <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Verifying payment
                                  </span>
                                ) : t.status === 'pending_confirmation' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-900/8 px-3 py-1.5 text-xs font-semibold text-ink-700">
                                    <CheckCircle2 size={12} aria-hidden="true" className="text-forest-600" /> Awaiting confirmation
                                  </span>
                                ) : canMarkDone && !t.arrivedAt && t.status === 'accepted' && !isRemote(t.taskType || '') ? (
                                  <button onClick={() => checkIn(t, 'arrived')} disabled={busyId === t.id}
                                    className="shrink-0 rounded-md bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                                    {busyId === t.id ? 'Saving…' : "I've arrived"}
                                  </button>
                                ) : canMarkDone && !t.startedAt && t.status === 'accepted' ? (
                                  <button onClick={() => checkIn(t, 'started')} disabled={busyId === t.id}
                                    className="shrink-0 rounded-md bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                                    {busyId === t.id ? 'Saving…' : 'Start work'}
                                  </button>
                                ) : canMarkDone ? (
                                  <button onClick={() => markDone(t)} disabled={busyId === t.id} aria-label={`Mark ${t.taskType || 'task'} complete`}
                                    className="shrink-0 rounded-md bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                                    {busyId === t.id ? 'Saving…' : 'Mark complete'}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-900/5 px-3 py-1.5 text-xs font-medium text-ink-700/60">
                                    <Clock size={11} aria-hidden="true" /> Available on {new Date(scheduledDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </TaskCard>
                              <div className="-mt-1 rounded-b-xl bg-white px-4 pb-4 shadow-sm border border-ink-900/8 sm:px-5">
                                <LocationShare
                                  taskId={t.id}
                                  workerId={(me?.workerId as string) || undefined}
                                  workerName={displayName}
                                  autoStart={autoShareTaskId === t.id}
                                  disabled={t.status === 'pending_confirmation' || isRemote(t.taskType || '')}
                                />
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-900/6 pt-3">
                                  <p className="text-xs text-ink-700/70">Something on site not as agreed, or unsafe? Tell us right away.</p>
                                  <button onClick={() => setReportTask(t)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-ink-900/15 px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-900/5">
                                    <AlertTriangle size={12} aria-hidden="true" /> Report an issue
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}) : <Empty text="You haven't accepted any tasks yet." icon={<Check size={20} aria-hidden="true" />} />}
                        </>
                      )}

                      {tab === 'declined' && (declined.length ? declined.map((t) => (
                        <TaskCard key={t.id} task={t}>
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-900/15 px-3 py-1.5 text-xs text-ink-700">
                            <RotateCcw size={13} aria-hidden="true" /> Declined
                          </span>
                        </TaskCard>
                      )) : <Empty text="You haven't declined any offers in this session." icon={<RotateCcw size={20} aria-hidden="true" />} />)}
                    </>
                  )}
                </div>
              </div>
            )}

            {section === 'verification' && (
              <div>
                <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Your verification</h2>
                <p className="px-1 text-sm text-ink-700/70">Your status: <span className="font-semibold text-ink-900">{me?.accountStatus === 'active' ? 'Active' : me?.accountStatus === 'suspended' ? 'Suspended' : 'Under review'}</span></p>
                <div className="mb-8"><VerificationSteps me={me} /></div>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Work experience & certifications</h2>
                <p className="mb-4 px-1 text-sm text-ink-700/70">
                  This is how BeyondX verifies your skills. Certifications you add here can be reviewed and marked verified by our team.
                </p>
                <div className="rounded-2xl bg-white border border-ink-900/8 overflow-hidden">
                  <WorkExperienceCard worker={me} onSaved={(patch) => { session.patchWorker(patch); setMe((m) => ({ ...(m || {}), ...patch })) }} />
                </div>
              </div>
            )}

            {section === 'earnings' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat icon={<Wallet size={18} />} label="Total Earnings" value={cedis(earned)} />
                  <Stat icon={<ClipboardList size={18} />} label="Completed Jobs" value={`${completed}`} />
                </div>
                <div className="space-y-3">
                  {loading ? <Skeleton /> : (history.length ? history.map((t) => {
                    const empReview = t.reviews?.find((r) => r.fromRole === 'employer')
                    const myReview = t.reviews?.find((r) => r.fromRole === 'worker')
                    const rating = empReview?.rating
                    return (
                      <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm border border-ink-900/8 sm:p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="mb-1 inline-block rounded-md bg-ink-900/5 px-2.5 py-0.5 text-xs font-medium text-ink-700">{t.taskType || 'Task'}</span>
                            <h3 className="font-serif text-lg font-medium text-ink-900">{t.description || t.taskType}</h3>
                            <p className="mt-0.5 text-sm text-ink-700">{employerName(t)}{t.location ? ` · ${t.location}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {rating ? (
                              <span className="text-right">
                                <span className="block text-xs text-ink-700">Employer rated you</span>
                                <Stars n={Number(rating)} />
                                {(empReview?.skillsRating || empReview?.professionalismRating) ? (
                                  <span className="block text-xs text-ink-700/70">Skills {empReview?.skillsRating}/5 · Professionalism {empReview?.professionalismRating}/5</span>
                                ) : null}
                              </span>
                            ) : null}
                            {myReview ? (
                              <span className="text-xs text-ink-700/70">You rated them {myReview.rating}/5</span>
                            ) : (
                              <button onClick={() => setRateTask(t)} className="rounded-md border border-ink-900/15 px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-900/5">
                                How was this job?
                              </button>
                            )}
                            <button onClick={() => setFlagTask(t)} className="inline-flex items-center gap-1 text-xs text-ink-700/70 hover:underline">
                              <Flag size={11} aria-hidden="true" /> Report
                            </button>
                            <span className="font-semibold text-ink-900">{cedis(t.pay)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }) : <Empty text="No completed tasks yet." icon={<Star size={20} aria-hidden="true" />} />)}
                </div>
              </div>
            )}

            {section === 'profile' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-2xl border border-ink-900/8 bg-white p-4">
                  <div className="flex items-center gap-3">
                    {photo
                      ? <img src={photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                      : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-cream-50"><UserRound size={20} /></span>}
                    <div>
                      <p className="font-semibold text-ink-900">{displayName}</p>
                      <p className="text-sm text-ink-700/60">{(me?.phone as string) || ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditing(true)}
                    className="shrink-0 rounded-md border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-900/5">
                    Edit profile
                  </button>
                </div>

                <div className="rounded-2xl bg-white border border-ink-900/8 overflow-hidden">
                  <button
                    onClick={() => {
                      const card = document.getElementById('home-area-inline')
                      if (card) card.classList.toggle('hidden')
                    }}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-ink-900/[0.02] transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={15} className="shrink-0 text-forest-600" aria-hidden="true" />
                      <div>
                        <span className="text-sm font-semibold text-ink-900">Home area</span>
                        <span className="ml-2 text-sm text-ink-700/60">
                          {(me?.homeArea as string) || <span className="text-amber-700">Not set</span>}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="shrink-0 text-ink-700/40" />
                  </button>
                  <div id="home-area-inline" className="hidden border-t border-ink-900/6 px-4 pb-4 pt-3">
                    <HomeAreaInline worker={me} onSaved={(patch) => { session.patchWorker(patch); setMe((m) => ({ ...(m || {}), ...patch })) }} />
                  </div>
                </div>

                <CoordinatorApply worker={me} onSaved={(patch) => { session.patchWorker(patch); setMe((m) => ({ ...(m || {}), ...patch })) }} />
              </div>
            )}

            {section === 'support' && (
              <SupportPanel
                role="worker"
                onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
                onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
              />
            )}
          </div>
        </div>
      </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {locationTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="bg-forest-700 px-6 py-5 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cream-50/15">
                <MapPin size={22} aria-hidden="true" className="text-cream-50" />
              </div>
              <h2 className="font-serif text-lg font-semibold text-cream-50">Share your location</h2>
              <p className="mt-1 text-xs text-forest-200/80">{locationTask.taskType}{locationTask.location ? ` · ${locationTask.location}` : ''}</p>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-ink-700">
                BeyondX uses your location to verify you're on-site when you start the job. Your location is only shared with BeyondX — not the employer.
              </p>
              {locationErr && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-red-700">
                  <AlertCircle size={13} aria-hidden="true" /> {locationErr}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setLocationTask(null)}
                  className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doAccept(false)}
                  disabled={locationBusy}
                  className="flex-1 rounded-md bg-forest-600 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {locationBusy ? 'Accepting…' : 'Allow & accept'}
                </button>
              </div>
              <button
                onClick={() => doAccept(true)}
                disabled={locationBusy}
                className="mt-2 w-full text-center text-xs text-ink-700/50 hover:text-ink-900"
              >
                Accept without sharing location
              </button>
            </div>
          </div>
        </div>
      )}

      {reportTask && (
        <ReportModal task={reportTask} onClose={() => setReportTask(null)}
          onSent={() => { setReportTask(null); setToast({ id: Date.now(), kind: 'success', title: 'Report sent', detail: 'Thank you — the BeyondX team will follow up.' }) }} />
      )}
      {rateTask && (
        <RateEmployerModal task={rateTask} onClose={() => setRateTask(null)} onFlag={() => { setFlagTask(rateTask); setRateTask(null) }}
          onDone={() => { setRateTask(null); setToast({ id: Date.now(), kind: 'success', title: 'Feedback saved', detail: 'Thank you — it helps BeyondX match better jobs.' }); load() }} />
      )}
      {flagTask && (
        <FlagModal task={flagTask} side="xpert" token={session.workerToken()} onClose={() => setFlagTask(null)}
          onDone={() => { setFlagTask(null); setToast({ id: Date.now(), kind: 'success', title: 'Report sent', detail: 'BeyondX will review it privately and follow up.' }) }} />
      )}
      {confirmDeclineTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle size={22} aria-hidden="true" className="text-red-600" />
            </div>
            <h2 className="font-serif text-lg font-medium text-ink-900">Decline this offer?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              You're about to decline the <span className="font-semibold">{confirmDeclineTask.taskType}</span> offer
              {confirmDeclineTask.location ? ` in ${confirmDeclineTask.location}` : ''}. 
              This cannot be undone — the offer will be closed and the employer will be notified immediately.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDeclineTask(null)}
                className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5"
              >
                Keep offer
              </button>
              <button
                onClick={() => doDecline(confirmDeclineTask)}
                disabled={busyId === confirmDeclineTask.id}
                className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {busyId === confirmDeclineTask.id ? 'Declining…' : 'Yes, decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ProfileModal
          role="WORKER"
          initial={profile}
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            setEditing(false)
            try {
              const skills = p.skills ? p.skills.split(',').map((x) => x.trim()).filter(Boolean) : []
              const photoUrl = p.avatar && /^https?:\/\//.test(p.avatar) ? p.avatar : undefined
              const patch: Record<string, unknown> = { skills, bio: p.bio }
              if (photoUrl && photoUrl !== me?.photoUrl) patch.photoUrl = photoUrl
              if (p.hasTools !== undefined) patch.hasTools = p.hasTools
              await workersApi.updateMe(patch)
              session.patchWorker(patch)
              setMe((m) => ({ ...(m || {}), ...patch }))
              setToast({ id: Date.now(), kind: 'success', title: 'Profile updated', detail: 'Employers will now see your latest skills.' })
            } catch (e) {
              setToast({ id: Date.now(), kind: 'info', title: 'Could not save profile', detail: e instanceof ApiError ? e.message : 'Please try again.' })
            }
          }}
        />
      )}
    </div>
  )
}
