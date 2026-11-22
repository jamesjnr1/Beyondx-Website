import { useCallback, useEffect, useRef, useState } from 'react'
import { ShieldCheck, AlertCircle, Repeat, Flag } from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar, { DashboardMobileNav, type DashboardNavItem } from '../components/DashboardSidebar'
import ActivityFeed, { type ActivityItem } from '../components/ActivityFeed'
import {
  SquaresFour, FilePlus as FilePlusP, Receipt, ClipboardText, Repeat as RepeatP, Lifebuoy, Briefcase as BriefcaseP,
  UsersThree, Wallet as WalletP, ArrowsClockwise, Plus, WarningCircle, MapPin as MapPinP, CalendarBlank, UserCircle,
  Buildings, Star as StarP, ShieldCheck as ShieldCheckP, Tray, HardHat, Hourglass, CheckCircle as CheckCircleP, CaretRight, Flag as FlagP,
} from '@phosphor-icons/react'
import {
  PageHeader, KpiTile, Panel, Status, toneFromClass, InfoRow, ListRow, AlertBanner, EmptyState, SkeletonRows, TextTabs,
  btnPrimary, btnSecondary, btnGhost, type IconType,
} from '../components/dash/kit'
import ProfileModal from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import TrackingMap from '../components/tasks/TrackingMap'
import {
  tasks as tasksApi, employers as employersApi,
  contact, session, ApiError, scheduleLabel, type Task, type Employer, type AssignedXpert, type RecurringService,
} from '../lib/api'
import { takeRequestCategory } from '../lib/requestIntent'
import { useEsc, RatingRow, LiveJobSteps, JobNotices, XpertSummary, FlagModal } from '../components/tasks/JobParts'
import { MOMO_NUMBER, MOMO_NAME, PAY_METHODS } from '../lib/payments'
import { useRefreshOnResume } from '../hooks/useRefreshOnResume'
import NotificationsBanner from '../components/NotificationsBanner'
import PostTaskWizard, { type SubmittedTask } from '../components/tasks/PostTaskWizard'
import TaskSubmitted from '../components/tasks/TaskSubmitted'
import TaskTracking from '../components/tasks/TaskTracking'
import { PROGRESS_STEPS, currentStepIndex } from '../components/tasks/taskProgress'

