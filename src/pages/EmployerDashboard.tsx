import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Star, Send, Phone, Plus, X, ShieldCheck, CircleCheck, Info, RefreshCw, AlertCircle } from 'lucide-react'
import ProfileModal from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LiveLocation from '../components/LiveLocation'
import Notifications from '../components/Notifications'
import { useAuth } from '../components/auth/AuthContext'
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
  const [viewing, setViewing] = useState<Worker | null>(null)
  const [dispatching, setDispatching] = useState<Worker | null>(null)
  const [rating, setRating] = useState<Task | null>(null)
  const [editing, setEditing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const activeTasks = taskList.filter((t) => ['open','offered','accepted'].includes(String(t.status)))
  const pendingConfirm = taskList.filter((t) => t.status === 'pending_confirmation')
  const { go, logout } = useAuth()

  const afterDispatch = () => {
    setDispatching(null)
    setAnnounce('Worker dispatched.')
    setToast({ id: Date.now(), kind: 'success', title: 'Worker dispatched', detail: 'Payment is held by BeyondX. Track it under Activity.' })
    load()
  }
  const afterConfirm = (worker: string) => {
    setRating(null)
    setAnnounce(`Work confirmed for ${worker}.`)
    setToast({ id: Date.now(), kind: 'success', title: 'Work confirmed', detail: `BeyondX is now processing payment to ${worker}.` })
    load()
  }

  const NAV = [
    { id: 'hire' as const, label: 'Hire Workers', icon: Plus, badge: 0 },
    { id: 'post' as const, label: 'Post a Task', icon: Send, badge: 0 },
    { id: 'history' as const, label: 'Activity', icon: RefreshCw, badge: pendingConfirm.length },
    { id: 'support' as const, label: 'Support', icon: Info, badge: 0 },
  ]

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream-100">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="z-40 flex h-14 shrink-0 items-center gap-3 border-b border-ink-900/8 bg-cream-50 px-4 sm:px-6">
        <button
          className="mr-1 rounded-md p-1.5 text-ink-700 hover:bg-ink-900/5 lg:hidden"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          <Plus size={20} className="rotate-45" />
        </button>
        <button onClick={() => go('home')} aria-label="Home" className="shrink-0">
          <img src="/beyondx-logo.png" alt="BeyondX" className="h-6" onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
        </button>
        <span aria-hidden="true" className="hidden h-5 w-px bg-ink-900/12 sm:block" />
        <span className="hidden text-sm font-medium text-ink-700 sm:block">Employer Portal</span>
        <div className="ml-auto flex items-center gap-2">
          <Notifications role="employer" tasks={taskList} />
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-full border border-ink-900/12 py-1 pl-1 pr-3 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5"
          >
            {logo
              ? <img src={logo} alt="" className="h-6 w-6 rounded-full object-cover" />
              : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-600 text-[11px] font-bold text-cream-50">
                  {orgName.slice(0, 2).toUpperCase()}
                </span>}
            <span className="hidden max-w-[120px] truncate sm:inline">{orgName}</span>
          </button>
          <button
            onClick={logout}
            className="hidden items-center gap-1.5 rounded-full border border-ink-900/12 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5 sm:flex"
          >
            <Phone size={13} aria-hidden="true" /> Log out
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className={`fixed inset-y-0 left-0 z-30 mt-14 flex w-56 flex-col border-r border-ink-900/8 bg-cream-50 transition-transform lg:relative lg:mt-0 lg:inset-y-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="border-b border-ink-900/8 px-4 py-4">
            <p className="truncate text-sm font-semibold text-ink-900">{orgName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-700/60">{(profile?.region as string) || 'Greater Accra'}</p>
          </div>
          <div className="grid grid-cols-2 gap-px border-b border-ink-900/8 bg-ink-900/8">
            {([{ label: 'Active jobs', value: activeTasks.length }, { label: 'Awaiting confirm', value: pendingConfirm.length }] as const).map(({ label, value }) => (
              <div key={label} className="bg-cream-50 px-3 py-3">
                <p className="font-serif text-xl font-semibold text-ink-900">{value}</p>
                <p className="text-[11px] text-ink-700/70">{label}</p>
              </div>
            ))}
          </div>
          <nav className="flex-1 px-2 py-3">
            {NAV.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => { setTab(id); setSidebarOpen(false) }}
                className={`group mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === id ? 'bg-forest-600/10 text-forest-800' : 'text-ink-700 hover:bg-ink-900/5 hover:text-ink-900'}`}>
                <Icon size={16} aria-hidden="true" className={tab === id ? 'text-forest-600' : 'text-ink-700/60 group-hover:text-ink-800'} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-cream-50">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="border-t border-ink-900/8 px-3 py-3 lg:hidden">
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-900/5">
              <Phone size={14} aria-hidden="true" /> Log out
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-20 bg-ink-950/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Main content ──────────────────────────────────── */}
        <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <p aria-live="polite" className="sr-only">{announce}</p>

          <div className="flex items-center justify-between border-b border-ink-900/8 bg-cream-50 px-6 py-4">
            <div>
              <h1 className="font-serif text-lg font-medium text-ink-900">{NAV.find((n) => n.id === tab)?.label}</h1>
              {!DISPATCH_ENABLED && tab === 'hire' && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-clay-600"><Info size={12} aria-hidden="true" /> {DISPATCH_PAUSED_MESSAGE}</p>
              )}
            </div>
            <button onClick={() => { setLoading(true); load() }} aria-label="Refresh"
              className="flex items-center gap-1.5 rounded-lg border border-ink-900/12 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
              <RefreshCw size={13} aria-hidden="true" /> Refresh
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-red-700"><AlertCircle size={15} aria-hidden="true" /> {error}</p>
              <button onClick={() => { setLoading(true); load() }} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-red-700">Retry</button>
            </div>
          )}

          <div className="flex-1 px-6 py-5">

            {/* Hire workers */}
            {tab === 'hire' && (
              <div>
                {!pickedCategory ? (
                  <>
                    <div className="mb-5 flex items-center justify-between">
                      <p className="text-sm text-ink-700">Select a work category to see available workers.</p>
                      <div className="inline-flex rounded-lg border border-ink-900/12 bg-cream-50 p-0.5">
                        {([['field', 'On the field'], ['remote', 'Remote']] as const).map(([id, label]) => (
                          <button key={id} onClick={() => setWorkMode(id)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${workMode === id ? 'bg-forest-600 text-cream-50 shadow-sm' : 'text-ink-700 hover:text-ink-900'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {(workMode === 'field' ? categories : remoteCategories).map((c) => {
                        const Icon = c.icon
                        const count = workerList.filter((w) => wSkills(w).includes(c.title)).length
                        return (
                          <button key={c.title} onClick={() => setPickedCategory(c.title)}
                            className="flex items-start gap-3.5 rounded-lg border border-ink-900/10 bg-cream-50 p-4 text-left transition-all hover:border-forest-600/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600/8 text-forest-600">
                              <Icon size={17} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink-900">{c.title}</span>
                              <span className="mt-0.5 block text-xs leading-snug text-ink-700/80">{c.description}</span>
                              <span className="mt-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-forest-700">
                                  {c.distancePricing ? `${cedis(40)} base` : c.skilledRate ? `${cedis(c.rate)}–${cedis(c.skilledRate)}` : cedis(c.rate)}
                                  <span className="font-normal text-ink-700/60"> {c.distancePricing ? '+ dist.' : c.rateUnit || '/day'}</span>
                                </span>
                                <span className="text-xs text-ink-700/60">{count} worker{count !== 1 ? 's' : ''}</span>
                              </span>
                            </span>
                            <ChevronRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-700/30" />
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5 flex items-center gap-3">
                      <button onClick={() => setPickedCategory(null)}
                        className="flex items-center gap-1 text-sm font-medium text-forest-700 hover:underline">
                        <ChevronLeft size={15} aria-hidden="true" /> All categories
                      </button>
                      <span className="h-4 w-px bg-ink-900/15" />
                      <span className="text-sm font-semibold text-ink-900">{pickedCategory}</span>
                    </div>

                    {/* Risk flags */}
                    <div className="mb-5 overflow-hidden rounded-lg border border-ink-900/10 bg-cream-50">
                      <div className="border-b border-ink-900/8 px-4 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-700/50">Task screening — answer before seeing workers</p>
                      </div>
                      <div className="divide-y divide-ink-900/6">
                        {([
                          ['cashUnsupervised', 'Worker handles cash unsupervised'],
                          ['vulnerableContact', 'Worker alone in private residence or with vulnerable people'],
                          ['propertyAccess', 'Worker has unsupervised access to property or valuables'],
                        ] as [keyof TaskFlags, string][]).map(([key, label]) => (
                          <label key={key} className="flex cursor-pointer items-center justify-between px-4 py-3">
                            <span className="text-sm text-ink-800">{label}</span>
                            <input type="checkbox" checked={taskFlags[key]}
                              onChange={(e) => setTaskFlags((f) => ({ ...f, [key]: e.target.checked }))}
                              className="h-4 w-4 rounded border-ink-900/30 text-forest-600 focus:ring-forest-600/30" />
                          </label>
                        ))}
                      </div>
                      <div className={`px-4 py-2.5 text-xs font-medium ${isHighRisk(taskFlags) ? 'bg-clay-400/8 text-clay-700' : 'bg-forest-600/6 text-forest-700'}`}>
                        {isHighRisk(taskFlags)
                          ? 'Restricted — workers with background flags excluded'
                          : (() => {
                              const fl = sortWorkersForTask(workerList.filter((w) => wSkills(w).includes(pickedCategory!)), taskFlags).filter(isBackgroundFlagged).length
                              return `Open — all vetted workers eligible${fl > 0 ? ` · ${fl} priority worker${fl > 1 ? 's' : ''} shown first` : ''}`
                            })()}
                      </div>
                    </div>

                    {loading ? <Skeleton /> : (() => {
                      const matches = sortWorkersForTask(workerList.filter((w) => wSkills(w).includes(pickedCategory!)), taskFlags)
                      const highRisk = isHighRisk(taskFlags)
                      return matches.length ? (
                        <div className="overflow-hidden rounded-lg border border-ink-900/10">
                          <div className="hidden grid-cols-[auto_1fr_70px_60px_110px] items-center gap-4 border-b border-ink-900/8 bg-cream-100/60 px-4 py-2 sm:grid">
                            {['Worker', '', 'Rating', 'Jobs', ''].map((h, i) => (
                              <span key={i} className="text-[11px] font-semibold uppercase tracking-widest text-ink-700/50">{h}</span>
                            ))}
                          </div>
                          {matches.map((w, i) => (
                            <button key={String(w.id)} onClick={() => setViewing(w)} aria-label={`View ${wName(w)} profile`}
                              className={`grid w-full grid-cols-[auto_1fr] gap-3 bg-cream-50 px-4 py-3.5 text-left transition-colors hover:bg-forest-600/4 focus:outline-none focus-visible:bg-forest-600/4 sm:grid-cols-[auto_1fr_70px_60px_110px] sm:items-center sm:gap-4 ${i > 0 ? 'border-t border-ink-900/6' : ''}`}>
                              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-cream-50">
                                {w.photoUrl ? <img src={w.photoUrl as string} alt="" className="h-9 w-9 rounded-full object-cover" /> : wInitials(w)}
                              </span>
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-1.5">
                                  <span className="truncate text-sm font-semibold text-ink-900">{wName(w)}</span>
                                  {isBackgroundFlagged(w) && !highRisk && (
                                    <span className="rounded-full bg-forest-600/10 px-2 py-0.5 text-[10px] font-semibold text-forest-700">Priority match</span>
                                  )}
                                  {Boolean(w.isBusy) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">On a job</span>}
                                </span>
                                <span className="mt-0.5 block text-xs text-ink-700/60 sm:hidden">
                                  {Number(w.tasksCompleted ?? 0)} jobs · {w.rating && Number(w.rating) > 0 ? `★ ${Number(w.rating).toFixed(1)}` : 'New'}
                                </span>
                              </span>
                              <span className="hidden text-sm text-ink-700 sm:block">
                                {w.rating && Number(w.rating) > 0
                                  ? <span className="inline-flex items-center gap-1"><Star size={11} className="fill-forest-600 text-forest-600" /> {Number(w.rating).toFixed(1)}</span>
                                  : <span className="text-ink-700/40">—</span>}
                              </span>
                              <span className="hidden text-sm text-ink-700 sm:block">{Number(w.tasksCompleted ?? 0)}</span>
                              <span className="hidden items-center justify-end gap-1 text-xs font-medium text-forest-700 sm:flex">
                                View profile <ChevronRight size={14} aria-hidden="true" />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : <Empty text={highRisk ? `No cleared workers for this task. Post a task to be matched.` : `No workers certified for ${pickedCategory} yet.`} />
                    })()}
                  </>
                )}
              </div>
            )}

            {tab === 'post' && <PostTask onDone={(msg) => { setToast({ id: Date.now(), kind: 'success', title: 'Task posted', detail: msg }); load() }} />}

            {tab === 'history' && (
              loading ? <Skeleton /> : taskList.length ? (
                <div className="overflow-hidden rounded-lg border border-ink-900/10">
                  <div className="hidden grid-cols-[1fr_100px_150px_180px] gap-4 border-b border-ink-900/8 bg-cream-100/60 px-5 py-2.5 sm:grid">
                    {['Task / Worker', 'Duration', 'Status', ''].map((h) => (
                      <span key={h} className="text-[11px] font-semibold uppercase tracking-widest text-ink-700/50">{h}</span>
                    ))}
                  </div>
                  {taskList.map((t, i) => {
                    const s = st(t.status)
                    const rev = t.reviews?.[0]?.rating
                    const { workerName } = dispatchDetails(t)
                    return (
                      <div key={String(t.id)}
                        className={`grid grid-cols-1 gap-3 bg-cream-50 px-5 py-4 sm:grid-cols-[1fr_100px_150px_180px] sm:items-center sm:gap-4 ${i > 0 ? 'border-t border-ink-900/6' : ''}`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{t.taskType || 'Task'}</p>
                          <p className="mt-0.5 text-xs text-ink-700/70">{workerName || '—'}{t.location ? ` · ${t.location}` : ''}</p>
                          {rev && <div className="mt-1 flex items-center gap-1 text-xs text-ink-700/60">Your rating: <Stars n={Number(rev)} /></div>}
                        </div>
                        <span className="text-sm text-ink-700">{String(t.duration || '—')}</span>
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.chip}`}>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {t.status === 'pending_confirmation' && (
                            <button onClick={() => setRating(t)}
                              className="rounded-md bg-forest-600 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40">
                              Confirm & rate
                            </button>
                          )}
                          {s.note && <p className="text-xs text-ink-700/60">{s.note}</p>}
                        </div>
                        {t.status === 'accepted' && <div className="col-span-full"><LiveLocation taskId={t.id} /></div>}
                      </div>
                    )
                  })}
                </div>
              ) : <Empty text="No dispatches yet. Hire a worker to get started." />
            )}

            {tab === 'support' && (
              <SupportPanel role="employer"
                onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up shortly.' })}
                onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })} />
            )}
          </div>
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      {viewing && <WorkerProfileModal worker={viewing} category={pickedCategory} onClose={() => setViewing(null)} onDispatch={() => { const w = viewing; setViewing(null); setDispatching(w) }} />}
      {dispatching && DISPATCH_ENABLED && <DispatchModal worker={dispatching} category={pickedCategory} onClose={() => setDispatching(null)} onDone={afterDispatch} onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Dispatch failed', detail: m })} />}
      {rating && <RateModal task={rating} onClose={() => setRating(null)} onDone={afterConfirm} onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not confirm', detail: m })} />}
      {editing && profile !== undefined && (
        <ProfileModal role="EMPLOYER"
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
          }} />
      )}
    </div>
  )
}


