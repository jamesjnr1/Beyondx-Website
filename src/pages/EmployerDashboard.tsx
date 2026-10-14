import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, Star, ShieldCheck, RefreshCw, AlertCircle, Check, Map, Clock, MapPin, Briefcase, Users, Wallet, LayoutDashboard, FilePlus, ClipboardList, Inbox, HelpCircle } from 'lucide-react'
import JobLocationMap from '../components/JobLocationMap'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar, { DashboardMobileNav, type DashboardNavItem } from '../components/DashboardSidebar'
import ActivityFeed, { type ActivityItem } from '../components/ActivityFeed'
import ProfileModal from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LiveLocation from '../components/LiveLocation'
import {
  tasks as tasksApi, employers as employersApi,
  contact, session, ApiError, type Task, type Employer,
} from '../lib/api'
import { MOMO_NUMBER, MOMO_NAME, PAY_METHODS } from '../lib/payments'
import { useRefreshOnResume } from '../hooks/useRefreshOnResume'
import NotificationsBanner from '../components/NotificationsBanner'
import PostTaskWizard, { type SubmittedTask } from '../components/tasks/PostTaskWizard'
import TaskSubmitted from '../components/tasks/TaskSubmitted'
import TaskTracking from '../components/tasks/TaskTracking'
import { PROGRESS_STEPS, currentStepIndex } from '../components/tasks/taskProgress'

const cedis = (n?: number | string) => `GH\u20b5 ${Number(n || 0).toLocaleString()}`
const STATUS: Record<string, { label: string; color: string; bar: string; note?: string; urgent?: boolean }> = {
  awaiting_invoice:   { label: 'Under review',        color: 'text-ink-700',     bar: 'bg-ink-900/20', note: 'BeyondX is reviewing your task and will send you an invoice shortly.' },
  invoice_sent:       { label: 'Invoice ready',       color: 'text-amber-700',   bar: 'bg-amber-400',  note: 'Your invoice is ready. Pay it in Invoices to have Xperts matched.', urgent: true },
  payment_pending:    { label: 'Verifying payment',   color: 'text-amber-700',   bar: 'bg-amber-400',  note: 'We received your payment details and are confirming the transaction — usually within a few minutes.' },
  offered:            { label: 'Xpert notified',      color: 'text-ink-700',     bar: 'bg-ink-900/30', note: 'An Xpert has been offered this job and is reviewing the details.' },
  open:               { label: 'Finding an Xpert',    color: 'text-ink-500',     bar: 'bg-ink-900/20', note: 'Payment confirmed. We are matching an Xpert to this job.' },
  accepted:           { label: 'On the job',          color: 'text-forest-700',  bar: 'bg-forest-500', note: 'Work is underway. You will be notified when the Xpert marks it complete.' },
  pending_confirmation: { label: 'Action required',  color: 'text-amber-700',   bar: 'bg-amber-500',  note: 'The Xpert has marked the job as done. Confirm below to release their payment.', urgent: true },
  employer_confirmed: { label: 'Payment processing', color: 'text-ink-600',     bar: 'bg-ink-900/30', note: 'BeyondX is releasing the payment. This usually completes within a few hours.' },
  completed:          { label: 'Complete',            color: 'text-forest-700',  bar: 'bg-forest-600', note: 'Payment has been released to the Xpert.' },
  cancelled:          { label: 'Cancelled',           color: 'text-ink-500',     bar: 'bg-ink-900/20', note: 'This request was closed.' },
  payment_rejected:   { label: 'Payment not verified', color: 'text-red-600',   bar: 'bg-red-400',    note: 'We could not verify this payment. Please contact BeyondX to resolve.' },
}
const st = (s?: string) => STATUS[s || 'open'] || STATUS.open

/** Assigned Xpert's name and rating — from the accepted record, or from the
 *  description older direct dispatches carried. */
type XpertSlot = { id: string; status: string; acceptedBy?: { fullName?: string; phone?: string; rating?: number | string } }

/** True when the job (or, on a multi-Xpert job, any one Xpert's part of it) is waiting on the employer to confirm. */
const needsConfirmation = (t: Task) =>
  t.status === 'pending_confirmation' ||
  !!(t as unknown as { acceptedWorkers?: XpertSlot[] }).acceptedWorkers?.some((w) => w.status === 'pending_confirmation')

