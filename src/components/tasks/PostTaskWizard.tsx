import { useState, type ReactNode } from 'react'
import { Check, ChevronRight, MessageCircle, Phone } from 'lucide-react'
import { tasks as tasksApi, ApiError, type Task } from '../../lib/api'
import { categories, remoteCategories, allCategories } from '../../data'
import { REMOTE_JOBS_ENABLED } from '../../lib/config'
import { PLATFORM_FEE_FLAT, BEYONDX_PHONE } from '../../lib/payments'

const cedis = (n: number) => `GH₵ ${Number(n || 0).toLocaleString()}`
const STEPS = ['Task Details', 'Location & Time', 'Additional Info', 'Review & Submit'] as const
const DURATIONS = ['Half Day', '1 Day', '2 Days', '3 Days', '5 Days']

export interface SubmittedTask {
  task: Task
  summary: { taskType: string; location: string; duration: string; workersNeeded: number; scheduledDate?: string; scheduledTime?: string; total: number }
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-700/60">{hint}</span>}
    </label>
  )
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-sm text-ink-700/65">{label}</dt>
      <dd className="text-sm font-medium text-ink-900 whitespace-pre-line">{value}</dd>
    </div>
  )
}

export default function PostTaskWizard({ onSubmitted, onContactSupport, onBack }: {
  onSubmitted: (s: SubmittedTask) => void
  onContactSupport: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState(0)
  const [taskType, setTaskType] = useState('')
  const [description, setDescription] = useState('')
  const [workersNeeded, setWorkersNeeded] = useState('')
  const [duration, setDuration] = useState('')
  const [location, setLocation] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('08:00')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cat = allCategories.find((c) => c.title === taskType)
  const isRemote = cat?.mode === 'remote'
  const workers = parseInt(workersNeeded, 10) || 1
  const days = duration === 'Half Day' ? 0.5 : parseFloat(duration) || 1
  const workerGets = (cat ? cat.rate : 0) * days
  const perWorker = workerGets + PLATFORM_FEE_FLAT
  const total = perWorker * workers
  const today = new Date().toISOString().split('T')[0]

  const stepValid = [
    !!taskType && description.trim().length > 0 && !!workersNeeded && !!duration,
    isRemote || location.trim().length > 0,
    true,
    true,
  ]

  const next = () => { if (stepValid[step]) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const submit = async () => {
    if (busy) return
    setErr(null); setBusy(true)
    const loc = isRemote ? 'Remote' : location.trim()
    const fullDescription = notes.trim() ? `${description.trim()}\n\nAdditional info: ${notes.trim()}` : description.trim()
    try {
      const res = await tasksApi.create({
        taskType, description: fullDescription, location: loc,
        duration, pay: workerGets, workersNeeded: workers,
        ...(scheduledDate ? { scheduledDate, scheduledTime } : {}),
      })
      onSubmitted({
        task: res?.task || { id: '—', taskType, status: 'open' },
        summary: { taskType, location: loc, duration, workersNeeded: workers, scheduledDate: scheduledDate || undefined, scheduledTime: scheduledDate ? scheduledTime : undefined, total },
      })
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not post your task. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded-lg border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-700/45 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25'
  const scheduleLabel = scheduledDate
    ? new Date(`${scheduledDate}T${scheduledTime}:00`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Flexible — as soon as a worker is available'

  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-700/70">
        <button onClick={onBack} className="hover:text-ink-900 hover:underline">Dashboard</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="font-medium text-ink-900">Post a Task</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-ink-900">Post a Task</h1>
      <p className="mt-1.5 text-sm text-ink-700/75">Tell us what you need. We'll match you with the right verified workers.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {/* Stepper — numbered circles with inline labels */}
          <ol className="flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Progress">
            {STEPS.map((label, i) => {
              const done = i < step
              const active = i === step
              return (
                <li key={label} className="flex items-center gap-2.5" aria-current={active ? 'step' : undefined}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    active ? 'bg-ink-900 text-cream-50' : done ? 'bg-forest-600 text-cream-50' : 'bg-ink-900/10 text-ink-700/60'
                  }`}>
                    {done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={`text-sm ${active ? 'font-semibold text-ink-900' : done ? 'font-medium text-ink-800' : 'text-ink-700/60'} ${active ? '' : 'hidden sm:inline'}`}>{label}</span>
                </li>
              )
            })}
          </ol>

          {/* Step card */}
          <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-ink-900">{STEPS[step]}</h2>

            <div className="mt-6 space-y-5">
              {step === 0 && (
                <>
                  <Field label="Task category" required>
                    <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inp}>
                      <option value="" disabled>Select a category</option>
                      {REMOTE_JOBS_ENABLED ? (<>
                        <optgroup label="On the field">{categories.map((c) => <option key={c.title}>{c.title}</option>)}</optgroup>
                        <optgroup label="Remote">{remoteCategories.map((c) => <option key={c.title}>{c.title}</option>)}</optgroup>
                      </>) : categories.map((c) => <option key={c.title}>{c.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Task description" required>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                      placeholder="Describe the work that needs to be done…" className={`${inp} resize-y`} />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Number of workers required" required>
                      <select value={workersNeeded} onChange={(e) => setWorkersNeeded(e.target.value)} className={inp}>
                        <option value="" disabled>Select number</option>
                        {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n} worker{n > 1 ? 's' : ''}</option>)}
                      </select>
                    </Field>
                    <Field label="Expected duration" required>
                      <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inp}>
                        <option value="" disabled>Select duration</option>
                        {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {isRemote ? (
                    <p className="rounded-lg bg-forest-600/5 px-4 py-3 text-sm text-ink-800">This is remote work — no site location needed.</p>
                  ) : (
                    <Field label="Location" required hint="Area, landmark or full address in Greater Accra.">
                      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. East Legon, near A&C Mall" className={inp} />
                    </Field>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Date" hint="Leave empty if the start date is flexible.">
                      <input type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inp} />
                    </Field>
                    <Field label="Start time" hint="Workers get a reminder one hour before.">
                      <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={inp} disabled={!scheduledDate} />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Anything else the workers should know?" hint="Access instructions, tools on site, who to ask for — optional.">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Ask for Ama at the front desk. Cleaning supplies are provided." className={`${inp} resize-y`} />
                  </Field>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-ink-800">Estimated cost</p>
                    <div className="rounded-lg border border-ink-900/10 px-4 py-3.5 text-sm text-ink-700">
                      <div className="flex justify-between py-0.5"><span>Worker pay ({duration})</span><span>{cedis(workerGets)}</span></div>
                      <div className="flex justify-between py-0.5"><span>BeyondX service fee</span><span>{cedis(PLATFORM_FEE_FLAT)}</span></div>
                      <div className="mt-1 flex justify-between border-t border-ink-900/10 pt-2 font-semibold text-ink-900"><span>Per worker</span><span>{cedis(perWorker)}</span></div>
                      {workers > 1 && <div className="flex justify-between py-0.5 font-semibold text-forest-700"><span>Total for {workers} workers</span><span>{cedis(total)}</span></div>}
                      <p className="mt-2 text-xs text-ink-700/60">A transport allowance of GH₵0–40 per worker may be added based on distance.</p>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <dl className="divide-y divide-ink-900/8">
                  <ReviewRow label="Task category" value={taskType} />
                  <ReviewRow label="Task description" value={notes.trim() ? `${description.trim()}\n\nAdditional info: ${notes.trim()}` : description.trim()} />
                  <ReviewRow label="Location" value={isRemote ? 'Remote' : location} />
                  <ReviewRow label="Date & start time" value={scheduleLabel} />
                  <ReviewRow label="Expected duration" value={duration} />
                  <ReviewRow label="Number of workers" value={workers} />
                  <ReviewRow label="Estimated total" value={<span className="text-forest-700">{cedis(total)}</span>} />
                </dl>
              )}
            </div>

            {err && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{err}</p>}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button onClick={back} className="rounded-lg border border-ink-900/15 px-6 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-900/5">Back</button>
              ) : <span />}
              {step < STEPS.length - 1 ? (
                <button onClick={next} disabled={!stepValid[step]}
                  className="rounded-lg bg-ink-900 px-8 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-800 disabled:opacity-40">
                  Next
                </button>
              ) : (
                <button onClick={submit} disabled={busy}
                  className="rounded-lg bg-ink-900 px-8 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-800 disabled:opacity-60">
                  {busy ? 'Submitting…' : 'Submit Task'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Need help? */}
        <aside className="h-fit rounded-2xl border border-forest-600/15 bg-forest-600/5 p-6 lg:mt-14">
          <h2 className="text-base font-semibold text-ink-900">Need help?</h2>
          <p className="mt-1.5 text-sm text-ink-700/80">Our team is here to assist you in creating the right task.</p>
          <div className="mt-5 space-y-4">
            <a href={`tel:${BEYONDX_PHONE.replace(/\s/g, '')}`} className="flex items-start gap-3 text-sm">
              <Phone size={17} className="mt-0.5 shrink-0 text-ink-900" aria-hidden="true" />
              <span><span className="block text-ink-700/70">Call us</span><span className="font-medium text-ink-900">{BEYONDX_PHONE}</span></span>
            </a>
            <button onClick={onContactSupport} className="flex items-start gap-3 text-left text-sm">
              <MessageCircle size={17} className="mt-0.5 shrink-0 text-ink-900" aria-hidden="true" />
              <span><span className="block text-ink-700/70">Message us</span><span className="font-medium text-forest-700 hover:underline">Contact support</span></span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
