import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { MapPin, Calendar, Check, Star, RotateCcw, RefreshCw, AlertCircle, Camera, Plus, Trash2, Phone, AlertTriangle, ChevronRight, Map, ClipboardList, Wallet, Bus, Clock, Users, CheckCircle2, Loader2 } from 'lucide-react'
import JobLocationMap from '../components/JobLocationMap'
import DashboardHeader from './DashboardHeader'
import ReferralCard from '../components/ReferralCard'
import ProfileModal, { type Profile } from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LocationShare from '../components/LocationShare'
import { tasks as tasksApi, workers as workersApi, media, contact, session, ApiError, type Task, type Worker } from '../lib/api'
import { isRemote } from '../data'

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
      {err && <p className="mt-1 text-[11px] text-red-700">{err}</p>}
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

  const inp = 'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'

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
              <div key={e.id} className="rounded-xl border border-ink-900/10 bg-cream-100/60 p-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Role / Job title</label>
                    <input value={e.role} onChange={(ev) => updateExp(e.id, 'role', ev.target.value)}
                      placeholder="e.g. Farm labourer" className={inp} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Employer / Location</label>
                    <input value={e.employer} onChange={(ev) => updateExp(e.id, 'employer', ev.target.value)}
                      placeholder="e.g. Kofi Farms, Tema" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">How long</label>
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
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-forest-700"><Check size={11} aria-hidden="true" /> Photo saved — visible only to BeyondX</p>
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
              <div key={c.id} className="rounded-xl border border-ink-900/10 bg-cream-100/60 p-4 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Certification name</label>
                    <input value={c.name} onChange={(ev) => updateCert(c.id, 'name', ev.target.value)}
                      placeholder="e.g. Pesticide Safety Certificate" className={inp} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Issued by</label>
                    <input value={c.issuedBy} onChange={(ev) => updateCert(c.id, 'issuedBy', ev.target.value)}
                      placeholder="e.g. Ghana EPA" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Year obtained</label>
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
                      <p className="mt-1 text-[11px] text-forest-700">
                        <span className="flex items-center gap-1"><Check size={11} aria-hidden="true" /> Image attached — shown to employers after BeyondX review</span>
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.verified ? 'bg-forest-600/10 text-forest-700' : 'bg-ink-900/8 text-ink-700/70'}`}>
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
            className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
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

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream-50 p-4 shadow-sm border border-ink-900/8">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-600/10 text-forest-600">{icon}</span>
      <span>
        <span className="block text-lg font-semibold text-ink-900">{value}</span>
        <span className="block text-xs text-ink-700">{label}</span>
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-cream-50 p-5 shadow-sm border border-ink-900/8">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
        </div>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-ink-900/15 p-10 text-center text-sm text-ink-700">{text}</div>
}

function TaskCard({ task, children }: { task: Task; children?: ReactNode }) {
  const empPhone = typeof task.employer === 'object' ? (task.employer as Record<string, unknown>)?.phone as string | undefined : undefined
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
    <div className={`overflow-hidden rounded-2xl bg-white border ${isOffer ? 'border-forest-600/25' : 'border-ink-900/8'} shadow-sm`}>

      {/* Offer / intercity banner */}
      {isOffer && (
        <div className="flex items-center gap-2 bg-forest-600 px-4 py-2">
          <span className="flex h-1.5 w-1.5 rounded-[9999px] bg-cream-50 animate-pulse" aria-hidden="true" />
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
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-forest-700">{cedis(task.pay)}</p>
            {transportAmt > 0 && (
              <p className="mt-0.5 text-[11px] text-ink-700/50">+ GH₵{transportAmt} transport</p>
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

        {/* Map */}
        {showMap && task.location && task.location !== 'Remote' && (
          <div className="mt-3">
            <JobLocationMap location={task.location as string} heightClass="h-44" showOpenLink />
          </div>
        )}

        {/* Transport notice */}
        {isOffer && transportAmt > 0 && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${isIntercityJob ? 'bg-red-50 text-red-800' : 'bg-forest-600/6 text-forest-800'}`}>
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
  const [tab, setTab] = useState<'available' | 'mine' | 'declined' | 'history' | 'support'>('available')
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

    const performAccept = async (lat?: number, lng?: number) => {
      const t = locationTask
      setBusyId(t.id)
      try {
        if (t.status === 'offered') {
          await tasksApi.acceptOffer(t.id)
        } else {
          await tasksApi.accept(t.id)
        }
        if (lat !== undefined && lng !== undefined) {
          tasksApi.updateLocation?.(t.id, lat, lng).catch(() => null)
        }
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
      async (pos) => {
        await performAccept(pos.coords.latitude, pos.coords.longitude)
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
          `Action needed: Contact the employer to ask whether they want a replacement worker or a refund of their payment.`,
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
  const displayName = (me?.fullName as string) || (me?.name as string) || 'Worker'
  const photo = (me?.photoUrl as string) || undefined
  const completed = history.length
  const earned = history.reduce((sum, t) => sum + Number(t.pay || 0), 0)

  const profile: Profile = {
    avatar: photo,
    name: displayName,
    phone: (me?.phone as string) || '',
    experience: '',
    skills: Array.isArray(me?.skills) ? (me?.skills as string[]).join(', ') : '',
    bio: '',
    hasTools: 'hasTools' in (me || {}) ? Boolean((me as Record<string,unknown>)?.hasTools) : undefined,
  }

  const tabs = [
    { id: 'available', label: `Available (${available.length})` },
    { id: 'mine', label: `My Tasks (${mine.length})` },
    { id: 'declined', label: `Declined (${declined.length})` },
    { id: 'history', label: `History (${history.length})` },
    { id: 'support', label: 'Support' },
  ] as const

  return (
    <div className="min-h-screen bg-cream-100">
      <DashboardHeader role="WORKER" title="Worker Dashboard" name={displayName} avatar={photo} onEditProfile={() => setEditing(true)} tasks={[...offers, ...mine, ...history]} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <p aria-live="polite" className="sr-only">{announce}</p>

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}
            </p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat icon={<Star size={20} className="text-forest-600" />} label="Your rating" value={me?.rating && Number(me.rating) > 0 ? `${Number(me.rating).toFixed(1)} / 5` : '—'} />
          <Stat icon={<ClipboardList size={20} className="text-forest-600" />} label="Tasks completed" value={`${completed}`} />
          <Stat icon={<Wallet size={20} className="text-forest-600" />} label="Total earned" value={cedis(earned)} />
        </div>

        <ReferralCard code={(me?.workerId as string) || 'BX-—'} referrals={0} />

        {/* Profile completion card — single unified section, no stacked boxes */}
        <div className="rounded-2xl bg-cream-50 border border-ink-900/8 overflow-hidden">
          {/* Home area row */}
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

          {/* Experience row */}
          <div className="border-t border-ink-900/6 outline-none">
            <WorkExperienceCard worker={me} onSaved={(patch) => { session.patchWorker(patch); setMe((m) => ({ ...(m || {}), ...patch })) }} />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 overflow-x-auto border-b border-ink-900/10 pb-px" role="tablist" aria-label="Worker sections">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${tab === t.id ? 'border-forest-600 text-forest-700' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); load() }} aria-label="Refresh tasks"
            className="ml-auto flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-ink-700/60 hover:text-ink-900 transition-colors">
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>

        {tab === 'support' && (
          <SupportPanel
            role="worker"
            onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
            onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
          />
        )}

        <div className="mt-6 space-y-3">
          {tab === 'support' ? null : loading ? <Skeleton /> : (
            <>
              {tab === 'available' && (available.length ? available.map((t) => (
                <TaskCard key={t.id} task={t}>
                  {t.status === 'offered' ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => declineOffer(t)} disabled={busyId === t.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5 disabled:opacity-60">
                        Decline
                      </button>
                      <button onClick={() => acceptOffer(t)} disabled={busyId === t.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-forest-600 px-5 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                        <Check size={15} aria-hidden="true" /> {busyId === t.id ? 'Accepting…' : 'Accept offer'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => acceptOpen(t)} disabled={busyId === t.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-forest-600 px-5 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                      <Check size={15} aria-hidden="true" /> {busyId === t.id ? 'Accepting…' : 'Accept'}
                    </button>
                  )}
                </TaskCard>
              )) : <Empty text="No jobs available right now. Check back soon." />)}

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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Verifying payment
                          </span>
                        ) : t.status === 'pending_confirmation' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/8 px-3 py-1.5 text-xs font-semibold text-ink-700">
                            <CheckCircle2 size={12} aria-hidden="true" className="text-forest-600" /> Awaiting confirmation
                          </span>
                        ) : canMarkDone ? (
                          <button onClick={() => markDone(t)} disabled={busyId === t.id} aria-label={`Mark ${t.taskType || 'task'} complete`}
                            className="shrink-0 rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                            {busyId === t.id ? 'Saving…' : 'Mark complete'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1.5 text-xs font-medium text-ink-700/60">
                            <Clock size={11} aria-hidden="true" /> Available on {new Date(scheduledDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </TaskCard>
                      <div className="-mt-1 rounded-b-xl bg-cream-50 px-4 pb-4 shadow-sm border border-ink-900/8 sm:px-5">
                        <LocationShare
                          taskId={t.id}
                          workerId={(me?.workerId as string) || undefined}
                          workerName={displayName}
                          autoStart={autoShareTaskId === t.id}
                          disabled={t.status === 'pending_confirmation' || isRemote(t.taskType || '')}
                        />
                      </div>
                    </div>
                  )}) : <Empty text="You haven't accepted any tasks yet." />}
                </>
              )}

              {tab === 'declined' && (declined.length ? declined.map((t) => (
                <TaskCard key={t.id} task={t}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1.5 text-xs text-ink-700">
                    <RotateCcw size={13} aria-hidden="true" /> Declined
                  </span>
                </TaskCard>
              )) : <Empty text="You haven't declined any offers in this session." />)}

              {tab === 'history' && (history.length ? history.map((t) => {
                const rating = t.reviews?.[0]?.rating
                return (
                  <div key={t.id} className="rounded-xl bg-cream-50 p-4 shadow-sm border border-ink-900/8 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="mb-1 inline-block rounded-full bg-ink-900/5 px-2.5 py-0.5 text-xs font-medium text-ink-700">{t.taskType || 'Task'}</span>
                        <h3 className="font-serif text-lg font-medium text-ink-900">{t.description || t.taskType}</h3>
                        <p className="mt-0.5 text-sm text-ink-700">{employerName(t)}{t.location ? ` · ${t.location}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {rating ? (
                          <span className="text-right">
                            <span className="block text-xs text-ink-700">Employer rated you</span>
                            <Stars n={Number(rating)} />
                          </span>
                        ) : null}
                        <span className="font-semibold text-ink-900">{cedis(t.pay)}</span>
                      </div>
                    </div>
                  </div>
                )
              }) : <Empty text="No completed tasks yet." />)}
            </>
          )}
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {locationTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-cream-50 shadow-xl overflow-hidden">
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
                  className="flex-1 rounded-full border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doAccept(false)}
                  disabled={locationBusy}
                  className="flex-1 rounded-full bg-forest-600 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60"
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

      {confirmDeclineTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-cream-50 p-6 shadow-xl">
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
                className="flex-1 rounded-full border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5"
              >
                Keep offer
              </button>
              <button
                onClick={() => doDecline(confirmDeclineTask)}
                disabled={busyId === confirmDeclineTask.id}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
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
              const patch: Record<string, unknown> = { skills }
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
