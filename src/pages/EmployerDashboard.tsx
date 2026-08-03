import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Send, Phone, Plus, X, ShieldCheck, CircleCheck, Info, RefreshCw, AlertCircle, Copy, Check } from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import ProfileModal from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LiveLocation from '../components/LiveLocation'
import { tasks as tasksApi, workers as workersApi, employers as employersApi, contact, session, ApiError, type Task, type Worker, type Employer } from '../lib/api'
import { DISPATCH_ENABLED, DISPATCH_PAUSED_MESSAGE } from '../lib/config'
import { categories, remoteCategories, allCategories, TOOL_SURCHARGE_RATE, VEHICLE_SURCHARGES, logisticsRate } from '../data'
import { PLATFORM_FEE } from '../lib/payments'

const cedis = (n?: number | string) => `GH\u20b5 ${Number(n || 0).toLocaleString()}`
const wName = (w: Worker) => (w.fullName as string) || (w.name as string) || 'Worker'
const wInitials = (w: Worker) => wName(w).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
const wSkills = (w: Worker): string[] => (Array.isArray(w.skills) ? (w.skills as string[]) : (w.cats as string[]) || [])
const wCharge = (w: Worker): number => Number((w.dailyCharge as string) ?? (w.charge as number) ?? 0) || 0

/** A worker is "background-flagged" if they registered with a prison facility. */
const isBackgroundFlagged = (w: Worker) => Boolean(w.prisonFacility)

/** Task-attribute risk flags. When all three are "no", background-flagged
 *  workers are eligible for the task and should be surfaced first by default. */
export interface TaskFlags {
  cashUnsupervised: boolean        // Will the worker handle cash unsupervised?
  vulnerableContact: boolean       // Will the worker be alone with vulnerable people / in a private residence?
  propertyAccess: boolean          // Will the worker have unsupervised access to property/valuables?
}
const DEFAULT_FLAGS: TaskFlags = { cashUnsupervised: false, vulnerableContact: false, propertyAccess: false }
const isHighRisk = (f: TaskFlags) => f.cashUnsupervised || f.vulnerableContact || f.propertyAccess

/** Sort workers so background-flagged profiles float to the top when the task
 *  is low-risk (all flags "no"). This gives them priority matching rather than
 *  being hidden, while keeping them off high-risk tasks. */
function sortWorkersForTask(workers: Worker[], flags: TaskFlags): Worker[] {
  if (isHighRisk(flags)) {
    // High-risk task → exclude background-flagged workers entirely
    return workers.filter((w) => !isBackgroundFlagged(w))
  }
  // Low-risk task → background-flagged workers first, then the rest
  const flagged = workers.filter(isBackgroundFlagged)
  const other = workers.filter((w) => !isBackgroundFlagged(w))
  return [...flagged, ...other]
}

const STATUS: Record<string, { label: string; dot: string; chip: string; note?: string }> = {
  open: { label: 'Awaiting worker', dot: 'bg-clay-500', chip: 'bg-clay-400/15 text-clay-600', note: 'Waiting for a worker to accept.' },
  offered: { label: 'Awaiting worker response', dot: 'bg-clay-500', chip: 'bg-clay-400/15 text-clay-600', note: 'The worker will accept or decline shortly.' },
  accepted: { label: 'On the job', dot: 'bg-forest-500', chip: 'bg-forest-600/10 text-forest-700', note: 'Attendance is GPS-verified. Confirm once the work is finished.' },
  pending_confirmation: { label: 'Worker marked done', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', note: 'Confirm the work to release payment through BeyondX.' },
  employer_confirmed: { label: 'Confirmed — with BeyondX', dot: 'bg-ink-700', chip: 'bg-ink-900/10 text-ink-800', note: 'BeyondX is processing the payment release to the worker.' },
  completed: { label: 'Payment released', dot: 'bg-forest-600', chip: 'bg-forest-600/15 text-forest-800', note: 'BeyondX released the payment to the worker.' },
}
const st = (s?: string) => STATUS[s || 'open'] || STATUS.open

const PAYMENT_METHODS = [
  { id: 'MTN MoMo', logo: '/payment/mtn-momo.png', alt: 'MTN Mobile Money' },
  { id: 'Telecel Cash', logo: '/payment/telecel-cash.png', alt: 'Telecel Cash' },
  { id: 'AirtelTigo Money', logo: '/payment/airteltigo-money.png', alt: 'AirtelTigo Money' },
]

// Dispatch writes "Worker: <name> (<id>) | Payment Ref: <ref>" into the description.
function dispatchDetails(t: Task) {
  const d = String(t.description || '')
  const worker = d.match(/Worker:\s*([^(|]+?)\s*\(([^)]+)\)/)
  const ref = d.match(/Payment Ref:\s*([^|]+)/)
  return {
    workerName: worker?.[1]?.trim() || '',
    workerId: worker?.[2]?.trim() || '',
    paymentRef: ref?.[1]?.trim() || '',
  }
}

function Stars({ n }: { n: number }) {
  return <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} aria-hidden="true" className={i <= n ? 'fill-forest-600 text-forest-600' : 'text-ink-900/20'} />)}</span>
}
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)} className="rounded transition-transform focus:outline-none focus:ring-2 focus:ring-forest-600/40 active:scale-90">
          <Star size={30} aria-hidden="true" className={i <= value ? 'fill-forest-600 text-forest-600' : 'text-ink-900/20 hover:text-forest-600/40'} />
        </button>
      ))}
    </div>
  )
}
function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-ink-900/15 p-10 text-center text-sm text-ink-700">{text}</div>
}
function Skeleton() {
  return <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => (
    <div key={i} className="rounded-xl bg-cream-50 p-5 shadow-sm ring-1 ring-ink-900/5">
      <div className="h-4 w-1/3 animate-pulse rounded bg-ink-900/10" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
    </div>))}</div>
}