function assignedXpert(t: Task) {
  const a = t.acceptedBy as { fullName?: string; rating?: number | string } | undefined
  const name = (typeof a === 'object' && a?.fullName) || dispatchDetails(t).workerName || ''
  const rating = typeof a === 'object' ? Number(a?.rating || 0) : 0
  return { name, rating }
}

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
function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-900/15 bg-gray-50 p-10 text-center">
      {icon && <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900/5 text-ink-700/50">{icon}</span>}
      <p className="text-sm text-ink-700">{text}</p>
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
  return <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => (
    <div key={i} className="rounded-xl bg-white p-5 shadow-sm border border-ink-900/8">
      <div className="h-4 w-1/3 animate-pulse rounded bg-ink-900/10" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
    </div>))}</div>
}

export default function EmployerDashboard() {
  const [tab, setTab] = useState<'overview' | 'post' | 'invoices' | 'history' | 'support'>('overview')
  const [rating, setRating] = useState<Task | null>(null)
  const [editing, setEditing] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedTask | null>(null)
  const [trackingId, setTrackingId] = useState<string | number | null>(null)
  const goTab = (id: string) => { setTab(id as typeof tab); setTrackingId(null); setSubmitted(null) }
  const trackTask = (id: string | number) => { setTab('history'); setTrackingId(id); setSubmitted(null) }
  // The task screens carry their own heading, so the welcome header is hidden on them.
  const taskScreen = tab === 'post' || (tab === 'history' && trackingId != null)

  const [taskList, setTaskList] = useState<Task[]>([])
  const [profile, setProfile] = useState<Employer | null>(session.employer())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [toast, setToast] = useState<ToastMsg>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [tRes, pRes] = await Promise.all([
        tasksApi.all(),
        employersApi.profile().catch(() => null),
      ])
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
  useRefreshOnResume(load)

  const cancelTask = async (t: Task) => {
    if (!window.confirm(`Cancel this "${t.taskType}" job? You won't be charged.`)) return
    try {
      await tasksApi.cancel(t.id)
      setToast({ id: Date.now(), kind: 'success', title: 'Job cancelled', detail: 'The search has been stopped.' })
      load()
    } catch (e) {
      setToast({ id: Date.now(), kind: 'info', title: 'Could not cancel', detail: e instanceof ApiError ? e.message : 'Please try again.' })
    }
  }

  const orgName = (profile?.orgName as string) || 'Your organisation'
  const logo = (profile?.logoUrl as string) || undefined

  // "Active" = still in flight; a job only counts toward spend once BeyondX has
  // actually paid a worker for it (employer_confirmed/completed), so a
  // cancelled or never-verified booking doesn't inflate the figure.
  const activeJobsCount = taskList.filter((t) => !['completed', 'cancelled', 'expired', 'payment_rejected'].includes(t.status || '')).length
  const workersHiredCount = new Set(taskList.map((t) => t.acceptedBy).filter(Boolean)).size
  const invoicesDue = taskList.filter((t) => t.status === 'invoice_sent')
  const pendingConfirmCount = taskList.filter((t) => t.status === 'pending_confirmation').length
  const now = new Date()
  const spendThisMonth = taskList
    .filter((t) => (t.status === 'completed' || t.status === 'employer_confirmed') && t.createdAt && new Date(t.createdAt).getMonth() === now.getMonth() && new Date(t.createdAt).getFullYear() === now.getFullYear())
    .reduce((sum, t) => sum + Number(t.pay || 0), 0)

  const afterConfirm = (worker: string) => {
    setRating(null)
    setAnnounce(`Work confirmed for ${worker}.`)
    setToast({ id: Date.now(), kind: 'success', title: 'Work confirmed', detail: `BeyondX is now processing payment to ${worker}. It shows "Payment released" once done.` })
    load()
  }

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'post', label: 'Post a Task', icon: FilePlus },
    { id: 'invoices', label: 'Invoices', icon: Inbox, badge: invoicesDue.length },
    { id: 'history', label: 'My Jobs', icon: ClipboardList, badge: pendingConfirmCount },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ]
  // Short set for the top bar — the sidebar carries the full list.
  const headerNavItems = navItems.filter((i) => ['overview', 'invoices', 'history', 'support'].includes(i.id))

  const urgentTask = taskList.find((t) => t.status === 'pending_confirmation')
  const nextActiveTask = urgentTask || invoicesDue[0] || taskList.find((t) => ['awaiting_invoice', 'open', 'payment_pending', 'offered', 'accepted'].includes(String(t.status)))

  const recentActivity: ActivityItem[] = [...taskList]
    .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
    .slice(0, 8)
    .map((t) => {
      const s = st(t.status)
      const tone: 'success' | 'info' | 'warning' = ['completed', 'employer_confirmed'].includes(String(t.status))
        ? 'success' : t.status === 'pending_confirmation' ? 'warning' : 'info'
      return {
        id: String(t.id),
        icon: <Briefcase size={15} aria-hidden="true" />,
        title: t.taskType || 'Task',
        detail: t.location as string | undefined,
        status: { label: s.label, tone },
      }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader role="EMPLOYER" title="Employer Dashboard" name={orgName} avatar={logo} onEditProfile={() => setEditing(true)} tasks={taskList}
        navItems={headerNavItems} active={tab} onSelect={goTab}
        cta={{ label: 'Post a Task', onClick: () => goTab('post') }} />
      <div className="lg:flex">
        <DashboardSidebar items={navItems} active={tab} onSelect={goTab} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <p aria-live="polite" className="sr-only">{announce}</p>

        {!taskScreen && <NotificationsBanner role="employer" />}

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}</p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">Try again</button>
          </div>
        )}

        {!taskScreen && (
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 sm:text-[1.75rem]">Welcome back, {orgName}!</h1>
            <p className="mt-0.5 text-sm text-ink-700/70">
              {pendingConfirmCount > 0
                ? `${pendingConfirmCount} job${pendingConfirmCount === 1 ? '' : 's'} waiting on your confirmation.`
                : activeJobsCount > 0
                  ? `${activeJobsCount} active job${activeJobsCount === 1 ? '' : 's'} right now.`
                  : 'No active jobs — post a task to get started.'}
            </p>
          </div>
          <button onClick={() => { setLoading(true); load() }} aria-label="Refresh dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-ink-700/60 transition-colors hover:bg-ink-900/5 hover:text-ink-900">
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>
        )}

        <div>
          <DashboardMobileNav items={navItems} active={tab} onSelect={goTab} />

          <div className="min-w-0 flex-1">
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-ink-700">Your Current Status</p>
                    <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-forest-700">
                      <Check size={20} strokeWidth={3} aria-hidden="true" /> Active
                    </p>
                    <p className="mt-3 text-sm text-ink-700/75">
                      {invoicesDue.length > 0
                        ? `${invoicesDue.length} invoice${invoicesDue.length === 1 ? '' : 's'} ready for you to review.`
                        : pendingConfirmCount > 0
                          ? `${pendingConfirmCount} job${pendingConfirmCount === 1 ? '' : 's'} waiting on your confirmation.`
                          : "You're all caught up on your jobs."}
                    </p>
                    <button onClick={() => setTab(invoicesDue.length ? 'invoices' : 'history')} className="mt-4 text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-500">
                      {invoicesDue.length ? 'View invoices →' : 'View My Jobs →'}
                    </button>
                    {Number(profile?.rating || 0) > 0 && (
                      <p className="mt-4 flex items-center gap-2 border-t border-ink-900/8 pt-3 text-sm text-ink-700">
                        Your rating from Xperts: <span className="font-semibold text-ink-900">{Number(profile?.rating).toFixed(1)}</span> <Stars n={Math.round(Number(profile?.rating))} />
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
                    <p className="border-b border-ink-900/8 pb-3 text-sm font-semibold text-ink-900">Next Job</p>
                    {nextActiveTask ? (
                      <>
                        <p className="mt-3 text-lg font-semibold text-ink-900">{nextActiveTask.taskType || 'Task'}</p>
                        <div className="mt-1.5 space-y-1 text-sm text-ink-700/75">
                          <p className={st(nextActiveTask.status).color + ' font-medium'}>{st(nextActiveTask.status).label}</p>
                          {nextActiveTask.location && (
                            <p className="flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" /> {nextActiveTask.location}</p>
                          )}
                        </div>
                        <button onClick={() => trackTask(nextActiveTask.id)}
                          className="mt-4 rounded-lg bg-forest-600 px-7 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98]">
                          View Details
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-ink-700/70">No active jobs right now.</p>
                        <button onClick={() => goTab('post')}
                          className="mt-3 rounded-md border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-900/5">
                          Post a task
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat icon={<Briefcase size={18} />} label="Active Jobs" value={`${activeJobsCount}`} />
                  <Stat icon={<Users size={18} />} label="Xperts Hired" value={`${workersHiredCount}`} />
                  <Stat icon={<Wallet size={18} />} label="Spend This Month" value={cedis(spendThisMonth)} />
                </div>

                <div>
                  {loading ? <Skeleton /> : (
                    <ActivityFeed title="Recent Activity" items={recentActivity} empty="No activity yet — your posted tasks will show up here." />
                  )}
                </div>
              </div>
            )}

        {tab === 'support' && (
          <SupportPanel
            role="employer"
            onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
            onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
          />
        )}

        {tab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-ink-900">Invoices</h2>
              <p className="mt-1 text-sm text-ink-700/70">BeyondX reviews every task you post and sends an invoice. Pay it to have Xperts matched, or decline it to close the request.</p>
            </div>
            {loading ? <Skeleton /> : invoicesDue.length ? invoicesDue.map((t) => (
              <InvoiceCard key={String(t.id)} task={t} onChanged={(msg) => { setToast({ id: Date.now(), kind: 'success', title: msg, detail: '' }); load() }} />
            )) : (
              <Empty icon={<Inbox size={20} aria-hidden="true" />} text="No invoices waiting. When BeyondX finishes reviewing a task you posted, its invoice appears here." />
            )}
            {taskList.some((t) => t.status === 'awaiting_invoice') && (
              <p className="text-sm text-ink-700/70">
                {taskList.filter((t) => t.status === 'awaiting_invoice').length} task(s) under review — invoices are on the way.
              </p>
            )}
          </div>
        )}

        {tab === 'post' && (submitted ? (
          <TaskSubmitted
            submitted={submitted}
            onTrack={() => trackTask(submitted.task.id)}
            onDashboard={() => goTab('overview')}
          />
        ) : (
          <PostTaskWizard
            onSubmitted={(s) => { setSubmitted(s); load() }}
            onContactSupport={() => goTab('support')}
            onBack={() => goTab('overview')}
          />
        ))}

        {tab === 'history' && trackingId != null && (() => {
          const t = taskList.find((x) => String(x.id) === String(trackingId))
          if (!t) return loading ? <Skeleton /> : (
            <Empty icon={<Briefcase size={20} aria-hidden="true" />} text="This task isn't in your list yet — refresh in a moment." />
          )
          return (
            <TaskTracking
              task={t}
              workerName={assignedXpert(t).name ? `${assignedXpert(t).name}${assignedXpert(t).rating > 0 ? ` (rated ${assignedXpert(t).rating.toFixed(1)}/5)` : ''}` : undefined}
              statusLabel={st(t.status).label}
              onBack={() => setTrackingId(null)}
              onContactSupport={() => goTab('support')}
              onCancel={['awaiting_invoice', 'invoice_sent', 'open', 'payment_pending'].includes(String(t.status)) ? () => cancelTask(t) : undefined}
              onConfirm={t.status === 'pending_confirmation' ? () => setRating(t) : undefined}
              onPayInvoice={() => goTab('invoices')}
            />
          )
        })()}

        {tab === 'history' && trackingId == null && (
          <div className="mt-6">
            {loading ? <Skeleton /> : taskList.length ? (() => {
              const urgent = taskList.filter(needsConfirmation)
              const active = taskList.filter((t) => !needsConfirmation(t) && ['awaiting_invoice', 'invoice_sent', 'open', 'payment_pending', 'offered', 'accepted'].includes(String(t.status)))
              const done = taskList.filter((t) => ['employer_confirmed', 'completed', 'payment_rejected'].includes(String(t.status)))

              const TaskItem = ({ t }: { t: Task }) => {
                const s = st(t.status)
                const { name: workerName, rating: xpertRating } = assignedXpert(t)
                const rev = t.reviews?.[0]?.rating
                const slots = Number(t.slotsNeeded) || 1
                const isUrgent = t.status === 'pending_confirmation' && slots <= 1
                const filled = Number(t.filledSlots) || 0
                const acceptedWorkers = (t as unknown as { acceptedWorkers?: XpertSlot[] }).acceptedWorkers
                const [showMap, setShowMap] = useState(false)
                const currentStep = currentStepIndex(t.status as string)
                const isTerminal = ['completed', 'employer_confirmed', 'payment_rejected', 'cancelled'].includes(t.status as string)

                return (
                  <div className={`rounded-2xl bg-white shadow-sm border border-ink-900/8 transition-shadow hover:shadow-md`}>
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-serif text-base font-semibold text-ink-900">{t.taskType || 'Task'}</p>
                          <p className="mt-0.5 text-sm text-ink-700">
                            {slots > 1
                              ? <span className="font-medium text-ink-800">{filled}/{slots} Xperts confirmed</span>
                              : workerName && <span className="font-medium text-ink-800">{workerName}{xpertRating > 0 ? ` ★ ${xpertRating.toFixed(1)}` : ''}</span>}
                            {(workerName || slots > 1) && t.location ? ' · ' : ''}{t.location || ''}
                            {t.duration ? ` · ${t.duration}` : ''}
                          </p>
                          {(t.scheduledDate as string) && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-forest-700">
                              <Clock size={11} aria-hidden="true" />
                              {new Date(`${t.scheduledDate as string}T${(t.scheduledTime as string) || '08:00'}:00`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={s.color + ' text-sm font-semibold'}>{s.label}</p>
                          {rev && <div className="mt-1 flex items-center justify-end gap-1"><Stars n={Number(rev)} /></div>}
                        </div>
                      </div>

                      {/* Multi-worker: show list of accepted workers */}
                      {slots > 1 && acceptedWorkers && acceptedWorkers.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {acceptedWorkers.map((w, i) => (
                            <div key={w.id} className="flex items-center gap-2 text-xs text-ink-700">
                              <span className="h-1.5 w-1.5 rounded-[9999px] bg-forest-600" />
                              <span className="font-medium">{w.acceptedBy?.fullName || `Xpert ${i + 1}`}</span>
                              {w.acceptedBy?.phone && <span className="text-ink-700/50">· {w.acceptedBy.phone}</span>}
                              {w.status === 'pending_confirmation' ? (
                                <button onClick={() => setRating({ ...t, id: w.id, status: w.status, acceptedBy: w.acceptedBy } as Task)}
                                  className="ml-auto rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-500">
                                  Confirm work & rate
                                </button>
                              ) : (
                                <span className="ml-auto font-medium text-ink-700/60">{st(w.status).label}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Progress stepper — only for active (non-terminal) jobs */}
                      {!isTerminal && currentStep >= 0 && (
                        <div className="mt-4 flex items-center gap-0">
                          {PROGRESS_STEPS.map(({ label }, i) => {
                            const active = i === currentStep
                            const done = i < currentStep
                            const last = i === PROGRESS_STEPS.length - 1
                            return (
                              <div key={label} className="flex flex-1 flex-col items-center">
                                <div className="flex w-full items-center">
                                  <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : done || active ? 'bg-forest-600' : 'bg-ink-900/10'}`} />
                                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold transition-colors ${
                                    done || active ? 'bg-forest-600 text-cream-50' : 'bg-gray-100 text-ink-700/50'
                                  }`}>
                                    {done ? '✓' : i + 1}
                                  </div>
                                  <div className={`h-0.5 flex-1 ${last ? 'invisible' : done ? 'bg-forest-600' : 'bg-ink-900/10'}`} />
                                </div>
                                <span className={`mt-1 px-1 text-center text-[0.6875rem] font-medium leading-tight ${active ? 'text-forest-700' : done ? 'text-ink-700/60' : 'text-ink-700/40'}`}>
                                  {label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Status note */}
                      {s.note && !isUrgent && (
                        <p className="mt-2.5 text-xs leading-relaxed text-ink-700/70">{s.note}</p>
                      )}

                      {t.status === 'invoice_sent' && (
                        <button onClick={() => goTab('invoices')}
                          className="mt-3 mr-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-500">
                          Review & pay invoice ({cedis(t.invoiceAmount ?? undefined)})
                        </button>
                      )}
                      <button
                        onClick={() => trackTask(t.id)}
                        className="mt-3 mr-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline"
                      >
                        Track task <ChevronRight size={14} aria-hidden="true" />
                      </button>

                      {/* Cancel — only while still searching, before anyone has committed */}
                      {['awaiting_invoice', 'invoice_sent', 'open', 'payment_pending'].includes(String(t.status)) && (
                        <button
                          onClick={() => cancelTask(t)}
                          className="mt-3 text-xs font-medium text-red-600/80 underline decoration-red-600/30 underline-offset-2 transition-colors hover:text-red-700"
                        >
                          Cancel this job
                        </button>
                      )}

                      {/* Urgent confirm action */}
                      {isUrgent && (
                        <div className="mt-4 border-t border-amber-100 pt-4">
                          <p className="text-sm text-ink-700">The Xpert has marked this job as complete.</p>
                          <button
                            onClick={() => setRating(t)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-5 py-3 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] focus:outline-none"
                          >
                            <ShieldCheck size={15} aria-hidden="true" /> Confirm work & release payment
                          </button>
                        </div>
                      )}

                      {/* Job location map */}
                      {t.location && t.location !== 'Remote' && (
                        <button
                          onClick={() => setShowMap((v) => !v)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-forest-700 hover:underline"
                        >
                          <Map size={12} aria-hidden="true" />
                          {showMap ? 'Hide map' : 'View job location on map'}
                        </button>
                      )}
                      {showMap && t.location && t.location !== 'Remote' && (
                        <div className="mt-2">
                          <JobLocationMap location={t.location as string} heightClass="h-48" showOpenLink />
                        </div>
                      )}

                      {/* Live location for accepted jobs */}
                      {t.status === 'accepted' && <LiveLocation taskId={t.id} />}
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-6">
                  {urgent.length > 0 && (
                    <section>
                      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-700">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[0.6875rem] font-bold text-white">{urgent.length}</span>
                        Need your confirmation
                      </h2>
                      <div className="space-y-3">{urgent.map((t) => <TaskItem key={String(t.id)} t={t} />)}</div>
                    </section>
                  )}

                  {active.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-700/50">In progress</h2>
                      <div className="space-y-3">{active.map((t) => <TaskItem key={String(t.id)} t={t} />)}</div>
                    </section>
                  )}

                  {done.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-700/50">Completed</h2>
                      <div className="space-y-3">{done.map((t) => <TaskItem key={String(t.id)} t={t} />)}</div>
                    </section>
                  )}
                </div>
              )
            })() : (
              <Empty icon={<Briefcase size={20} aria-hidden="true" />} text="No jobs yet. Post a task and BeyondX will send you an invoice." />
            )}
          </div>
        )}

          </div>
        </div>
      </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

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

/** An invoice BeyondX sent for a posted task: pay it (MoMo + reference) or
 *  decline it. Paying moves the task to "Verifying payment". */
function InvoiceCard({ task, onChanged }: { task: Task; onChanged: (msg: string) => void }) {
  const [method, setMethod] = useState(PAY_METHODS[0].id)
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState<'pay' | 'decline' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const amount = Number(task.invoiceAmount || 0)
  const xperts = Number(task.slotsNeeded) || 1

  const pay = async () => {
    if (!ref.trim() || busy) return
    setBusy('pay'); setErr(null)
    try { await tasksApi.payInvoice(task.id, ref.trim()); onChanged('Payment submitted — BeyondX is verifying it.') }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not submit payment. Please try again.'); setBusy(null) }
  }
  const decline = async () => {
    if (busy || !window.confirm('Decline this invoice? The request will be closed. You can post a new task at any time.')) return
    setBusy('decline'); setErr(null)
    try { await tasksApi.declineInvoice(task.id); onChanged('Invoice declined') }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not decline. Please try again.'); setBusy(null) }
  }

  return (
    <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink-900">{task.taskType || 'Task'}</p>
          <p className="mt-0.5 text-sm text-ink-700/70">
            {[task.location, task.duration, `${xperts} Xpert${xperts > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
            {task.premium ? ' · Premium (within 48 hours)' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-700/60">Invoice total</p>
          <p className="text-2xl font-bold text-ink-900">{cedis(amount)}</p>
        </div>
      </div>
      {task.invoiceNote && <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 px-4 py-3 text-sm text-ink-800">{task.invoiceNote}</p>}

      <div className="mt-5 border-t border-ink-900/8 pt-5">
        <p className="text-sm text-ink-800">
          Send <span className="font-semibold">{cedis(amount)}</span> to <span className="font-semibold">{MOMO_NUMBER}</span> ({MOMO_NAME}), then enter the transaction reference below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAY_METHODS.map((m) => (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${method === m.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-900/15 text-ink-700 hover:bg-ink-900/5'}`}>
              {m.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction reference"
            className="flex-1 rounded-lg border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />
          <button onClick={pay} disabled={!ref.trim() || !!busy}
            className="rounded-lg bg-forest-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50">
            {busy === 'pay' ? 'Submitting…' : 'Pay invoice'}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <button onClick={decline} disabled={!!busy} className="mt-4 text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
          {busy === 'decline' ? 'Declining…' : 'Decline invoice'}
        </button>
      </div>
    </div>
  )
}

function RateModal({ task, onClose, onDone, onError }: { task: Task; onClose: () => void; onDone: (worker: string) => void; onError: (m: string) => void }) {
  useEsc(onClose)
  const [skills, setSkills] = useState(0)
  const [professionalism, setProfessionalism] = useState(0)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const rated = skills > 0 && professionalism > 0 && stars > 0
  const [busy, setBusy] = useState(false)
  const { workerId } = dispatchDetails(task)
  const workerName = assignedXpert(task).name
  const worker = workerName || (typeof task.employer === 'string' ? task.employer : task.taskType || 'the Xpert')

  const submit = async () => {
    if (busy || !rated) return
    setBusy(true)
    try {
      await tasksApi.complete(task.id)
      await tasksApi.review(task.id, { rating: stars, skillsRating: skills, professionalismRating: professionalism }, comment).catch(() => null)
      const emp = session.employer()
      const orgName = (emp?.orgName as string) || 'An employer'
      contact.send({
        name: orgName,
        email: (emp?.email as string) || undefined,
        phone: (emp?.phone as string) || undefined,
        message:
          `${orgName} confirmed the work is complete. Payment is now due to the worker.\n\n` +
          `Worker: ${workerName || worker}${workerId ? ` (${workerId})` : ''}\n` +
          `Task: ${task.taskType || '—'}\nLocation: ${task.location || '—'}\nDuration: ${task.duration || '—'}\n` +
          `Worker is owed: GHS ${Number(task.pay || 0).toFixed(2)}\n` +
          `Employer rating: skills ${skills}/5, professionalism ${professionalism}/5, overall ${stars}/5\n` +
          (comment.trim() ? `Feedback: ${comment.trim()}\n` : '') +
          `\nPlease release the worker's payment to complete this job.`,
        category: 'payment_due',
      }).catch(() => null)
      onDone(worker)
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rt-title" className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-forest-700 px-6 py-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cream-50/15">
            <ShieldCheck size={22} aria-hidden="true" className="text-cream-50" />
          </div>
          <h2 id="rt-title" className="font-serif text-lg font-semibold text-cream-50">Confirm the work is done</h2>
          <p className="mt-1 text-xs text-forest-200/80">{task.taskType}{task.location ? ` · ${task.location}` : ''}</p>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm leading-relaxed text-ink-700">
            Once you confirm, BeyondX will release payment to {worker}. This cannot be undone.
          </p>

          {/* Ratings: skills and professionalism first, then overall */}
          <p className="mb-3 text-sm font-semibold text-ink-900">Rate {worker}</p>
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-ink-700">Skills</div>
              <StarPicker value={skills} onChange={setSkills} />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-ink-700">Professionalism</div>
              <StarPicker value={professionalism} onChange={setProfessionalism} />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-ink-700">Overall rating</div>
              <StarPicker value={stars} onChange={setStars} />
            </div>
          </div>

          <label htmlFor="rt-comment" className="sr-only">Optional feedback</label>
          <textarea id="rt-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            placeholder="Optional feedback for BeyondX (not shown publicly)"
            className="mt-4 w-full rounded-xl border border-ink-900/12 bg-gray-50 p-3 text-sm text-ink-900 placeholder:text-ink-700/50 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />

          <div className="mt-4 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-md border border-ink-900/15 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5">
              Not yet
            </button>
            <button onClick={submit} disabled={busy || !rated}
              className="flex-1 rounded-md bg-forest-600 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
              {busy ? 'Confirming…' : 'Yes, release payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
