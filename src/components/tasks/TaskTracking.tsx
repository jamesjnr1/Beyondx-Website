import { Check, ChevronRight, ShieldCheck, XCircle } from 'lucide-react'
import type { Task } from '../../lib/api'
import { PROGRESS_STEPS, STOPPED_LABEL, currentStepIndex, taskReference } from './taskProgress'

const cedis = (n?: number | string) => `GH₵ ${Number(n || 0).toLocaleString()}`

export default function TaskTracking({ task, workerName, statusLabel, onBack, onContactSupport, onCancel, onConfirm, onPayInvoice }: {
  task: Task
  /** Name of the assigned worker, when the dashboard can tell. */
  workerName?: string
  statusLabel: string
  onBack: () => void
  onContactSupport: () => void
  onCancel?: () => void
  onConfirm?: () => void
  onPayInvoice?: () => void
}) {
  const status = String(task.status || 'open')
  const current = currentStepIndex(status)
  const stopped = current === -1
  const slots = Number(task.slotsNeeded ?? task.workersNeeded) || 1
  const filled = Number(task.filledSlots) || 0
  const postedAt = task.createdAt
    ? new Date(task.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : undefined
  const date = task.scheduledDate
    ? new Date(`${task.scheduledDate as string}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined
  const startTime = task.scheduledDate && task.scheduledTime
    ? new Date(`${task.scheduledDate as string}T${task.scheduledTime as string}:00`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : undefined

  const statusColor = stopped ? 'text-red-700' : status === 'pending_confirmation' ? 'text-amber-700' : 'text-forest-700'

  const subline = [task.taskType, task.location, date, `${slots} Xpert${slots > 1 ? 's' : ''}`, task.duration].filter(Boolean)

  const details: [string, string | number][] = [
    ['Task category', task.taskType || 'Task'],
    ...(task.location ? [['Location', task.location] as [string, string]] : []),
    ['Date', date || 'Flexible'],
    ...(startTime ? [['Start time', startTime] as [string, string]] : []),
    ...(task.duration ? [['Expected duration', task.duration] as [string, string]] : []),
    ['Number of Xperts', slots],
    ...(task.invoiceAmount ? [['Invoice total', cedis(task.invoiceAmount ?? undefined)] as [string, string]] : []),
    ...(task.premium ? [['Pricing', 'Premium (within 48 hours)'] as [string, string]] : []),
  ]

  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-700/70">
        <button onClick={onBack} className="hover:text-ink-900 hover:underline">My Jobs</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="font-medium text-ink-900">Task Tracking</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-ink-900">Task #{taskReference(task)}</h1>
        <span className={`text-base font-semibold ${statusColor}`}>
          {stopped ? (STOPPED_LABEL[status] || statusLabel) : statusLabel}
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-700/70">
        {subline.map((part, i) => (
          <span key={i} className="flex items-center gap-2">{i > 0 && <span aria-hidden="true">•</span>}{part}</span>
        ))}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Timeline */}
        <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm sm:p-8">
          {stopped ? (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3.5 text-sm text-red-800">
              <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>{STOPPED_LABEL[status] || 'This task is no longer active.'} If this isn't what you expected, contact BeyondX support.</p>
            </div>
          ) : (
            <ol>
              {PROGRESS_STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < current
                const active = i === current
                const last = i === PROGRESS_STEPS.length - 1
                const when = i === 0 && postedAt ? postedAt : done ? 'Completed' : active ? 'In progress' : 'Upcoming'
                return (
                  <li key={s.label} className="relative flex gap-5 pb-9 last:pb-0">
                    {!last && (
                      <span aria-hidden="true" className={`absolute left-[1.125rem] top-10 bottom-1 w-0.5 -translate-x-1/2 rounded-full ${done ? 'bg-ink-900' : 'bg-ink-900/10'}`} />
                    )}
                    <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      done ? 'bg-ink-900 text-cream-50'
                        : active ? 'bg-ink-900 text-cream-50 ring-4 ring-gray-200'
                        : 'bg-ink-900/10 text-ink-700/50'
                    }`}>
                      {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-sm font-semibold ${done || active ? 'text-ink-900' : 'text-ink-700/55'}`}>{s.label}</p>
                      <p className={`mt-0.5 text-xs ${active ? 'font-medium text-forest-700' : 'text-ink-700/50'}`}>{when}</p>
                      {(done || active) && <p className="mt-1.5 text-sm text-ink-700/80">{s.description}</p>}
                      {i === 3 && (done || active) && workerName && (
                        <p className="mt-1 text-sm font-medium text-ink-800">Xpert: {workerName}</p>
                      )}
                      {i === 3 && (done || active) && slots > 1 && (
                        <p className="mt-1 text-sm font-medium text-ink-800">{filled}/{slots} Xperts confirmed</p>
                      )}
                      {i === 1 && status === 'invoice_sent' && onPayInvoice && (
                        <button onClick={onPayInvoice}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-forest-500">
                          View invoice ({cedis(task.invoiceAmount ?? undefined)})
                        </button>
                      )}
                      {i === 4 && active && onConfirm && (
                        <button onClick={onConfirm}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-forest-500">
                          <ShieldCheck size={15} aria-hidden="true" /> Confirm work & release payment
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-900">Task Details</h2>
            <dl className="mt-4 space-y-4">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-700/60">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
            {task.description && !String(task.description).includes('Payment Ref') && (
              <div className="mt-4 border-t border-ink-900/8 pt-4">
                <p className="text-xs text-ink-700/60">Description</p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-ink-800">{task.description}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-900">Need to make changes?</h2>
            <p className="mt-1 text-sm text-ink-700/70">Contact our support team and we'll help you.</p>
            <button onClick={onContactSupport}
              className="mt-4 rounded-lg border border-ink-900/25 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-900/5">
              Contact Support
            </button>
            {onCancel && (
              <button onClick={onCancel} className="mt-3 block text-sm font-medium text-red-600 hover:underline">
                Cancel this task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