/** Plain text + copy button — avoids the OS "pick an app" dialog that a bare tel: link triggers on desktop. */
function PhoneCopy({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(phone)
      } else {
        const el = document.createElement('textarea')
        el.value = phone; el.style.position = 'fixed'; el.style.opacity = '0'
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy phone number ${phone}`}
      className="inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-900/5 hover:text-forest-700">
      <Phone size={15} aria-hidden="true" className="text-forest-600" />
      {phone}
      {copied ? '✓' : ''}
    </button>
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
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-clay-500">Skills</h3>
                <ul className="overflow-hidden rounded-xl ring-1 ring-ink-900/10">
                  {skills.map((sk, i) => {
                    const c = rateFor(sk)
                    const isPicked = category === sk
                    // A skill is BeyondX-verified if the worker has the verifiedSkills
                    // field set (admin-controlled after completed job + review), or if
                    // they have a non-zero tasksCompleted and a rating — proxy until
                    // the backend adds an explicit verifiedSkills field.
                    const verifiedSkills: string[] = (worker.verifiedSkills as string[]) || []
                    const isVerified = verifiedSkills.includes(sk) ||
                      (Number(worker.tasksCompleted ?? 0) > 0 && Number(worker.rating ?? 0) >= 4)
                    return (
                      <li key={sk} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${isPicked ? 'bg-forest-600/10' : i % 2 ? 'bg-cream-100/60' : 'bg-cream-50'}`}>
                        <CircleCheck size={15} aria-hidden="true" className={`shrink-0 ${isVerified ? 'text-forest-600' : 'text-ink-900/30'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink-900">{sk}</span>
                          {c && (
                            <span className="block text-[11px] text-ink-700">
                              {cedis(c.rate)} {c.rateUnit || 'per day'}
                            </span>
                          )}
                        </span>
                        {isVerified ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-700">
                            <ShieldCheck size={10} aria-hidden="true" /> BeyondX Verified
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-ink-900/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-700">Registered</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {skills.some((sk) => {
                  const verifiedSkills: string[] = (worker.verifiedSkills as string[]) || []
                  return !verifiedSkills.includes(sk) && !(Number(worker.tasksCompleted ?? 0) > 0 && Number(worker.rating ?? 0) >= 4)
                }) && (
                  <p className="mt-2 text-[11px] leading-snug text-ink-700/60">
                    Skills are marked <span className="font-semibold">BeyondX Verified</span> once a worker completes their first rated job in that category.
                  </p>
                )}
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
