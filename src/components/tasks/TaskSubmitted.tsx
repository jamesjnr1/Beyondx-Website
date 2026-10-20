import { Check } from 'lucide-react'
import type { SubmittedTask } from './PostTaskWizard'
import { PROGRESS_STEPS, taskReference } from './taskProgress'

export default function TaskSubmitted({ submitted, onTrack, onDashboard }: {
  submitted: SubmittedTask
  onTrack: () => void
  onDashboard: () => void
}) {
  const { task, summary } = submitted
  const hasId = task.id !== '—'
  const submittedAt = new Date(task.createdAt || Date.now()).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-600 text-cream-50">
          <Check size={34} strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-bold text-ink-900">Your request has been submitted!</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-700/75">
          BeyondX is reviewing your request and will send you one firm quote shortly. You can accept or decline it.
          {summary.premium ? ' This job starts within 48 hours, so premium pricing applies.' : ''}
          {summary.recurring ? ` Recurring: ${summary.recurring}. Your usual team will be prioritized whenever available.` : ''}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm sm:p-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-700/60">Request Reference</dt>
            <dd className="mt-1 text-base font-bold text-ink-900">{hasId ? taskReference(task) : 'Pending'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-700/60">Service Category</dt>
            <dd className="mt-1 text-base font-semibold text-ink-900">{summary.taskType}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-700/60">Submitted</dt>
            <dd className="mt-1 text-sm font-medium text-ink-900">{submittedAt}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-700/60">Status</dt>
            <dd className="mt-1">
              <span className="text-sm font-semibold text-ink-800">Under review</span>
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col items-center gap-3">
          {hasId && (
            <button onClick={onTrack} className="rounded-lg bg-ink-900 px-10 py-3 text-sm font-semibold text-cream-50 hover:bg-ink-800">
              View Request Details
            </button>
          )}
          <button onClick={onDashboard} className="text-sm font-medium text-forest-700 hover:underline">Back to Dashboard</button>
        </div>
      </div>

      {/* What happens next? */}
      <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-ink-900">What happens next?</h2>
        <ol className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-6 sm:gap-3">
          {PROGRESS_STEPS.map((s, i) => {
            const Icon = s.icon
            const reached = i === 0
            return (
              <li key={s.label} className="relative flex items-start gap-3 sm:block">
                {i < PROGRESS_STEPS.length - 1 && (
                  <span aria-hidden="true" className="absolute left-10 right-0 top-4 hidden h-px bg-ink-900/10 sm:block" />
                )}
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  reached ? 'bg-ink-900 text-cream-50' : 'bg-ink-900/10 text-ink-700/60'
                }`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="block sm:mt-3">
                  <span className="block text-sm font-semibold text-ink-900">{s.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-ink-700/65">{s.description}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