export default function EmployerDashboard() {
  const [tab, setTab] = useState<'hire' | 'post' | 'history' | 'support'>('hire')
  const [workMode, setWorkMode] = useState<'field' | 'remote'>('field')
  const [pickedCategory, setPickedCategory] = useState<string | null>(null)
  const [taskFlags, setTaskFlags] = useState<TaskFlags>(DEFAULT_FLAGS)
  const [screeningDone, setScreeningDone] = useState(false)
  const [viewing, setViewing] = useState<Worker | null>(null)
  const [dispatching, setDispatching] = useState<Worker | null>(null)
  const [rating, setRating] = useState<Task | null>(null)
  const [editing, setEditing] = useState(false)

  const [workerList, setWorkerList] = useState<Worker[]>([])
  const [taskList, setTaskList] = useState<Task[]>([])
  const [profile, setProfile] = useState<Employer | null>(session.employer())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [toast, setToast] = useState<ToastMsg>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [wRes, tRes, pRes] = await Promise.all([
        workersApi.list(),
        tasksApi.all(),
        employersApi.profile().catch(() => null),
      ])
      setWorkerList(wRes?.workers || [])
      setTaskList(tRes?.tasks || [])
      const emp = (pRes as { employer?: Employer } | null)?.employer
      if (emp) { setProfile(emp); session.patchEmployer(emp) }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const orgName = (profile?.orgName as string) || 'Your organisation'
  const logo = (profile?.logoUrl as string) || undefined

  const pickCategory = (title: string) => {
    setPickedCategory(title)
    setTaskFlags(DEFAULT_FLAGS)
    setScreeningDone(false)
  }
  const clearCategory = () => {
    setPickedCategory(null)
    setTaskFlags(DEFAULT_FLAGS)
    setScreeningDone(false)
  }

  const afterDispatch = () => {
    setAnnounce('Worker dispatched.')
    setToast({ id: Date.now(), kind: 'success', title: 'Worker dispatched', detail: 'Payment is held by BeyondX. The worker will accept or decline shortly — track it under Dispatch History.' })
    load()
  }
  const afterConfirm = (worker: string) => {
    setRating(null)
    setAnnounce(`Work confirmed for ${worker}.`)
    setToast({ id: Date.now(), kind: 'success', title: 'Work confirmed', detail: `BeyondX is now processing payment to ${worker}. It shows "Payment released" once done.` })
    load()
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <DashboardHeader role="EMPLOYER" title="Employer Dashboard" name={orgName} avatar={logo} onEditProfile={() => setEditing(true)} tasks={taskList} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <p aria-live="polite" className="sr-only">{announce}</p>

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}</p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">Try again</button>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto border-b border-ink-900/10 pb-px" role="tablist" aria-label="Employer sections">
          {([['hire', 'Hire Workers'], ['post', 'Post a Task'], ['history', `Dispatch History (${taskList.length})`], ['support', 'Support']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 ${tab === id ? 'border-forest-600 text-forest-700' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); load() }} aria-label="Refresh" className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>

        {tab === 'hire' && (
          <div className="mt-6">
            {!DISPATCH_ENABLED && (
              <div className="mb-4 rounded-xl bg-clay-400/10 p-4 ring-1 ring-clay-400/25">
                <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-800">
                  <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-clay-500" />
                  <span><span className="font-semibold">Dispatch is paused for now.</span> {DISPATCH_PAUSED_MESSAGE}</span>
                </p>
              </div>
            )}

            {/* Step 1 — what needs doing. Workers are then filtered to that work. */}
            {!pickedCategory ? (
              <>
                <h2 className="font-serif text-xl font-medium text-ink-900">What do you need done?</h2>
                <p className="mt-1 text-sm text-ink-700">
                  Choose the type of work and we&rsquo;ll show you the workers certified for it.
                </p>

                <div className="mt-4 inline-flex rounded-full bg-ink-900/5 p-1" role="tablist" aria-label="Work location">
                  {([['field', 'On the field'], ['remote', 'Remote']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={workMode === id}
                      onClick={() => setWorkMode(id)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${workMode === id ? 'bg-cream-50 text-ink-900 shadow-sm' : 'text-ink-700 hover:text-ink-900'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(workMode === 'field' ? categories : remoteCategories).map((c) => {
                    const Icon = c.icon
                    const count = workerList.filter((w) => wSkills(w).includes(c.title)).length
                    return (
                      <li key={c.title}>
                        <button
                          onClick={() => pickCategory(c.title)}
                          aria-label={`${c.title} — ${count} worker${count === 1 ? '' : 's'} available`}
                          className="flex h-full w-full flex-col rounded-xl bg-cream-50 p-4 text-left shadow-sm ring-1 ring-ink-900/5 transition-all hover:ring-forest-600/40 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600/10 text-forest-600">
                              <Icon size={18} aria-hidden="true" />
                            </span>
                            <span className="font-serif text-base font-medium leading-snug text-ink-900">{c.title}</span>
                          </span>
                          <span className="mt-2 block text-xs leading-relaxed text-ink-700">{c.description}</span>
                          <span className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-2.5">
                            <span className="text-sm text-ink-900">
                              {c.distancePricing ? (
                                <span className="font-semibold">{cedis(40)} <span className="text-xs font-normal text-ink-700">base + distance</span></span>
                              ) : c.skilledRate ? (
                                <span>
                                  <span className="font-semibold">{cedis(c.rate)}</span>
                                  <span className="mx-1 text-ink-700/50">–</span>
                                  <span className="font-semibold">{cedis(c.skilledRate)}</span>
                                  <span className="ml-1 text-xs font-normal text-ink-700">{c.rateUnit || 'per day'}</span>
                                </span>
                              ) : (
                                <span>
                                  <span className="font-semibold">{cedis(c.rate)}</span>
                                  <span className="ml-1 text-xs font-normal text-ink-700">{c.rateUnit || 'per day'}</span>
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-ink-700">{count} worker{count === 1 ? '' : 's'}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <button
                      onClick={() => clearCategory()}
                      className="mb-1.5 flex items-center gap-1 text-sm font-medium text-forest-700 hover:underline"
                    >
                      <ChevronLeft size={15} aria-hidden="true" /> All work types
                    </button>
                    <h2 className="font-serif text-xl font-medium text-ink-900">{pickedCategory}</h2>
                  </div>
                  {(() => {
                    const cat = categories.find((c) => c.title === pickedCategory)
                    return cat ? (
                      <span className="shrink-0 rounded-xl bg-forest-600/10 px-4 py-2 text-sm font-semibold text-forest-800">
                        {cedis(cat.rate)}{' '}
                        <span className="font-normal text-forest-700">{cat.rateUnit || 'per day'}</span>
                      </span>
                    ) : null
                  })()}
                </div>

                {loading ? <div className="mt-5"><Skeleton /></div> : (() => {
                  // Show the screening questions first, then the worker list.
                  if (!screeningDone) {
                    return (
                      <TaskScreening
                        category={pickedCategory!}
                        flags={taskFlags}
                        onChangeFlags={setTaskFlags}
                        onDone={() => setScreeningDone(true)}
                      />
                    )
                  }

                  const matches = sortWorkersForTask(
                    workerList.filter((w) => wSkills(w).includes(pickedCategory)),
                    taskFlags
                  )
                  const flagged = matches.filter(isBackgroundFlagged)
                  const highRisk = isHighRisk(taskFlags)

                  return (
                    <>
                      {/* Compact summary of answers after screening — tap to revise */}
                      <div className={`mb-4 mt-5 flex items-center justify-between rounded-xl px-4 py-2.5 ring-1 ${highRisk ? 'bg-clay-400/10 ring-clay-400/30' : 'bg-forest-600/8 ring-forest-600/20'}`}>
                        <p className={`flex items-center gap-2 text-sm font-medium ${highRisk ? 'text-clay-700' : 'text-forest-800'}`}>
                          <ShieldCheck size={15} aria-hidden="true" />
                          {highRisk
                            ? 'Restricted task — some workers excluded based on your answers'
                            : `Open task — all vetted workers eligible${flagged.length > 0 ? ` · ${flagged.length} prioritised first` : ''}`}
                        </p>
                        <button
                          onClick={() => setScreeningDone(false)}
                          className="ml-3 shrink-0 text-xs font-medium underline underline-offset-2 opacity-60 hover:opacity-100"
                        >
                          Edit answers
                        </button>
                      </div>

                      {matches.length ? (
                        <ul className="mt-4 divide-y divide-ink-900/10 overflow-hidden rounded-2xl bg-cream-50 shadow-sm ring-1 ring-ink-900/5">
                          {matches.map((w) => (
                            <li key={String(w.id)}>
                              <button onClick={() => setViewing(w)} aria-label={`View ${wName(w)}'s profile`}
                                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-forest-600/5 focus:outline-none focus-visible:bg-forest-600/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-600/40 sm:px-5">
                                {w.photoUrl ? <img src={w.photoUrl as string} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                  : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-cream-50">{wInitials(w)}</span>}
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="block truncate font-serif text-base font-medium text-ink-900">{wName(w)}</span>
                                    {isBackgroundFlagged(w) && !highRisk && (
                                      <span className="shrink-0 rounded-full bg-forest-600/10 px-2 py-0.5 text-[10px] font-semibold text-forest-700">Priority</span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-700">
                                    {w.rating && Number(w.rating) > 0
                                      ? <span className="inline-flex items-center gap-0.5"><Star size={12} aria-hidden="true" className="fill-forest-600 text-forest-600" /> {Number(w.rating).toFixed(1)}</span>
                                      : <span>New worker</span>}
                                    <span>· {Number(w.tasksCompleted ?? 0)} task{Number(w.tasksCompleted ?? 0) === 1 ? '' : 's'} completed</span>
                                    {w.isBusy ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">On a job</span> : null}
                                  </span>
                                </span>
                                <span className="hidden shrink-0 text-sm font-medium text-forest-700 sm:inline">View profile</span>
                                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-700" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-4">
                          <Empty text={
                            highRisk
                              ? `No workers cleared for this task type yet. Post a task and we'll match someone.`
                              : `No workers are certified for ${pickedCategory} yet. Post a task instead and we'll match someone as soon as they join.`
                          } />
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {tab === 'support' && (
          <SupportPanel
            role="employer"
            onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
            onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
          />
        )}

        {tab === 'post' && <PostTask onDone={(msg) => { setToast({ id: Date.now(), kind: 'success', title: 'Task posted', detail: msg }); load() }} />}

        {tab === 'history' && (
          <div className="mt-6 space-y-3">
            {loading ? <Skeleton /> : taskList.length ? taskList.map((t) => {
              const s = st(t.status)
              const worker = typeof t.employer === 'string' ? t.employer : ''
              const rev = t.reviews?.[0]?.rating
              return (
                <div key={String(t.id)} className="rounded-xl bg-cream-50 p-4 shadow-sm ring-1 ring-ink-900/5 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-serif text-base font-medium text-ink-900">{t.taskType || 'Task'}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-700">{t.description || worker}{t.location ? ` · ${t.location}` : ''}</p>
                      {rev ? <div className="mt-1 flex items-center gap-2 text-xs text-ink-700">You rated <Stars n={Number(rev)} /></div> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${s.chip}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                      </span>
                      {t.status === 'pending_confirmation' && (
                        <button onClick={() => setRating(t)} className="shrink-0 rounded-full bg-forest-600 px-4 py-2 text-xs font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
                          Confirm work &amp; rate
                        </button>
                      )}
                    </div>
                  </div>
                  {t.status === 'accepted' && <LiveLocation taskId={t.id} />}
                  {s.note && <p className="mt-3 flex items-start gap-2 border-t border-ink-900/10 pt-3 text-xs leading-relaxed text-ink-700"><Info size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-clay-500" /> {s.note}</p>}
                </div>
              )
            }) : <Empty text="No dispatches yet. Hire a worker to get started." />}
          </div>
        )}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {viewing && <WorkerProfileModal worker={viewing} category={pickedCategory} onClose={() => setViewing(null)} onDispatch={() => { const w = viewing; setViewing(null); setDispatching(w) }} />}
      {dispatching && DISPATCH_ENABLED && <DispatchModal worker={dispatching} category={pickedCategory} onClose={() => setDispatching(null)} onDone={afterDispatch} onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Dispatch failed', detail: m })} />}
      {rating && <RateModal task={rating} onClose={() => setRating(null)} onDone={afterConfirm} onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not confirm', detail: m })} />}
      {editing && profile !== undefined && (
        <ProfileModal
          role="EMPLOYER"
          initial={{ avatar: logo, name: orgName, contact: (profile?.contactPerson as string) || '', phone: (profile?.phone as string) || '', region: (profile?.region as string) || '', bio: '' }}
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            setEditing(false)
            try {
              const logoUrl = p.avatar && /^https?:\/\//.test(p.avatar) ? p.avatar : undefined
              const patch: Record<string, unknown> = { contactPerson: p.contact, phone: p.phone, region: p.region }
              if (logoUrl && logoUrl !== profile?.logoUrl) patch.logoUrl = logoUrl
              await employersApi.updateProfile(patch)
              session.patchEmployer(patch)
              setToast({ id: Date.now(), kind: 'success', title: 'Profile updated', detail: 'Your organisation details are up to date.' })
              load()
            } catch (e) {
              setToast({ id: Date.now(), kind: 'info', title: 'Could not save profile', detail: e instanceof ApiError ? e.message : 'Please try again.' })
            }
          }}
        />
      )}
    </div>
  )
}

/** Plain text plus a copy button, instead of a tel: link. On desktop, clicking
 *  a bare tel: link throws up the OS's "which app should open this?" dialog —
 *  jarring and useless on a hiring dashboard nobody's using from a phone. */
function PhoneCopy({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(phone)
      } else {
        const el = document.createElement('textarea')
        el.value = phone
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable — the number is still visible to copy by hand */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy phone number ${phone}`}
      className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-900/5 hover:text-forest-700"
    >
      <Phone size={15} aria-hidden="true" className="text-forest-600" />
      {phone}
      {copied ? <Check size={13} aria-hidden="true" className="text-forest-600" /> : <Copy size={13} aria-hidden="true" className="text-ink-700/50" />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Task screening — shown when an employer picks a category, before they see
// any workers. One question at a time, large tappable Yes/No buttons, clear
// result at the end. Category-specific questions appear where relevant.
// ---------------------------------------------------------------------------

const UNIVERSAL_QUESTIONS: { key: keyof TaskFlags; question: string; yesHint: string }[] = [
  {
    key: 'cashUnsupervised',
    question: 'Will the worker handle cash unsupervised?',
    yesHint: 'e.g. collecting payments, operating a till, handling a float',
  },
  {
    key: 'vulnerableContact',
    question: 'Will the worker be alone in a private home or with vulnerable people?',
    yesHint: 'e.g. working in a private residence, caring for children or the elderly',
  },
  {
    key: 'propertyAccess',
    question: 'Will the worker have unsupervised access to valuables or property?',
    yesHint: 'e.g. access to a storeroom, safe, vehicle, or high-value goods without supervision',
  },
]

// Some categories almost never involve these risks — surface them but note
// that "No" is the expected answer, so employers aren't confused.
const LOWER_RISK_CATEGORIES = ['Facility & Cleaning', 'Agriculture & Environment', 'Community Services', 'Logistics & Delivery']

function TaskScreening({
  category,
  flags,
  onChangeFlags,
  onDone,
}: {
  category: string
  flags: TaskFlags
  onChangeFlags: (f: TaskFlags) => void
  onDone: () => void
}) {
  const [step, setStep] = useState(0)           // current question index
  const [answered, setAnswered] = useState<boolean[]>([]) // answers in order
  const [showResult, setShowResult] = useState(false)
  const isLowerRisk = LOWER_RISK_CATEGORIES.includes(category)
  const questions = UNIVERSAL_QUESTIONS

  const answer = (yes: boolean) => {
    const next = [...answered, yes]
    setAnswered(next)

    // Update the flags immediately so the worker list is ready
    const updatedFlags = { ...flags }
    updatedFlags[questions[step].key] = yes
    onChangeFlags(updatedFlags)

    if (step + 1 < questions.length) {
      setStep(step + 1)
    } else {
      setShowResult(true)
    }
  }

  const highRisk = flags.cashUnsupervised || flags.vulnerableContact || flags.propertyAccess

  if (showResult) {
    return (
      <div className="mt-6">
        <div className={`rounded-2xl p-6 text-center ring-2 ${highRisk ? 'bg-clay-400/8 ring-clay-400/40' : 'bg-forest-600/8 ring-forest-600/30'}`}>
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${highRisk ? 'bg-clay-400/20' : 'bg-forest-600/15'}`}>
            {highRisk ? '⚠️' : '✅'}
          </div>
          <p className={`font-serif text-xl font-medium ${highRisk ? 'text-clay-800' : 'text-forest-900'}`}>
            {highRisk ? 'This is a restricted task' : 'This task is open to all workers'}
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${highRisk ? 'text-clay-700' : 'text-forest-800'}`}>
            {highRisk
              ? 'Based on your answers, workers with certain background flags will not be matched to this job. Only standard-vetted workers will appear.'
              : 'All vetted workers on the platform are eligible for this job. Workers with verified background records will appear first.'}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={onDone}
              className={`rounded-full px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:scale-[1.02] active:scale-[0.98] ${highRisk ? 'bg-clay-600 hover:bg-clay-500' : 'bg-forest-600 hover:bg-forest-500'}`}
            >
              See available workers →
            </button>
            <button
              onClick={() => { setStep(0); setAnswered([]); onChangeFlags({ cashUnsupervised: false, vulnerableContact: false, propertyAccess: false }); setShowResult(false) }}
              className="rounded-full border border-ink-900/15 px-6 py-3 text-sm font-medium text-ink-700 hover:bg-ink-900/5"
            >
              Review my answers
            </button>
          </div>
        </div>
      </div>
    )
  }

  const current = questions[step]
  const progress = ((step) / questions.length) * 100

  return (
    <div className="mt-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-700/60">
          <span>Question {step + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-ink-900/8">
          <div
            className="h-1.5 rounded-full bg-forest-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl bg-cream-50 p-6 shadow-sm ring-1 ring-ink-900/8">
        {isLowerRisk && step === 0 && (
          <p className="mb-4 rounded-lg bg-forest-600/6 px-3 py-2 text-xs leading-relaxed text-forest-800">
            Most <span className="font-semibold">{category}</span> tasks are low-risk by nature. Answer honestly — if you're unsure, answer No.
          </p>
        )}
        <p className="font-serif text-lg font-medium leading-snug text-ink-900">
          {current.question}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-700/70">
          {current.yesHint}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-clay-400/30 bg-clay-400/8 px-4 py-4 text-center font-semibold text-clay-700 transition-all hover:border-clay-500/60 hover:bg-clay-400/15 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/50"
          >
            <span className="text-2xl">✓ Yes</span>
            <span className="text-xs font-normal text-clay-600/80">This applies to the task</span>
          </button>
          <button
            onClick={() => answer(false)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-forest-600/30 bg-forest-600/8 px-4 py-4 text-center font-semibold text-forest-700 transition-all hover:border-forest-600/60 hover:bg-forest-600/15 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/50"
          >
            <span className="text-2xl">✗ No</span>
            <span className="text-xs font-normal text-forest-600/80">This doesn't apply</span>
          </button>
        </div>
      </div>

      {/* Previous answers */}
      {answered.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {answered.map((ans, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-cream-50 px-3.5 py-2.5 ring-1 ring-ink-900/8">
              <span className="text-xs leading-snug text-ink-700">{questions[i].question}</span>
              <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ans ? 'bg-clay-400/15 text-clay-700' : 'bg-forest-600/10 text-forest-700'}`}>
                {ans ? 'Yes' : 'No'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkerProfileModal({ worker, category, onClose, onDispatch }: { worker: Worker; category?: string | null; onClose: () => void; onDispatch: () => void }) {
  useEsc(onClose)
  const skills = wSkills(worker)
  const rateFor = (title: string) => allCategories.find((c) => c.title === title)
  const picked = category ? rateFor(category) : undefined
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      {/* Fixed height with an internal scroll area: the header and the action
          button stay put, so the button is never scrolled out of reach. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wp-title"
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — compact so more of the profile is visible at a glance */}
        <div className="relative shrink-0 bg-forest-700 px-6 pb-5 pt-5 text-center">
          <button onClick={onClose} aria-label="Close profile" className="absolute right-3 top-3 rounded-lg p-1.5 text-cream-50/80 transition-colors hover:bg-cream-50/10 hover:text-cream-50">
            <X size={18} aria-hidden="true" />
          </button>
          {worker.photoUrl ? (
            <img src={worker.photoUrl as string} alt="" className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-cream-50/30" />
          ) : (
            <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-50 font-serif text-xl font-bold text-forest-700 shadow-md">
              {wInitials(worker)}
            </span>
          )}
          <h2 id="wp-title" className="mt-2.5 font-serif text-xl font-medium leading-snug text-cream-50">{wName(worker)}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-cream-200/90">
            <ShieldCheck size={13} aria-hidden="true" /> BeyondX Verified · Certified Worker
          </p>
          {worker.rating && Number(worker.rating) > 0 ? (
            <p className="mt-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-50/15 px-2.5 py-0.5 text-xs font-semibold text-cream-50">
                <Star size={11} aria-hidden="true" className="fill-cream-50 text-cream-50" /> {Number(worker.rating).toFixed(1)}
              </span>
            </p>
          ) : null}
        </div>

        {/* Scrollable middle */}
        <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 px-6 pt-5">
            <div className="rounded-xl bg-cream-100 p-3.5 text-center">
              <span className="block font-serif text-xl font-semibold text-ink-900">{Number(worker.tasksCompleted ?? worker.tasks ?? 0)}</span>
              <span className="text-xs text-ink-700">Tasks completed</span>
            </div>
            <div className="rounded-xl bg-forest-600/10 p-3.5 text-center">
              <span className="block font-serif text-xl font-semibold text-ink-900">
                {picked ? cedis(picked.rate) : '—'}
              </span>
              <span className="text-xs text-ink-700">
                {picked ? `${picked.rateUnit || 'per day'} · ${picked.title.split(' ')[0]}` : 'Standard rate'}
              </span>
            </div>
          </div>

          <div className="space-y-4 px-6 pb-5 pt-5">
            {worker.phone ? (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-clay-500">Contact</h3>
                <PhoneCopy phone={worker.phone as string} />
              </div>
            ) : null}

            {skills.length ? (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-clay-500">Certified Skills</h3>
                <ul className="overflow-hidden rounded-xl ring-1 ring-ink-900/10">
                  {skills.map((sk, i) => {
                    const c = rateFor(sk)
                    const isPicked = category === sk
                    return (
                      <li key={sk} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${isPicked ? 'bg-forest-600/10' : i % 2 ? 'bg-cream-100/60' : 'bg-cream-50'}`}>
                        <CircleCheck size={15} aria-hidden="true" className="shrink-0 text-forest-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink-900">{sk}</span>
                          {c && (
                            <span className="block text-[11px] text-ink-700">
                              {cedis(c.rate)} {c.rateUnit || 'per day'}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 rounded-full bg-forest-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-700">Certified</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action stays pinned */}
        <div className="shrink-0 border-t border-ink-900/10 bg-cream-50 p-4">
          {DISPATCH_ENABLED ? (
            <button
              onClick={onDispatch}
              disabled={!!worker.isBusy}
              aria-label={`Dispatch ${wName(worker)}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
            >
              <Send size={15} aria-hidden="true" /> {worker.isBusy ? 'Currently on a job' : `Dispatch ${wName(worker).split(' ')[0]}`}
            </button>
          ) : (
            <div className="rounded-xl bg-clay-400/10 p-3.5 ring-1 ring-clay-400/25">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-800">
                <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-clay-500" />
                <span><span className="font-semibold">Dispatch is paused for now.</span> {DISPATCH_PAUSED_MESSAGE}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DispatchModal({ worker, category, onClose, onDone, onError }: { worker: Worker; category?: string | null; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  useEsc(onClose)
  const [days, setDays] = useState(1)
  const [location, setLocation] = useState('')
  const [taskType, setTaskType] = useState(category || wSkills(worker)[0] || 'General Task')
  const [payRef, setPayRef] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const cat = allCategories.find((c) => c.title === taskType)

  // Complexity tier (basic vs skilled)
  const [tier, setTier] = useState<'basic' | 'skilled'>('basic')
  // Tool provision (worker brings tools = +15%)
  const [workerProvidesTools, setWorkerProvidesTools] = useState(false)
  // Logistics: distance + vehicle
  const [distanceKm, setDistanceKm] = useState(3)
  const [vehicle, setVehicle] = useState(0)   // surcharge value from VEHICLE_SURCHARGES

  // Reset tier/tool when category changes
  useEffect(() => { setTier('basic'); setWorkerProvidesTools(false) }, [taskType])

  // ---------- Rate calculation ----------
  const baseRate = (() => {
    if (!cat) return wCharge(worker)
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
    if (!payRef.trim() || !method || busy) return
    setBusy(true)
    try {
      await tasksApi.dispatch({ worker, taskType, location: cat?.mode === 'remote' ? 'Remote' : location, duration, pay: workerGets, paymentRef: `${method} ${payRef.trim()}` })
      onDone()
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="dp-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-cream-50 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="dp-title" className="font-serif text-xl font-medium text-ink-900">Dispatch {wName(worker).split(' ')[0]}</h2>
          <button onClick={onClose} aria-label="Cancel dispatch" className="rounded-lg p-1 text-ink-700 hover:bg-ink-900/5"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="mb-4 text-sm text-ink-700">Pay {wName(worker)} via mobile money, then enter your payment reference below. BeyondX holds the payment and releases it once you confirm the work.</p>

        <div className="space-y-4">
          {/* Task type */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700">Task type</span>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30">
              {allCategories.map((c) => <option key={c.title}>{c.title}</option>)}
            </select>
          </label>

          {/* Complexity tier */}
          {cat?.skilledRate && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-700">Complexity tier</span>
              <div className="grid grid-cols-2 gap-2">
                {([['basic', `Basic — ${cedis(cat.rate)}/day`], ['skilled', `Skilled — ${cedis(cat.skilledRate)}/day`]] as const).map(([t, label]) => (
                  <button key={t} type="button" onClick={() => setTier(t)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${tier === t ? 'border-forest-600 bg-forest-600/8 font-semibold text-forest-800 ring-2 ring-forest-600/20' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/40'}`}>
                    {label}
                    {t === 'skilled' && cat.skilledLabel && <span className="block mt-0.5 font-normal text-ink-700/70">e.g. {cat.skilledLabel}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logistics distance + vehicle */}
          {cat?.distancePricing && (
            <div className="space-y-3 rounded-xl bg-cream-100 p-4 ring-1 ring-ink-900/8">
              <p className="text-xs font-semibold uppercase tracking-widest text-clay-500">Logistics pricing</p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-700">Distance (GPS pickup → drop-off)</span>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={30} step={1} value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="flex-1 accent-forest-600" />
                  <span className="w-14 shrink-0 text-right text-sm font-semibold text-ink-900">{distanceKm} km</span>
                </div>
                <p className="mt-1 text-xs text-ink-700/70">Distance is pulled from GPS check-in — enter an estimate for now.</p>
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink-700">Worker's vehicle</span>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_SURCHARGES.map((v) => (
                    <button key={v.label} type="button" onClick={() => setVehicle(v.value)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${vehicle === v.value ? 'border-forest-600 bg-forest-600/8 font-semibold text-forest-800 ring-2 ring-forest-600/20' : 'border-ink-900/15 text-ink-700 hover:border-forest-500/40'}`}>
                      {v.label}
                      <span className="block mt-0.5 font-normal text-ink-700/70">{v.value === 0 ? 'No surcharge' : `+${cedis(v.value)}`}{v.note ? ` · ${v.note}` : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
              {tier === 'skilled' && (
                <p className="text-xs text-ink-700">Skilled tier (inventory handling / documentation): +{cedis(30)}</p>
              )}
            </div>
          )}

          {/* Tool modifier */}
          {cat?.toolModifier && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-900/10 bg-cream-100 p-3.5">
              <input type="checkbox" checked={workerProvidesTools} onChange={(e) => setWorkerProvidesTools(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-900/30 text-forest-600 focus:ring-forest-600/30" />
              <span>
                <span className="block text-sm font-medium text-ink-900">Worker provides their own tools</span>
                <span className="block text-xs text-ink-700/80">+15% surcharge on the base rate ({cedis(Math.round((((tier === 'skilled' && cat.skilledRate) ? cat.skilledRate : cat.rate)) * TOOL_SURCHARGE_RATE))} extra)</span>
              </span>
            </label>
          )}

          {/* Agriculture minimum-day notice */}
          {cat?.minDays && days < cat.minDays && (
            <p className="rounded-xl bg-clay-400/10 px-3 py-2.5 text-xs leading-relaxed text-ink-800 ring-1 ring-clay-400/20">
              <span className="font-semibold">Minimum {cat.minDays}-day booking</span> for {cat.title}. Duration adjusted automatically.
            </p>
          )}

          {/* Location */}
          {cat?.mode === 'remote' ? (
            <p className="rounded-xl bg-forest-600/5 p-3 text-xs leading-relaxed text-ink-700 ring-1 ring-forest-600/15">
              This is remote work — the worker completes it from wherever they are, so no job site is needed.
            </p>
          ) : !cat?.distancePricing ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Tema" className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30" />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700">Pickup location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Makola Market" className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30" />
            </label>
          )}

          {/* Duration (not for logistics or remote) */}
          {!cat?.distancePricing && cat?.mode !== 'remote' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700">Duration</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30">
                {cat?.minDays === 2 ? null : <option value={0.5}>Half Day</option>}
                <option value={1}>1 Day</option>
                <option value={2}>2 Days</option>
                <option value={3}>3 Days</option>
                <option value={5}>5 Days</option>
              </select>
            </label>
          )}
        </div>

        {/* Price breakdown */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-forest-600/5 p-4 ring-1 ring-forest-600/15">
          <span className="min-w-0 text-sm text-ink-700">
            Amount to pay
            <span className="mt-1 block text-xs leading-relaxed text-ink-700/80">
              {cedis(workerGets)} to the worker
              <span className="block">+ {cedis(fee)} BeyondX service fee</span>
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-serif text-lg font-semibold text-ink-900">{cedis(pay)}</span>
            <span className="block text-[11px] text-ink-700/80">
              {cat?.distancePricing
                ? `${distanceKm}km delivery`
                : `${cedis(baseRate)}/day × ${effectiveDays === 0.5 ? 'half day' : `${effectiveDays} day${effectiveDays === 1 ? '' : 's'}`}`}
            </span>
          </span>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-xs font-medium text-ink-700">How did you pay?</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={method === m.id} aria-label={m.alt} onClick={() => setMethod(m.id)}
                className={`flex h-16 items-center justify-center rounded-xl border bg-white p-2 transition-all ${method === m.id ? 'border-forest-600 ring-2 ring-forest-600/30' : 'border-ink-900/15 hover:border-forest-500/50'}`}>
                <img src={m.logo} alt={m.alt} className="max-h-9 w-auto object-contain" />
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-ink-700">Payment reference / transaction ID</span>
          <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. 1234567890" className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30" />
        </label>

        <button onClick={submit} disabled={!payRef.trim() || !method || busy} className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
          <ShieldCheck size={16} aria-hidden="true" /> {busy ? 'Dispatching…' : 'Confirm & dispatch'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-700">The worker is notified once your payment reference is recorded.</p>
      </div>
    </div>
  )
}

function RateModal({ task, onClose, onDone, onError }: { task: Task; onClose: () => void; onDone: (worker: string) => void; onError: (m: string) => void }) {
  useEsc(onClose)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const worker = typeof task.employer === 'string' ? task.employer : task.taskType || 'the worker'

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      await tasksApi.complete(task.id)
      await tasksApi.review(task.id, stars, comment).catch(() => null)

      // Tell BeyondX that payment is now due to the worker. Never block the
      // confirmation itself if the notification fails.
      const emp = session.employer()
      const { workerName, workerId, paymentRef } = dispatchDetails(task)
      const orgName = (emp?.orgName as string) || 'An employer'
      contact
        .send({
          name: orgName,
          email: (emp?.email as string) || undefined,
          phone: (emp?.phone as string) || undefined,
          message:
            `${orgName} confirmed the work is complete. Payment is now due to the worker.\n\n` +
            `Worker: ${workerName || worker}${workerId ? ` (${workerId})` : ''}\n` +
            `Task: ${task.taskType || '—'}\n` +
            `Location: ${task.location || '—'}\n` +
            `Duration: ${task.duration || '—'}\n` +
            `Worker is owed: GHS ${Number(task.pay || 0).toFixed(2)}\n` +
            `BeyondX service fee: GHS ${(Number(task.pay || 0) * PLATFORM_FEE).toFixed(2)}\n` +
            `Employer paid in total: GHS ${(Number(task.pay || 0) * (1 + PLATFORM_FEE)).toFixed(2)}\n` +
            (paymentRef ? `Employer payment ref: ${paymentRef}\n` : '') +
            `Employer rating: ${stars}/5\n` +
            (comment.trim() ? `Employer feedback: ${comment.trim()}\n` : '') +
            `\nRelease the worker's payment to complete this job.`,
          category: 'payment_due',
        })
        .catch(() => null)

      onDone(worker)
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rt-title" className="w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="rt-title" className="font-serif text-xl font-medium text-ink-900">Confirm work &amp; rate</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-ink-700 hover:bg-ink-900/5"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="mb-4 text-sm text-ink-700">Confirm the work is done and rate it. Once you confirm, BeyondX reviews and releases the payment we are holding to the worker.</p>
        <StarPicker value={stars} onChange={setStars} />
        <label htmlFor="rt-comment" className="sr-only">Feedback</label>
        <textarea id="rt-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Feedback on the work (optional)" className="mt-4 w-full rounded-xl border border-ink-900/15 bg-white p-3 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30" />
        <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
          {busy ? 'Confirming…' : 'Confirm work is done'}
        </button>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PostTask({ onDone }: { onDone: (msg: string) => void }) {
  const [taskType, setTaskType] = useState(allCategories[0].title)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('1 Day')
  const cat = allCategories.find((c) => c.title === taskType)
  const rate = cat ? cat.rate : 0
  const days = duration === 'Half Day' ? 0.5 : parseFloat(duration) || 1
  const workerGets = rate * days
  const fee = Math.round(workerGets * PLATFORM_FEE)
  const pay = String(workerGets)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!taskType || busy) return
    if (cat?.mode !== 'remote' && !location) return
    setErr(null); setBusy(true)
    try {
      await tasksApi.create({ taskType, description, location: cat?.mode === 'remote' ? 'Remote' : location, duration, pay: parseFloat(pay) || 0 })
      setDescription(''); setLocation('')
      onDone(`"${taskType}" is now open for workers to accept.`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/30'
  return (
    <div className="mt-6 max-w-xl">
      <div className="rounded-2xl bg-cream-50 p-6 shadow-sm ring-1 ring-ink-900/5">
        <h2 className="mb-4 font-serif text-xl font-medium text-ink-900">Post a new task</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700">Task type</span>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inp}>
              <optgroup label="On the field">
                {categories.map((c) => <option key={c.title}>{c.title}</option>)}
              </optgroup>
              <optgroup label="Remote">
                {remoteCategories.map((c) => <option key={c.title}>{c.title}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-ink-700">Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs doing" className={inp} /></label>
          {cat?.mode === 'remote' ? null : (
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-700">Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Tema" className={inp} /></label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-medium text-ink-700">Duration</span>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inp}><option>Half Day</option><option>1 Day</option><option>2 Days</option><option>3 Days</option><option>5 Days</option></select>
            </label>
            <div className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700">Pay (GH₵)</span>
              <div className="flex h-[42px] items-center rounded-xl bg-forest-600/5 px-3 text-sm font-semibold text-ink-900 ring-1 ring-forest-600/15">
                {cedis(workerGets + fee)}
              </div>
              <span className="mt-1 block text-xs leading-relaxed text-ink-700">
                {cedis(workerGets)} to the worker + {cedis(fee)} service fee
              </span>
            </div>
          </div>
          {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{err}</p>}
          <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
            <Plus size={16} aria-hidden="true" /> {busy ? 'Posting…' : 'Post task'}
          </button>
        </div>
      </div>
    </div>
  )
}
