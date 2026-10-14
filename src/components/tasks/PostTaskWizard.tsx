import { useState, type ReactNode } from 'react'
import { AlertTriangle, Check, ChevronRight, MessageCircle, Phone, Zap } from 'lucide-react'
import { tasks as tasksApi, ApiError, type Task } from '../../lib/api'
import { categories, remoteCategories, allCategories } from '../../data'
import { REMOTE_JOBS_ENABLED } from '../../lib/config'
import { BEYONDX_PHONE } from '../../lib/payments'

const STEPS = ['Task Details', 'Location & Time', 'Additional Info', 'Review & Submit'] as const
const PREMIUM_WINDOW_HOURS = 48

export interface SubmittedTask {
  task: Task
  summary: { taskType: string; location: string; duration: string; workersNeeded: number; scheduledDate?: string; scheduledTime?: string; premium: boolean }
}

/** Jobs starting within 48 hours of posting are premium (charged extra);
 *  anything later is standard pricing. */
export function isPremiumStart(date: string, time: string, now = new Date()) {
  if (!date) return false
  const start = new Date(`${date}T${time || '08:00'}:00`)
  return start.getTime() - now.getTime() <= PREMIUM_WINDOW_HOURS * 3600 * 1000
}

function SurchargeNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        Describe the task fully and accurately. If more work is expected on site than you described,
        a surcharge of <strong>at least 25%</strong> applies, and it can increase depending on how much additional work is needed.
      </p>
    </div>
  )
}

function PricingNotice({ premium }: { premium: boolean }) {
  return premium ? (
    <div className="flex items-start gap-3 rounded-lg border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-800">
      <Zap size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <p><strong>Premium job.</strong> This job starts within 48 hours, so premium pricing applies and your invoice will include an extra charge.</p>
    </div>
  ) : (
    <div className="rounded-lg border border-ink-900/10 bg-gray-50 px-4 py-3 text-sm text-ink-700">
      <strong className="text-ink-900">Standard pricing.</strong> Jobs starting more than 48 hours from now are charged at the standard rate. Need it sooner? Jobs within 48 hours are premium and cost extra.
    </div>
  )
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
  const [hours, setHours] = useState('')
  const [location, setLocation] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('08:00')
  const [notes, setNotes] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cat = allCategories.find((c) => c.title === taskType)
  const isRemote = cat?.mode === 'remote'
  const workers = parseInt(workersNeeded, 10)
  const durationHours = parseFloat(hours)
  const duration = durationHours > 0 ? `${durationHours} hour${durationHours === 1 ? '' : 's'}` : ''
  const premium = isPremiumStart(scheduledDate, scheduledTime)
  const today = new Date().toISOString().split('T')[0]

  const stepValid = [
    !!taskType && description.trim().length > 0 && workers >= 1 && workers <= 100 && durationHours > 0 && durationHours <= 1000,
    (isRemote || location.trim().length > 0) && !!scheduledDate && !!scheduledTime,
    true,
    agreed,
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
        duration, durationHours, pay: 0, workersNeeded: workers,
        scheduledDate, scheduledTime, premium,
      })
      onSubmitted({
        task: res?.task || { id: '—', taskType, status: 'awaiting_invoice' },
        summary: { taskType, location: loc, duration, workersNeeded: workers, scheduledDate, scheduledTime, premium },
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
    : '—'

  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-700/70">
        <button onClick={onBack} className="hover:text-ink-900 hover:underline">Dashboard</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="font-medium text-ink-900">Post a Task</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-ink-900">Post a Task</h1>
      <p className="mt-1.5 text-sm text-ink-700/75">Tell us what you need. BeyondX reviews your task, sends you an invoice, and matches the right verified Xperts once it's paid.</p>

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
                    active ? 'border-2 border-forest-600 bg-white text-forest-700' : done ? 'bg-forest-600 text-cream-50' : 'border border-ink-900/15 bg-white text-ink-700/50'
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
                  <Field label="Task description" required hint="Be as detailed as you can — BeyondX prices your invoice and matches Xperts from what you write.">
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                      placeholder="e.g. Deep clean of a 3-bedroom office (about 120 m²): sweep and mop all floors, clean 12 windows inside and out, scrub 2 washrooms. Cleaning supplies provided."
                      className={`${inp} resize-y`} />
                  </Field>
                  <SurchargeNotice />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Number of Xperts needed" required>
                      <input type="number" inputMode="numeric" min={1} max={100} step={1} value={workersNeeded}
                        onChange={(e) => setWorkersNeeded(e.target.value)} placeholder="e.g. 2" className={inp} />
                    </Field>
                    <Field label="Expected duration (hours)" required hint="Total working hours, e.g. 4 for half a day, 8 for a full day.">
                      <input type="number" inputMode="decimal" min={0.5} max={1000} step={0.5} value={hours}
                        onChange={(e) => setHours(e.target.value)} placeholder="e.g. 6" className={inp} />
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {isRemote ? (
                    <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-ink-800">This is remote work — no site location needed.</p>
                  ) : (
                    <Field label="Location" required hint="Area, landmark or full address in Greater Accra.">
                      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. East Legon, near A&C Mall" className={inp} />
                    </Field>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Start date" required>
                      <input type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inp} />
                    </Field>
                    <Field label="Start time" required hint="Xperts get a reminder one hour before.">
                      <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={inp} />
                    </Field>
                  </div>
                  {scheduledDate && <PricingNotice premium={premium} />}
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Anything else the Xperts should know?" hint="Required skills, equipment or materials, access instructions, who to ask for — optional.">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="e.g. Ask for Ama at the front desk. Ladder needed for the high windows." className={`${inp} resize-y`} />
                  </Field>
                  <div className="rounded-lg border border-ink-900/10 bg-gray-50 px-4 py-3.5 text-sm text-ink-700">
                    <p className="font-semibold text-ink-900">How pricing works</p>
                    <p className="mt-1">There's no price at this stage. BeyondX reviews your task and sends you an invoice. You review it, then pay to have Xperts matched — or decline it at no cost.</p>
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
                  <ReviewRow label="Number of Xperts" value={workers} />
                  <ReviewRow label="Pricing" value={premium ? 'Premium (starts within 48 hours) — invoice to follow' : 'Standard — invoice to follow'} />
                </dl>
              )}
              {step === 3 && (
                <>
                  <SurchargeNotice />
                  <label className="flex items-start gap-3 text-sm text-ink-800">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-900/30 text-forest-600" />
                    <span>I've described the task accurately, and I understand extra work on site will be charged at least 25% more.</span>
                  </label>
                </>
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
                <button onClick={submit} disabled={busy || !agreed}
                  className="rounded-lg bg-ink-900 px-8 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-800 disabled:opacity-60">
                  {busy ? 'Submitting…' : 'Submit Task'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Need help? */}
        <aside className="h-fit rounded-2xl border border-ink-900/10 bg-gray-100 p-6 lg:mt-14">
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
