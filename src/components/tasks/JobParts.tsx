import { useEffect, useState } from 'react'
import { BadgeCheck, Flag, RefreshCw, Repeat, Star, X } from 'lucide-react'
import { tasks as tasksApi, ApiError, scheduleLabel, type AssignedXpert, type Task } from '../../lib/api'

export function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

export function StarPicker({ value, onChange, label, size = 26 }: { value: number; onChange: (n: number) => void; label: string; size?: number }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)} className="rounded transition-transform focus:outline-none focus:ring-2 focus:ring-forest-600/40 active:scale-90">
          <Star size={size} aria-hidden="true" className={i <= value ? 'fill-forest-600 text-forest-600' : 'text-ink-900/20 hover:text-forest-600/40'} />
        </button>
      ))}
    </div>
  )
}

/** A labelled 1–5 question used by both feedback forms. */
export function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium text-ink-800">{label}</span>
      <StarPicker value={value} onChange={onChange} label={label} size={22} />
    </div>
  )
}

/** Live job steps the employer sees once an Xpert is on the job. */
export function LiveJobSteps({ task }: { task: Task }) {
  const status = String(task.status)
  const steps = [
    { label: 'Xperts confirmed', done: ['accepted', 'pending_confirmation', 'employer_confirmed', 'completed'].includes(status) },
    { label: 'Arrived', done: !!task.arrivedAt || ['pending_confirmation', 'employer_confirmed', 'completed'].includes(status) },
    { label: 'Work in progress', done: !!task.startedAt || ['pending_confirmation', 'employer_confirmed', 'completed'].includes(status) },
    { label: 'Completion pending', done: ['pending_confirmation', 'employer_confirmed', 'completed'].includes(status) },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Job progress">
      {steps.map((s, i) => (
        <li key={s.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
          s.done ? 'border-forest-600/30 bg-white text-forest-700' : i === current ? 'border-ink-900/20 bg-white text-ink-900' : 'border-ink-900/10 bg-gray-50 text-ink-700/50'
        }`}>
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] ${s.done ? 'bg-forest-600 text-white' : 'border border-ink-900/20'}`}>{s.done ? '✓' : ''}</span>
          {s.label}
        </li>
      ))}
    </ol>
  )
}

/** Messages that replace the Xpert details when BeyondX is handling things. */
export function JobNotices({ task }: { task: Task }) {
  return (
    <>
      {task.replacementInProgress && ['offered', 'open', 'expired'].includes(String(task.status)) && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <RefreshCw size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> BeyondX is arranging a replacement.
        </p>
      )}
      {task.recurrence === 'recurring' && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-ink-700">
          <Repeat size={15} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />
          <span>{scheduleLabel(task.schedulePattern)}{task.schedulePattern ? ' · ' : ''}Your usual team will be prioritized whenever available. If they cannot make it, we will arrange a replacement.</span>
        </p>
      )}
    </>
  )
}

/** The assigned Xpert as the employer sees them: name, relevant skill,
 *  experience, verification and relevant past work. No contact details. */
export function XpertSummary({ xpert, taskType }: { xpert?: AssignedXpert | null; taskType?: string }) {
  if (!xpert?.fullName) return null
  const skill = xpert.skills?.find((s) => s === taskType) || xpert.skills?.[0]
  const rating = Number(xpert.rating || 0)
  return (
    <div className="mt-3 rounded-lg border border-ink-900/10 bg-gray-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-ink-900">{xpert.fullName}</span>
        {xpert.verified && <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-700"><BadgeCheck size={14} aria-hidden="true" /> Verified by BeyondX</span>}
        {rating > 0 && <span className="text-xs text-ink-700">★ {rating.toFixed(1)}</span>}
      </div>
      <p className="mt-1 text-xs text-ink-700">
        {[skill, typeof xpert.relevantJobs === 'number' ? `${xpert.relevantJobs} similar job${xpert.relevantJobs === 1 ? '' : 's'} through BeyondX` : null].filter(Boolean).join(' · ')}
      </p>
      {xpert.experienceSummary && <p className="mt-1 line-clamp-2 text-xs text-ink-700/80">{xpert.experienceSummary}</p>}
    </div>
  )
}

const FLAG_CATEGORIES = {
  employer: ['No-show or late arrival', 'Poor quality work', 'Unprofessional conduct', 'Safety issue', 'Damage or loss', 'Other'],
  xpert: ['More work than agreed', 'Unsafe conditions', 'Payment problem', 'Mistreatment or harassment', 'Other'],
}

/** Raise a flag about a specific incident on a job. Not for general low
 *  ratings — it needs what happened and when. */
export function FlagModal({ task, side, token, onClose, onDone }: {
  task: Task; side: 'employer' | 'xpert'; token: string | null; onClose: () => void; onDone: () => void
}) {
  useEsc(onClose)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(String(task.scheduledDate || new Date().toISOString().slice(0, 10)))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ok = !!category && description.trim().length >= 10 && !!date
  const submit = async () => {
    if (!ok || busy) return
    setBusy(true); setErr(null)
    try { await tasksApi.flag(task.id, { category, incidentDescription: description.trim(), incidentDate: date }, token); onDone() }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send. Please try again.'); setBusy(false) }
  }
  const inp = 'w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="flag-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="flag-title" className="flex items-center gap-2 text-lg font-semibold text-ink-900"><Flag size={18} aria-hidden="true" /> Report an incident</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-700 hover:bg-ink-900/5"><X size={18} /></button>
        </div>
        <p className="mt-1 text-sm text-ink-700/80">Tell BeyondX exactly what happened on “{task.taskType}”. Our team reviews every report privately.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-ink-800">What is it about?
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inp} mt-1`}>
              <option value="" disabled>Choose one</option>
              {FLAG_CATEGORIES[side].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink-800">What happened?
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${inp} mt-1 resize-y`}
              placeholder="Describe the incident: what happened, who was involved, and anything you did about it." />
          </label>
          <label className="block text-sm font-medium text-ink-800">When did it happen?
            <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={`${inp} mt-1`} />
          </label>
        </div>
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5">Cancel</button>
          <button onClick={submit} disabled={!ok || busy} className="flex-1 rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
            {busy ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </div>
    </div>
  )
}
