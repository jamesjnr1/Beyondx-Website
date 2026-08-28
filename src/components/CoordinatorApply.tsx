// src/components/CoordinatorApply.tsx
//
// Worker-dashboard card: apply to become a Coordinator, or see the status of
// an existing application. BeyondX reviews applications manually — this only
// records the request (see src/lib/coordinator.ts for how/where it's stored).

import { useState } from 'react'
import { Users, ChevronRight, Clock, X, CheckCircle2 } from 'lucide-react'
import { workers as workersApi, type Worker } from '../lib/api'
import {
  ALL_CATEGORY_TITLES, getApplication, type CoordinatorApplication,
} from '../lib/coordinator'

const inp =
  'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'

function ApplyModal({
  onClose, onSubmitted,
}: {
  onClose: () => void
  onSubmitted: (patch: Record<string, unknown>) => void
}) {
  const [businessName, setBusinessName] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [teamSize, setTeamSize] = useState('')
  const [years, setYears] = useState('')
  const [samples, setSamples] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggle = (title: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })

  const valid = picked.size > 0 && teamSize.trim() && years.trim() && samples.trim().length >= 10

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr(null)
    const application: CoordinatorApplication = {
      businessName: businessName.trim() || undefined,
      categories: Array.from(picked),
      teamSize: Math.max(1, parseInt(teamSize, 10) || 1),
      yearsOperating: Math.max(0, parseInt(years, 10) || 0),
      samplePastJobs: samples.trim(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }
    try {
      const patch = { coordinatorApplication: JSON.stringify(application) }
      await workersApi.updateMe(patch)
      onSubmitted(patch)
      onClose()
    } catch {
      setErr('Could not submit your application. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="coord-apply-title"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-900/8 px-5 py-4">
          <h2 id="coord-apply-title" className="font-serif text-lg font-medium text-ink-900">Apply to become a Coordinator</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-700/60 hover:bg-ink-900/5"><X size={18} /></button>
        </div>

        <div className="nice-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-ink-700/70">
            Coordinators lead a small team, take on multi-worker jobs, and handle scope and
            assignment for their team. BeyondX reviews every application and sets final pricing
            on team jobs. This usually takes a few days.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Business name (optional)</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Kofi & Sons Cleaning" className={inp} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Categories your team covers</label>
            <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-ink-900/10 bg-white p-2 sm:grid-cols-2">
              {ALL_CATEGORY_TITLES.map((title) => (
                <label key={title} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink-800 hover:bg-ink-900/5">
                  <input type="checkbox" checked={picked.has(title)} onChange={() => toggle(title)}
                    className="h-3.5 w-3.5 rounded border-ink-900/30 text-forest-600 focus:ring-forest-600/30" />
                  {title}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Team size</label>
              <input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} placeholder="e.g. 5" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Years operating</label>
              <input type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} placeholder="e.g. 2" className={inp} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Sample past jobs</label>
            <textarea value={samples} onChange={(e) => setSamples(e.target.value)} rows={4}
              placeholder="A few examples of jobs your team has done — client, scope, team size used…"
              className={inp} />
          </div>

          {err && <p className="text-xs text-red-700">{err}</p>}
        </div>

        <div className="shrink-0 border-t border-ink-900/8 p-4">
          <button onClick={submit} disabled={!valid || busy}
            className="w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-500 disabled:opacity-50">
            {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoordinatorApply({
  worker, onSaved,
}: {
  worker: Worker | null
  onSaved: (patch: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const application = getApplication(worker)

  if (application?.status === 'pending') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <Clock size={18} className="shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Coordinator application — Pending Review</p>
          <p className="mt-0.5 text-xs text-ink-700/70">
            Submitted {new Date(application.submittedAt).toLocaleDateString()} · {application.categories.join(', ')}
          </p>
        </div>
      </div>
    )
  }

  if (application?.status === 'denied') {
    return (
      <>
        <button onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-ink-900/8 bg-cream-50 px-4 py-3.5 text-left hover:bg-ink-900/[0.02]">
          <Users size={18} className="shrink-0 text-ink-700/60" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">Coordinator application not approved</p>
            <p className="mt-0.5 text-xs text-ink-700/60">{application.reviewNote || 'You can apply again anytime.'}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-700/40" />
        </button>
        {open && <ApplyModal onClose={() => setOpen(false)} onSubmitted={onSaved} />}
      </>
    )
  }

  if (application?.status === 'approved') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-forest-600/20 bg-forest-600/5 px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 text-forest-700" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink-900">You're an approved Coordinator</p>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-ink-900/8 bg-cream-50 px-4 py-3.5 text-left hover:bg-ink-900/[0.02]">
        <Users size={18} className="shrink-0 text-forest-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Apply to become a Coordinator</p>
          <p className="mt-0.5 text-xs text-ink-700/60">Lead a team, take on multi-worker jobs</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-ink-700/40" />
      </button>
      {open && <ApplyModal onClose={() => setOpen(false)} onSubmitted={onSaved} />}
    </>
  )
}