const cedis = (n?: number | string) => `GH\u20b5 ${Number(n || 0).toLocaleString()}`
const STATUS: Record<string, { label: string; color: string; bar: string; note?: string; urgent?: boolean }> = {
  awaiting_invoice:   { label: 'Under review',        color: 'text-ink-700',     bar: 'bg-ink-900/20', note: 'BeyondX is reviewing your request and will send you a quote shortly.' },
  invoice_sent:       { label: 'Quote ready',         color: 'text-amber-700',   bar: 'bg-amber-400',  note: 'Your quote is ready. Accept or decline it under Awaiting your response.', urgent: true },
  payment_pending:    { label: 'Verifying payment',   color: 'text-amber-700',   bar: 'bg-amber-400',  note: 'We received your payment details and are confirming the transaction — usually within a few minutes.' },
  offered:            { label: 'Xpert assigned',      color: 'text-ink-700',     bar: 'bg-ink-900/30', note: 'BeyondX has selected an Xpert, who is confirming the job.' },
  open:               { label: 'Matching an Xpert',   color: 'text-ink-500',     bar: 'bg-ink-900/20', note: 'Payment confirmed. BeyondX is selecting the right Xpert for this job.' },
  expired:            { label: 'Matching an Xpert',   color: 'text-ink-500',     bar: 'bg-ink-900/20', note: 'BeyondX is selecting another Xpert for this job.' },
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
type XpertSlot = { id: string; status: string; arrivedAt?: string | null; startedAt?: string | null; acceptedBy?: AssignedXpert }

/** True when the job (or, on a multi-Xpert job, any one Xpert's part of it) is waiting on the employer to confirm. */
const needsConfirmation = (t: Task) =>
  t.status === 'pending_confirmation' ||
  !!(t as unknown as { acceptedWorkers?: XpertSlot[] }).acceptedWorkers?.some((w) => w.status === 'pending_confirmation')

function assignedXpert(t: Task) {
  const a = t.acceptedBy as AssignedXpert | undefined
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

function Empty({ text, icon }: { text: string; icon: IconType }) {
  return <Panel bodyClassName=""><EmptyState icon={icon} text={text} /></Panel>
}
function Skeleton() {
  return <SkeletonRows rows={3} />
}

export default function EmployerDashboard() {
  // A category clicked on the public site opens the request flow with it chosen.
  const [initialCategory] = useState(() => takeRequestCategory())
  const [tab, setTab] = useState<'overview' | 'post' | 'invoices' | 'history' | 'recurring' | 'support'>(initialCategory ? 'post' : 'overview')
  const [flagging, setFlagging] = useState<Task | null>(null)
  const [services, setServices] = useState<RecurringService[]>([])
  const [rating, setRating] = useState<Task | null>(null)
  const [editing, setEditing] = useState(false)
  const [submitted, setSubmitted] = useState<SubmittedTask | null>(null)
  const [trackingId, setTrackingId] = useState<string | number | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null)
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
      const [tRes, pRes, rRes] = await Promise.all([
        tasksApi.all(),
        employersApi.profile().catch(() => null),
        tasksApi.recurring().catch(() => null),
      ])
      setTaskList(tRes?.tasks || [])
      setServices(rRes?.services || [])
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
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    { id: 'post', label: 'Request an Xpert', icon: FilePlusP },
    { id: 'invoices', label: 'Quotes & Invoices', icon: Receipt, badge: invoicesDue.length },
    { id: 'history', label: 'My Jobs', icon: ClipboardText, badge: pendingConfirmCount },
    { id: 'recurring', label: 'Recurring Services', icon: RepeatP },
    { id: 'support', label: 'Support', icon: Lifebuoy },
  ]

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
        icon: <BriefcaseP size={20} weight="duotone" />,
        title: t.taskType || 'Task',
        detail: t.location as string | undefined,
        status: { label: s.label, tone },
      }
    })

  return (
    <div className="min-h-screen bg-cream-50">
      <DashboardHeader role="EMPLOYER" title="Employer Dashboard" name={orgName} avatar={logo} onEditProfile={() => setEditing(true)} tasks={taskList}
        cta={{ label: 'Request an Xpert', onClick: () => goTab('post') }} />
      <div className="lg:pl-64">
        <DashboardSidebar items={navItems} active={tab} onSelect={goTab} roleLabel="Employer" onEditProfile={() => setEditing(true)}
          card={{ title: 'Need an Xpert?', text: 'Tell us the job and we send one firm quote.', label: 'Request an Xpert', onClick: () => goTab('post') }} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <p aria-live="polite" className="sr-only">{announce}</p>

        {!taskScreen && <NotificationsBanner role="employer" />}

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}</p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">Try again</button>
          </div>
        )}

        {!taskScreen && (() => {
          const meta: Record<string, { title: string; subtitle: string }> = {
            overview: {
              title: `Welcome back, ${orgName}`,
              subtitle: pendingConfirmCount > 0
                ? `${pendingConfirmCount} job${pendingConfirmCount === 1 ? '' : 's'} waiting on your confirmation.`
                : activeJobsCount > 0 ? `${activeJobsCount} active job${activeJobsCount === 1 ? '' : 's'} right now.`
                : 'Here is everything happening with your requests and jobs.',
            },
            invoices: { title: 'Quotes & invoices', subtitle: 'BeyondX reviews every request and sends one firm quote. Accept it to have the right Xpert assigned, or decline it to close the request. There is no counter offer.' },
            history: { title: 'My jobs', subtitle: 'Every job you have requested, from review to payment.' },
            recurring: { title: 'Recurring services', subtitle: 'Work you need regularly. BeyondX assigns a preferred team and prioritises them for every visit.' },
            support: { title: 'Support', subtitle: 'Questions, a problem on a job, or feedback. Our team replies quickly.' },
          }
          const m = meta[tab] || meta.overview
          return (
            <PageHeader title={m.title} subtitle={m.subtitle} actions={
              <>
                <button onClick={() => { setLoading(true); load() }} aria-label="Refresh dashboard" className={btnSecondary}>
                  <ArrowsClockwise size={16} weight="bold" /> Refresh
                </button>
              </>
            } />
          )
        })()}

        <div>
          <DashboardMobileNav items={navItems} active={tab} onSelect={goTab} />

          <div className="min-w-0 flex-1">
            {tab === 'overview' && (
              <div className="space-y-6">
                {(invoicesDue.length > 0 || pendingConfirmCount > 0) && (
                  <AlertBanner
                    tone="warning"
                    icon={WarningCircle}
                    title={pendingConfirmCount > 0
                      ? `${pendingConfirmCount} job${pendingConfirmCount === 1 ? ' is' : 's are'} waiting for you to confirm the work`
                      : `${invoicesDue.length} quote${invoicesDue.length === 1 ? ' is' : 's are'} ready for your response`}
                    text={pendingConfirmCount > 0 ? 'Confirming releases payment to the Xpert.' : 'Accept and pay to have an Xpert assigned, or decline to close the request.'}
                    action={<button onClick={() => goTab(pendingConfirmCount > 0 ? 'history' : 'invoices')} className={btnPrimary}>Review now</button>}
                  />
                )}

                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                  <KpiTile tone="green" icon={BriefcaseP} label="Active jobs" value={activeJobsCount}
                    hint={pendingConfirmCount ? `${pendingConfirmCount} waiting on you` : 'In progress right now'} onClick={() => goTab('history')} />
                  <KpiTile tone="teal" icon={Receipt} label="Quotes to review" value={invoicesDue.length}
                    hint={invoicesDue.length ? 'Ready for your response' : 'Nothing waiting'} onClick={() => goTab('invoices')} />
                  <KpiTile tone="blue" icon={UsersThree} label="Xperts hired" value={workersHiredCount} hint="Across all your jobs" />
                  <KpiTile tone="violet" icon={WalletP} label="Spend this month" value={cedis(spendThisMonth)} hint="Paid to Xperts" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Panel className="lg:col-span-2" title="Next job" subtitle="The job that needs attention first" icon={HardHat}
                    action={nextActiveTask ? <button onClick={() => trackTask(nextActiveTask.id)} className={btnGhost}>Track job</button> : undefined}>
                    {nextActiveTask ? (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-display text-xl font-semibold text-ink-900">{nextActiveTask.taskType || 'Task'}</p>
                          <Status tone={toneFromClass(st(nextActiveTask.status).color)}>{st(nextActiveTask.status).label}</Status>
                        </div>
                        <div className="mt-3 divide-y divide-ink-900/[0.06]">
                          {nextActiveTask.location && <InfoRow icon={MapPinP} label="Location">{nextActiveTask.location}</InfoRow>}
                          {!!nextActiveTask.scheduledDate && (
                            <InfoRow icon={CalendarBlank} label="Scheduled">
                              {new Date(`${nextActiveTask.scheduledDate}T${(nextActiveTask.scheduledTime as string) || '08:00'}:00`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </InfoRow>
                          )}
                          {assignedXpert(nextActiveTask).name && <InfoRow icon={UserCircle} label="Xpert">{assignedXpert(nextActiveTask).name}</InfoRow>}
                          {nextActiveTask.invoiceAmount != null && Number(nextActiveTask.invoiceAmount) > 0 && (
                            <InfoRow icon={WalletP} label="Quote">{cedis(nextActiveTask.invoiceAmount ?? undefined)}</InfoRow>
                          )}
                        </div>
                        {st(nextActiveTask.status).note && <p className="mt-3 text-sm leading-relaxed text-ink-700/70">{st(nextActiveTask.status).note}</p>}
                        <button onClick={() => trackTask(nextActiveTask.id)} className={`${btnPrimary} mt-5`}>View details</button>
                      </div>
                    ) : (
                      <EmptyState icon={Hourglass} title="No active jobs" text="When you request an Xpert, the job and its progress show here."
                        action={<button onClick={() => goTab('post')} className={btnPrimary}><Plus size={16} weight="bold" /> Request an Xpert</button>} />
                    )}
                  </Panel>

                  <Panel title="Your account" icon={Buildings}>
                    <Status tone="success">Active employer</Status>
                    <p className="mt-2 text-sm text-ink-700/70">
                      {invoicesDue.length > 0 ? `${invoicesDue.length} quote${invoicesDue.length === 1 ? '' : 's'} awaiting your response.`
                        : pendingConfirmCount > 0 ? `${pendingConfirmCount} job${pendingConfirmCount === 1 ? '' : 's'} waiting on your confirmation.`
                        : "You're all caught up."}
                    </p>
                    {Number(profile?.rating || 0) > 0 && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-ink-700">
                        <StarP size={18} weight="fill" className="text-amber-500" />
                        <span className="font-semibold text-ink-900">{Number(profile?.rating).toFixed(1)}</span> rating from Xperts
                      </div>
                    )}
                    <div className="-mx-5 mt-4 divide-y divide-ink-900/[0.06] border-t border-ink-900/[0.06] sm:-mx-6">
                      <ListRow icon={FilePlusP} title="Request an Xpert" detail="Get one firm quote" onClick={() => goTab('post')} />
                      <ListRow icon={RepeatP} title="Recurring services" detail="Regular work, preferred team" onClick={() => goTab('recurring')} />
                      <ListRow icon={ShieldCheckP} title="Support" detail="We reply quickly" onClick={() => goTab('support')} />
                    </div>
                  </Panel>
                </div>

                {loading ? <Skeleton /> : (
                  <ActivityFeed title="Recent activity" items={recentActivity} empty="No activity yet. Your requests will show up here." />
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

        {tab === 'invoices' && (
          <div className="space-y-4">
            {loading ? <Skeleton /> : invoicesDue.length ? invoicesDue.map((t) => (
              <InvoiceCard key={String(t.id)} task={t} onChanged={(msg) => { setToast({ id: Date.now(), kind: 'success', title: msg, detail: '' }); load() }} />
            )) : (
              <Empty icon={Tray} text="No quotes waiting. When BeyondX finishes reviewing a request, its quote appears here." />
            )}
            {taskList.some((t) => t.status === 'awaiting_invoice') && (
              <p className="text-sm text-ink-700/70">
                {taskList.filter((t) => t.status === 'awaiting_invoice').length} request(s) under review — quotes are on the way.
              </p>
            )}
          </div>
        )}

        {tab === 'recurring' && (
          <div className="space-y-4">
            {loading ? <Skeleton /> : services.length ? services.map((sv) => (
              <div key={sv.id} className="rounded-2xl border border-ink-900/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(18,24,14,0.04)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink-900">{sv.taskType}{sv.location ? ` at ${sv.location}` : ''}</p>
                    <p className="mt-0.5 text-sm text-ink-700/75">{scheduleLabel(sv.schedulePattern)} · {sv.workersNeeded} Xpert{sv.workersNeeded === 1 ? '' : 's'}</p>
                  </div>
                  <Status tone={sv.active ? 'success' : 'muted'}>{sv.active ? 'Active' : 'Paused'}</Status>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                  <p><span className="text-ink-700/60">Preferred team:</span> {sv.preferredTeamAssigned ? 'Assigned by BeyondX' : 'Being assigned by BeyondX'}</p>
                  <p><span className="text-ink-700/60">Next service:</span> {sv.nextServiceDate ? new Date(`${sv.nextServiceDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'To be scheduled'}</p>
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm text-ink-700">
                  <Repeat size={15} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />
                  Your usual team will be prioritized whenever available. If they cannot make it, we will arrange a replacement.
                </p>
              </div>
            )) : (
              <Empty icon={RepeatP} text="No recurring services yet. When you request an Xpert, choose “Recurring” to set one up." />
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
            initialCategory={initialCategory}
            onSubmitted={(s) => { setSubmitted(s); load() }}
            onContactSupport={() => goTab('support')}
            onBack={() => goTab('overview')}
          />
        ))}

        {tab === 'history' && trackingId != null && (() => {
          const t = taskList.find((x) => String(x.id) === String(trackingId))
          if (!t) return loading ? <Skeleton /> : (
            <Empty icon={BriefcaseP} text="This task isn't in your list yet — refresh in a moment." />
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
          loading ? <Skeleton /> : taskList.length ? (
            <JobsConsole
              tasks={taskList}
              selectedId={selectedJobId}
              onSelect={setSelectedJobId}
              onTrack={trackTask}
              onConfirm={(t) => setRating(t)}
              onReviewQuote={() => goTab('invoices')}
              onCancel={cancelTask}
              onFlag={(t) => setFlagging(t)}
            />
          ) : (
            <Empty icon={BriefcaseP} text="No jobs yet. Request an Xpert and BeyondX will send you a quote." />
          )
        )}
          </div>
        </div>
      </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {rating && <RateModal task={rating} onClose={() => setRating(null)} onDone={afterConfirm} onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not confirm', detail: m })} />}
      {flagging && <FlagModal task={flagging} side="employer" token={session.employerToken()} onClose={() => setFlagging(null)}
        onDone={() => { setFlagging(null); setToast({ id: Date.now(), kind: 'success', title: 'Report sent', detail: 'BeyondX will review it and follow up with you.' }) }} />}
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

/* ------------------------------ My Jobs console ----------------------------- */

const isTerminalStatus = (s?: string) => ['completed', 'employer_confirmed', 'payment_rejected', 'cancelled'].includes(String(s))
const jobWhen = (t: Task) => t.scheduledDate
  ? new Date(`${t.scheduledDate as string}T${(t.scheduledTime as string) || '08:00'}:00`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : undefined
const onSite = (t: Task) => !!t.location && String(t.location).toLowerCase() !== 'remote'

type JobGroup = 'action' | 'active' | 'upcoming' | 'past'
function groupOf(t: Task): JobGroup {
  const today = new Date().toISOString().slice(0, 10)
  if (needsConfirmation(t) || t.status === 'invoice_sent') return 'action'
  if (isTerminalStatus(t.status)) return 'past'
  const activeNow = t.status === 'accepted' || (!!t.scheduledDate && String(t.scheduledDate) <= today && ['open', 'offered', 'expired'].includes(String(t.status)))
  return activeNow ? 'active' : 'upcoming'
}

/** My Jobs as a two-pane console: a compact list grouped by what each job needs,
 *  and the selected job in full (map first, then progress, the Xpert and every
 *  action). On phones the detail sits under the list. */
function JobsConsole({ tasks, selectedId, onSelect, onTrack, onConfirm, onReviewQuote, onCancel, onFlag }: {
  tasks: Task[]
  selectedId: string | number | null
  onSelect: (id: string | number) => void
  onTrack: (id: string | number) => void
  onConfirm: (t: Task) => void
  onReviewQuote: () => void
  onCancel: (t: Task) => void
  onFlag: (t: Task) => void
}) {
  const groups: { id: JobGroup; label: string }[] = [
    { id: 'action', label: 'Needs you' }, { id: 'active', label: 'Active' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' },
  ]
  const byGroup = (g: JobGroup) => tasks.filter((t) => groupOf(t) === g)
  const firstNonEmpty = groups.find((g) => byGroup(g.id).length)?.id || 'active'
  const [group, setGroup] = useState<JobGroup>(firstNonEmpty)
  const list = byGroup(group)
  const selected = tasks.find((t) => String(t.id) === String(selectedId)) || list[0] || tasks[0]
  const detailRef = useRef<HTMLDivElement | null>(null)

  const pick = (t: Task) => {
    onSelect(t.id)
    if (window.innerWidth < 1024) window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[25rem_minmax(0,1fr)] lg:items-start">
      {/* List */}
      <Panel bodyClassName="" className="lg:sticky lg:top-24">
        <div className="border-b border-ink-900/[0.06] px-5 pt-4">
          <TextTabs label="Job groups" active={group} onChange={(g) => { setGroup(g); const first = byGroup(g)[0]; if (first) onSelect(first.id) }}
            tabs={groups.map((g) => ({ id: g.id, label: g.label, count: byGroup(g.id).length }))} />
        </div>
        {list.length ? (
          <ul className="max-h-[32rem] divide-y divide-ink-900/[0.06] overflow-y-auto">
            {list.map((t) => {
              const s = st(t.status)
              const on = selected && String(selected.id) === String(t.id)
              return (
                <li key={String(t.id)}>
                  <button onClick={() => pick(t)} aria-current={on ? 'true' : undefined}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${on ? 'bg-forest-50' : 'hover:bg-cream-50'}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${on ? 'bg-forest-600' : 'bg-transparent'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate font-display text-[0.9375rem] font-semibold text-ink-900">{t.taskType || 'Task'}</span>
                        {Number(t.invoiceAmount) > 0 && <span className="shrink-0 text-sm font-semibold text-ink-900">{cedis(t.invoiceAmount ?? undefined)}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-700/60">{[t.location, jobWhen(t)].filter(Boolean).join(' · ')}</span>
                      <span className="mt-1.5 block"><Status tone={toneFromClass(s.color)}>{s.label}</Status></span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={Tray} text={group === 'action' ? "Nothing needs you right now." : group === 'past' ? 'No past jobs yet.' : 'No jobs here yet.'} />
        )}
      </Panel>

      {/* Detail */}
      <div ref={detailRef} className="scroll-mt-24">
        {selected ? <JobDetail key={String(selected.id)} t={selected} onTrack={onTrack} onConfirm={onConfirm} onReviewQuote={onReviewQuote} onCancel={onCancel} onFlag={onFlag} /> : null}
      </div>
    </div>
  )
}

function JobDetail({ t, onTrack, onConfirm, onReviewQuote, onCancel, onFlag }: {
  t: Task; onTrack: (id: string | number) => void; onConfirm: (t: Task) => void; onReviewQuote: () => void; onCancel: (t: Task) => void; onFlag: (t: Task) => void
}) {
  const s = st(t.status)
  const slots = Number(t.slotsNeeded) || 1
  const filled = Number(t.filledSlots) || 0
  const xpert = assignedXpert(t)
  const terminal = isTerminalStatus(t.status)
  const step = currentStepIndex(t.status as string)
  const acceptedWorkers = (t as unknown as { acceptedWorkers?: XpertSlot[] }).acceptedWorkers
  const myReview = t.reviews?.find((r) => r.fromRole === 'employer')
  const theirReview = t.reviews?.find((r) => r.fromRole === 'worker')
  const urgentConfirm = t.status === 'pending_confirmation' && slots <= 1
  const cancellable = ['awaiting_invoice', 'invoice_sent', 'open', 'payment_pending'].includes(String(t.status))
  const live = ['accepted', 'pending_confirmation'].includes(String(t.status))

  return (
    <div className="space-y-6">
      <Panel bodyClassName="">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold text-ink-900 sm:text-2xl">{t.taskType || 'Task'}</p>
            <p className="mt-1 text-sm text-ink-700/65">{[t.location, jobWhen(t), `${slots} Xpert${slots > 1 ? 's' : ''}`, t.duration].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <Status tone={toneFromClass(s.color)}>{s.label}</Status>
            {Number(t.invoiceAmount) > 0 && <p className="mt-1 font-display text-xl font-bold text-forest-800">{cedis(t.invoiceAmount ?? undefined)}</p>}
          </div>
        </div>

        {/* Needs-you call to action */}
        {(urgentConfirm || t.status === 'invoice_sent') && (
          <div className="mx-5 mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 sm:mx-6 sm:flex-row sm:items-center">
            <WarningCircle size={22} weight="duotone" className="shrink-0 text-amber-700" />
            <p className="flex-1 text-sm text-amber-900">
              {urgentConfirm ? 'The Xpert has marked this job as done. Confirm to release their payment.' : 'Your quote is ready. Accept and pay to have an Xpert assigned, or decline it.'}
            </p>
            {urgentConfirm
              ? <button onClick={() => onConfirm(t)} className={btnPrimary}><ShieldCheckP size={16} weight="bold" /> Confirm & release payment</button>
              : <button onClick={onReviewQuote} className={btnPrimary}>Review quote</button>}
          </div>
        )}

        {/* Map */}
        {onSite(t) && (
          <div className="px-5 pt-5 sm:px-6">
            <TrackingMap task={t} xpertName={xpert.name || undefined} live={live} compact />
          </div>
        )}

        {/* Progress */}
        {!terminal && step >= 0 && (
          <div className="px-5 pt-6 sm:px-6">
            <ol className="flex items-start">
              {PROGRESS_STEPS.map(({ label }, i) => {
                const done = i < step, active = i === step, last = i === PROGRESS_STEPS.length - 1
                return (
                  <li key={label} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : done || active ? 'bg-forest-600' : 'bg-ink-900/10'}`} />
                      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold ${done || active ? 'bg-forest-600 text-white' : 'bg-ink-900/[0.06] text-ink-700/50'} ${active ? 'ring-4 ring-forest-600/15' : ''}`}>
                        {done ? <CheckCircleP size={14} weight="bold" /> : i + 1}
                      </div>
                      <div className={`h-0.5 flex-1 ${last ? 'invisible' : done ? 'bg-forest-600' : 'bg-ink-900/10'}`} />
                    </div>
                    <span className={`mt-1.5 hidden px-1 text-center text-[0.6875rem] font-medium leading-tight sm:block ${active ? 'text-forest-700' : done ? 'text-ink-700/60' : 'text-ink-700/40'}`}>{label}</span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-sm font-semibold text-forest-800 sm:hidden">{PROGRESS_STEPS[step]?.label}</p>
            {s.note && !urgentConfirm && <p className="mt-2 text-sm leading-relaxed text-ink-700/70">{s.note}</p>}
          </div>
        )}

        {/* Xpert(s) and live job steps */}
        <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
          {slots <= 1 && !terminal && ['offered', 'accepted', 'pending_confirmation'].includes(String(t.status)) && !t.replacementInProgress && (
            <XpertSummary xpert={t.acceptedBy as AssignedXpert | undefined} taskType={t.taskType} />
          )}
          {slots > 1 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink-900">{filled}/{slots} Xperts confirmed</p>
              {acceptedWorkers && acceptedWorkers.length > 0 && (
                <ul className="mt-2 divide-y divide-ink-900/[0.06] rounded-xl border border-ink-900/[0.08]">
                  {acceptedWorkers.map((w, i) => (
                    <li key={w.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <UserCircle size={20} weight="duotone" className="shrink-0 text-forest-700" />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{w.acceptedBy?.fullName || `Xpert ${i + 1}`}</span>
                      {w.status === 'pending_confirmation'
                        ? <button onClick={() => onConfirm({ ...t, id: w.id, status: w.status, acceptedBy: w.acceptedBy } as Task)} className={btnPrimary}>Confirm & rate</button>
                        : <Status tone={toneFromClass(st(w.status).color)}>{st(w.status).label}</Status>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {live && <LiveJobSteps task={t} />}
          <JobNotices task={t} />

          {terminal && (
            <div className="mt-4 grid gap-3 rounded-xl bg-forest-50 px-4 py-3.5 text-sm sm:grid-cols-3">
              <div><span className="block text-xs text-ink-700/60">Amount</span><span className="font-semibold text-ink-900">{t.invoiceAmount != null ? cedis(t.invoiceAmount ?? undefined) : '—'}</span></div>
              <div><span className="block text-xs text-ink-700/60">Payment reference</span><span className="font-semibold text-ink-900">{String(t.paymentRef || '—')}</span></div>
              <div><span className="block text-xs text-ink-700/60">Feedback</span><span className="font-semibold text-ink-900">{myReview ? `You rated ${myReview.rating}/5` : 'Not given'}</span>{theirReview ? <span className="block text-xs text-ink-700/60">Xpert rated you {theirReview.rating}/5</span> : null}</div>
            </div>
          )}
          {terminal && xpert.name && (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-700"><UserCircle size={18} weight="duotone" className="text-forest-700" /> {xpert.name}{xpert.rating > 0 ? ` · ${xpert.rating.toFixed(1)} rating` : ''}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-900/[0.06] bg-cream-50/60 px-5 py-3.5 sm:px-6">
          <button onClick={() => onTrack(t.id)} className={btnSecondary}>Full tracking <CaretRight size={14} weight="bold" /></button>
          {['employer_confirmed', 'completed'].includes(String(t.status)) && (
            <button onClick={() => onFlag(t)} className={btnGhost}><FlagP size={16} weight="duotone" /> Report an incident</button>
          )}
          {cancellable && (
            <button onClick={() => onCancel(t)} className="ml-auto text-sm font-medium text-red-600 hover:underline">Cancel this job</button>
          )}
        </div>
      </Panel>
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
    if (busy || !window.confirm('Decline this quote? The request will be closed. You can make a new request at any time.')) return
    setBusy('decline'); setErr(null)
    try { await tasksApi.declineInvoice(task.id); onChanged('Quote declined') }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not decline. Please try again.'); setBusy(null) }
  }

  return (
    <div className="rounded-2xl border border-ink-900/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(18,24,14,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold text-ink-900">{task.taskType || 'Task'}</p>
          <p className="mt-0.5 text-sm text-ink-700/70">
            {[task.location, task.duration, `${xperts} Xpert${xperts > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
            {task.premium ? ' · Premium (within 48 hours)' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-700/60">Quote total</p>
          <p className="font-display text-3xl font-bold text-forest-800">{cedis(amount)}</p>
        </div>
      </div>
      {task.invoiceNote && <p className="mt-3 whitespace-pre-line rounded-xl bg-forest-50 px-4 py-3 text-sm text-ink-800">{task.invoiceNote}</p>}

      <div className="mt-5 border-t border-ink-900/8 pt-5">
        <p className="mb-2 text-sm text-ink-700">To accept, pay the quote in full. Payment is held by BeyondX and released to the Xpert after you confirm the work.</p>
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
            className={btnPrimary}>
            {busy === 'pay' ? 'Submitting…' : 'Accept & pay'}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <button onClick={decline} disabled={!!busy} className="mt-4 text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
          {busy === 'decline' ? 'Declining…' : 'Decline quote'}
        </button>
      </div>
    </div>
  )
}

function RateModal({ task, onClose, onDone, onError }: { task: Task; onClose: () => void; onDone: (worker: string) => void; onError: (m: string) => void }) {
  useEsc(onClose)
  const [scores, setScores] = useState({ attendanceRating: 0, skillsRating: 0, professionalismRating: 0, taskCompletionRating: 0, rating: 0 })
  const [priceFairness, setPriceFairness] = useState<'' | 'fair' | 'too_high' | 'too_low'>('')
  const [comment, setComment] = useState('')
  const [incident, setIncident] = useState(false)
  const [incidentText, setIncidentText] = useState('')
  const [incidentDate, setIncidentDate] = useState(String(task.scheduledDate || new Date().toISOString().slice(0, 10)))
  const rated = Object.values(scores).every((n) => n > 0) && !!priceFairness && (!incident || incidentText.trim().length >= 10)
  const [busy, setBusy] = useState(false)
  const { workerId } = dispatchDetails(task)
  const workerName = assignedXpert(task).name
  const worker = workerName || 'the Xpert'
  const set = (k: keyof typeof scores) => (n: number) => setScores((s) => ({ ...s, [k]: n }))

  const submit = async () => {
    if (busy || !rated || !priceFairness) return
    setBusy(true)
    try {
      await tasksApi.complete(task.id)
      await tasksApi.review(task.id, { ...scores, priceFairness }, comment).catch(() => null)
      if (incident) {
        await tasksApi.flag(task.id, { category: 'Reported at confirmation', incidentDescription: incidentText.trim(), incidentDate }, session.employerToken()).catch(() => null)
      }
      const emp = session.employer()
      const orgName = (emp?.orgName as string) || 'An employer'
      contact.send({
        name: orgName,
        email: (emp?.email as string) || undefined,
        phone: (emp?.phone as string) || undefined,
        message:
          `${orgName} confirmed the work is complete. Payment is now due to the Xpert.\n\n` +
          `Xpert: ${worker}${workerId ? ` (${workerId})` : ''}\n` +
          `Task: ${task.taskType || '—'}\nLocation: ${task.location || '—'}\nDuration: ${task.duration || '—'}\n` +
          `Xpert is owed: GHS ${Number(task.pay || 0).toFixed(2)}\n` +
          `\nPlease release the Xpert's payment to complete this job.`,
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
      <div role="dialog" aria-modal="true" aria-labelledby="rt-title" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-forest-700 px-6 py-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cream-50/15">
            <ShieldCheck size={22} aria-hidden="true" className="text-cream-50" />
          </div>
          <h2 id="rt-title" className="font-serif text-lg font-semibold text-cream-50">How did the job go?</h2>
          <p className="mt-1 text-xs text-forest-200/80">{task.taskType}{task.location ? ` · ${task.location}` : ''}</p>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm leading-relaxed text-ink-700">
            Once you confirm, BeyondX will release payment to {worker}. This cannot be undone.
          </p>

          <p className="mb-2 text-sm font-semibold text-ink-900">Rate {worker}</p>
          <div className="space-y-2.5">
            <RatingRow label="Attendance" value={scores.attendanceRating} onChange={set('attendanceRating')} />
            <RatingRow label="Quality of work (skills)" value={scores.skillsRating} onChange={set('skillsRating')} />
            <RatingRow label="Professionalism" value={scores.professionalismRating} onChange={set('professionalismRating')} />
            <RatingRow label="Task completion" value={scores.taskCompletionRating} onChange={set('taskCompletionRating')} />
            <RatingRow label="Overall experience" value={scores.rating} onChange={set('rating')} />
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold text-ink-900">Was the price fair for the work done?</legend>
            <div className="grid grid-cols-3 gap-2">
              {([['fair', 'Fair'], ['too_high', 'Too high'], ['too_low', 'Too low']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setPriceFairness(v)} aria-pressed={priceFairness === v}
                  className={`rounded-md border px-2 py-2 text-sm ${priceFairness === v ? 'border-forest-600 bg-gray-50 font-semibold text-forest-700' : 'border-ink-900/15 text-ink-700'}`}>{l}</button>
              ))}
            </div>
          </fieldset>

          <label htmlFor="rt-comment" className="sr-only">Optional feedback</label>
          <textarea id="rt-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            placeholder="Optional feedback for BeyondX (private)"
            className="mt-4 w-full rounded-xl border border-ink-900/12 bg-gray-50 p-3 text-sm text-ink-900 placeholder:text-ink-700/50 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25" />

          <label className="mt-3 flex items-start gap-2 text-sm text-ink-800">
            <input type="checkbox" checked={incident} onChange={(e) => setIncident(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span><Flag size={13} className="mr-1 inline" aria-hidden="true" />Something specific went wrong — report an incident</span>
          </label>
          {incident && (
            <div className="mt-2 space-y-2">
              <textarea value={incidentText} onChange={(e) => setIncidentText(e.target.value)} rows={3}
                placeholder="What happened? Be specific."
                className="w-full rounded-lg border border-ink-900/15 p-3 text-sm outline-none focus:border-forest-600" />
              <label className="block text-xs font-medium text-ink-700">When did it happen?
                <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="mt-1 block rounded-md border border-ink-900/15 px-2 py-1.5 text-sm" />
              </label>
            </div>
          )}

          <div className="mt-5 flex gap-2">
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
