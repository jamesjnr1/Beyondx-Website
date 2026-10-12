import { ClipboardCheck, Search, HardHat, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import type { Task } from '../../lib/api'

export interface ProgressStep {
  label: string
  description: string
  icon: LucideIcon
}

/** The employer-side lifecycle of a posted task, in the order the backend
 *  actually moves it: open → offered → accepted → pending_confirmation →
 *  employer_confirmed → completed. */
export const PROGRESS_STEPS: ProgressStep[] = [
  { label: 'Task posted', description: 'BeyondX has received your task.', icon: ClipboardCheck },
  { label: 'Matching a worker', description: 'Verified workers are being notified and can accept the job.', icon: Search },
  { label: 'Worker on the job', description: 'A worker has accepted and the job is underway.', icon: HardHat },
  { label: 'Confirm the work', description: 'The worker has marked the job done — confirm it to release payment.', icon: ShieldCheck },
  { label: 'Payment released', description: 'BeyondX pays the worker and the job is complete.', icon: Wallet },
]

/** Index of the step currently in progress. Equal to PROGRESS_STEPS.length
 *  when every step is done; -1 when the task stopped early. */
export function currentStepIndex(status?: string): number {
  switch (status) {
    case 'open':
    case 'payment_pending':
    case 'offered':
      return 1
    case 'accepted':
      return 2
    case 'pending_confirmation':
      return 3
    case 'employer_confirmed':
      return 4
    case 'completed':
      return PROGRESS_STEPS.length
    case 'cancelled':
    case 'expired':
    case 'payment_rejected':
      return -1
    default:
      return 1
  }
}

export const STOPPED_LABEL: Record<string, string> = {
  cancelled: 'Cancelled',
  expired: 'Expired — no worker accepted in time',
  payment_rejected: 'Payment could not be verified',
}

/** Short, human reference for a task — the id the backend assigned. */
export const taskReference = (t: Pick<Task, 'id'>) => `BX-${String(t.id).slice(-8).toUpperCase()}`

export const formatSchedule = (t: Task) =>
  t.scheduledDate
    ? new Date(`${t.scheduledDate as string}T${(t.scheduledTime as string) || '08:00'}:00`).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : undefined
