import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Logo from '../components/Logo'
import {
  allCategories, TOOL_SURCHARGE_RATE, VEHICLE_SURCHARGES,
  logisticsRate,
} from '../data'
import { PLATFORM_FEE } from '../lib/payments'
import { tasks as tasksApi, ApiError } from '../lib/api'
import type { Worker } from '../lib/api'
import type { ScreeningAnswers } from './EmployerDashboard'

const PAYMENT_METHODS = [
  { id: 'MTN MoMo', logo: '/payment/mtn-momo.png', alt: 'MTN Mobile Money' },
  { id: 'Telecel Cash', logo: '/payment/telecel-cash.png', alt: 'Telecel Cash' },
  { id: 'AirtelTigo Money', logo: '/payment/airteltigo-money.png', alt: 'AirtelTigo Money' },
]

const cedis = (n: number) => `GH₵ ${Number(n || 0).toLocaleString()}`
const wName = (w: Worker) =>
  (w.fullName as string) || (w.name as string) || 'Worker'

// State written by the parent window before calling window.open
export type BookingState = {
  worker: Worker
  category: string | null
  screening: ScreeningAnswers | null
}

export const BOOKING_KEY = 'bx_pending_booking'

export function openBookingWindow(state: BookingState) {
  try {
    sessionStorage.setItem(BOOKING_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
  const win = window.open('/?page=book-worker', '_blank', 'width=700,height=820,resizable=yes,scrollbars=yes')
  return win
}

export default function BookWorker() {
  const [bookingState, setBookingState] = useState<BookingState | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    // Read booking state from parent window's sessionStorage
    // (works because same-origin new windows share sessionStorage on open)
    try {
      const raw = sessionStorage.getItem(BOOKING_KEY)
      if (raw) setBookingState(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  if (!bookingState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 p-6">
        <div className="text-center">
          <Logo tone="dark" className="mx-auto mb-4 h-8" />
          <p className="text-sm text-ink-700">No booking information found. Please return to the employer dashboard and try again.</p>
          <button onClick={() => window.close()} className="mt-4 text-sm font-medium text-forest-700 underline">Close this window</button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-cream-50 p-8 text-center shadow-xl">
          <CheckCircle size={48} className="mx-auto mb-4 text-forest-600" strokeWidth={1.5} />
          <h1 className="font-serif text-xl font-semibold text-ink-900">Booking submitted</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Your payment details are with BeyondX. Once verified, the worker will be notified via SMS — usually within a few minutes.
          </p>
          <button
            onClick={() => {
              // Signal the parent window to reload its job list
              try { localStorage.setItem('bx_booking_done', String(Date.now())) } catch { /* ignore */ }
              window.close()
            }}
            className="mt-6 w-full rounded-xl bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-500"
          >
            Close this window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-ink-900/10 bg-cream-50 px-5">
        <Logo tone="dark" className="h-7" />
        <span aria-hidden="true" className="h-5 w-px bg-ink-900/15" />
        <span className="text-sm font-medium text-ink-700">Book a Worker</span>
        <button onClick={() => window.close()} className="ml-auto flex items-center gap-1.5 text-sm text-ink-700/60 hover:text-ink-900">
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </button>
      </header>

      <main className="mx-auto max-w-xl px-5 py-8">
        <BookingForm
          state={bookingState}
          onDone={() => setSubmitted(true)}
          onError={(m: string) => setErr(m)}
        />
        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
        )}
      </main>
    </div>
  )
}

function BookingForm({ state, onDone, onError }: {
  state: BookingState
  onDone: () => void
  onError: (m: string) => void
}) {
  const { worker, category, screening } = state

  const [days, setDays] = useState(1)
  const [location, setLocation] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [taskType, setTaskType] = useState(category || (Array.isArray(worker.skills) ? (worker.skills as string[])[0] : '') || 'General Task')
  const [payRef, setPayRef] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)

  const cat = allCategories.find((c) => c.title === taskType)
  const [tier, setTier] = useState<'basic' | 'skilled'>(screening?.tier ?? 'basic')
  const workerProvidesTools = Boolean(worker.hasTools)
  const [distanceKm, setDistanceKm] = useState(3)
  const [vehicle, setVehicle] = useState(0)

  useEffect(() => { setTier('basic') }, [taskType])

  const baseRate = (() => {
    if (!cat) return Number((worker.dailyCharge as string) ?? 0) || 0
    if (cat.distancePricing) return logisticsRate(distanceKm, tier === 'skilled', vehicle)
    const flat = (tier === 'skilled' && cat.skilledRate) ? cat.skilledRate : cat.rate
    if (cat.toolModifier && workerProvidesTools) return Math.round(flat * (1 + TOOL_SURCHARGE_RATE))
    return flat
  })()

  const isPerDay = !cat?.distancePricing && cat?.mode !== 'remote'
  const effectiveDays = cat?.distancePricing ? 1 : (cat?.minDays ? Math.max(days, cat.minDays) : days)
  const workerGets = isPerDay ? baseRate * effectiveDays : baseRate
  const fee = Math.round(workerGets * PLATFORM_FEE)
  const pay = workerGets + fee
  const duration = effectiveDays === 0.5 ? 'Half Day' : effectiveDays === 1 ? '1 Day' : `${effectiveDays} Days`

  const submit = async () => {
    if (!payRef.trim() || !method || !jobDescription.trim() || busy) return
    setBusy(true)
    try {
      await tasksApi.dispatch({
        worker,
        taskType,
        jobDescription: jobDescription.trim(),
        location: cat?.mode === 'remote' ? 'Remote' : location,
        duration,
        pay: workerGets,
        paymentRef: `${method} ${payRef.trim()}`,
      })
      onDone()
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Please try again.')
      setBusy(false)
    }
  }

  const inp = 'w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'

  return (
    <div>
      {/* Worker summary */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-ink-900/10 bg-cream-50 px-5 py-4">
        {worker.photoUrl
          ? <img src={worker.photoUrl as string} alt="" className="h-12 w-12 rounded-full object-cover" />
          : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-600 text-base font-bold text-cream-50">
              {wName(worker).slice(0, 2).toUpperCase()}
            </span>}
        <div>
          <p className="font-serif text-base font-semibold text-ink-900">{wName(worker)}</p>
          <p className="text-xs text-ink-700/60">
            {Array.isArray(worker.skills) ? (worker.skills as string[]).slice(0, 2).join(' · ') : ''}
            {worker.rating && Number(worker.rating) > 0 ? ` · ★ ${Number(worker.rating).toFixed(1)}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Task type */}
        <div>
          <label htmlFor="bw-task" className="mb-1.5 block text-sm font-medium text-ink-900">Task type</label>
          <select id="bw-task" value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inp}>
            {allCategories.map((c) => <option key={c.title}>{c.title}</option>)}
          </select>
        </div>

        {/* Complexity tier */}
        {cat?.skilledRate && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-900">Complexity</p>
            <div className="grid grid-cols-2 gap-2">
              {([['basic', `Basic — ${cedis(cat.rate)}/day`], ['skilled', `Skilled — ${cedis(cat.skilledRate)}/day`]] as const).map(([t, label]) => (
                <button key={t} type="button" onClick={() => setTier(t)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${tier === t ? 'border-forest-600 bg-forest-600/8 font-semibold text-forest-800' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/40'}`}>
                  {label}
                  {t === 'skilled' && cat.skilledLabel && <span className="mt-0.5 block text-xs font-normal text-ink-700/70">e.g. {cat.skilledLabel}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Logistics */}
        {cat?.distancePricing && (
          <div className="space-y-3 rounded-xl bg-cream-100 p-4 ring-1 ring-ink-900/8">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-700/50">Logistics</p>
            <div>
              <label htmlFor="bw-dist" className="mb-1 block text-sm font-medium text-ink-900">Distance (km)</label>
              <div className="flex items-center gap-3">
                <input id="bw-dist" type="range" min={1} max={30} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} className="flex-1 accent-forest-600" />
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-ink-900">{distanceKm} km</span>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-900">Vehicle</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_SURCHARGES.map((v) => (
                  <button key={v.label} type="button" onClick={() => setVehicle(v.value)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${vehicle === v.value ? 'border-forest-600 bg-forest-600/8 font-semibold text-forest-800' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/40'}`}>
                    {v.label}
                    <span className="mt-0.5 block text-xs font-normal text-ink-700/70">{v.value === 0 ? 'No surcharge' : `+${cedis(v.value)}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tools note */}
        {cat?.toolModifier && (
          <div className="rounded-xl border border-ink-900/10 bg-cream-100 px-4 py-3 text-sm text-ink-700">
            <span className="font-medium text-ink-900">Tools: </span>
            {workerProvidesTools
              ? <span className="text-forest-700">Worker brings own tools (+{cedis(Math.round(((tier === 'skilled' && cat.skilledRate) ? cat.skilledRate : cat.rate) * TOOL_SURCHARGE_RATE))} applied)</span>
              : <span className="text-ink-700/70">Employer provides — no surcharge</span>}
            <span className="ml-1 text-xs text-ink-700/50">(from {wName(worker).split(' ')[0]}'s profile)</span>
          </div>
        )}

        {/* Minimum day notice */}
        {cat?.minDays && days < cat.minDays && (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
            Minimum {cat.minDays}-day booking for {cat.title}. Duration adjusted automatically.
          </p>
        )}

        {/* Location */}
        {cat?.mode === 'remote' ? (
          <p className="rounded-xl bg-forest-600/5 px-3 py-2.5 text-sm text-ink-700">Remote work — no job site needed.</p>
        ) : (
          <div>
            <label htmlFor="bw-loc" className="mb-1.5 block text-sm font-medium text-ink-900">
              {cat?.distancePricing ? 'Pickup location' : 'Job location'}
            </label>
            <input id="bw-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Tema" className={inp} />
          </div>
        )}

        {/* Job description — required */}
        <div>
          <label htmlFor="bw-desc" className="mb-1.5 block text-sm font-medium text-ink-900">
            Job description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bw-desc"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={3}
            placeholder="Describe exactly what needs to be done. The worker will see this in their SMS and dashboard."
            className={`${inp} resize-none`}
          />
          <p className="mt-1 text-xs text-ink-700/50">Be specific — include any special instructions, equipment needed, or access details.</p>
        </div>

        {/* Duration */}
        {!cat?.distancePricing && cat?.mode !== 'remote' && (
          <div>
            <label htmlFor="bw-dur" className="mb-1.5 block text-sm font-medium text-ink-900">Duration</label>
            <select id="bw-dur" value={days} onChange={(e) => setDays(Number(e.target.value))} className={inp}>
              {cat?.minDays === 2 ? null : <option value={0.5}>Half Day</option>}
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="mt-8 rounded-2xl bg-ink-900 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-cream-50/50">Total to pay BeyondX</p>
        <p className="mt-2 font-serif text-4xl font-semibold text-cream-50">{cedis(pay)}</p>
        <div className="mt-3 flex items-center justify-between border-t border-cream-50/10 pt-3 text-xs text-cream-50/50">
          <span>{cedis(workerGets)} to worker + {cedis(fee)} service fee</span>
          <span>{cat?.distancePricing ? `${distanceKm} km` : `${cedis(baseRate)}/day × ${effectiveDays === 0.5 ? '½' : effectiveDays}d`}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-ink-900">How did you pay?</p>
        <div className="grid grid-cols-3 gap-3">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.id} type="button" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}
              className={`flex h-16 items-center justify-center rounded-xl border bg-white p-2 transition-all ${method === m.id ? 'border-ink-900 ring-2 ring-ink-900/20' : 'border-ink-900/12 hover:border-ink-900/30'}`}>
              <img src={m.logo} alt={m.alt} className="max-h-9 w-auto object-contain" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="bw-ref" className="mb-1.5 block text-sm font-medium text-ink-900">Transaction reference</label>
        <input id="bw-ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. 1234567890" className={inp} />
      </div>

      <button onClick={submit} disabled={!payRef.trim() || !method || !jobDescription.trim() || busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-4 text-sm font-semibold text-cream-50 transition-all hover:bg-ink-800 active:scale-[0.98] disabled:opacity-40">
        {busy ? 'Submitting…' : `Submit booking — ${cedis(pay)}`}
      </button>
      <p className="mt-2.5 text-center text-xs text-ink-700/50">
        Worker is notified only after BeyondX verifies your payment.
      </p>
    </div>
  )
}
