// src/components/CoordinatorQuoteModal.tsx
//
// Employer-facing request flow for Coordinator (team) profiles. Coordinator
// jobs don't have instant pricing — the coordinator inspects the scope and
// quotes a price, then BeyondX staff approve or reject that quote — so this
// creates a real, trackable CoordinatorJobRequest (see src/lib/api.ts)
// rather than just emailing BeyondX. The employer can follow its status the
// whole way through in their "Coordinator Requests" tab.

import { useState } from 'react'
import { X, CheckCircle, Users } from 'lucide-react'
import { coordinatorRequests, ApiError, type Worker, type CoordinatorJobRequest } from '../lib/api'
import { getApplication } from '../lib/coordinator'

const inp = 'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'
const wName = (w: Worker) => (w.fullName as string) || (w.name as string) || 'this team'

export default function CoordinatorQuoteModal({
  worker, category, onClose, onSent,
}: {
  worker: Worker
  category?: string | null
  onClose: () => void
  onSent?: (request: CoordinatorJobRequest) => void
}) {
  const application = getApplication(worker)
  const taskType = category || application?.categories?.[0] || 'General Task'
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('1 Day')
  const [workersNeeded, setWorkersNeeded] = useState('')
  const [materialsProvided, setMaterialsProvided] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const valid = description.trim().length > 5 && location.trim().length > 0

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr(null)
    try {
      const { request } = await coordinatorRequests.create({
        coordinatorWorkerId: (worker.workerId as string) || '',
        taskType,
        description: description.trim(),
        location: location.trim(),
        duration,
        workersNeeded: workersNeeded ? Math.max(1, parseInt(workersNeeded, 10)) : undefined,
        materialsProvided,
      })
      onSent?.(request)
      setSent(true)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not send your request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-cream-50 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-900/8 px-5 py-4">
          <h2 className="flex items-center gap-2 font-serif text-lg font-medium text-ink-900">
            <Users size={18} className="text-forest-600" /> Request a team quote
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-700/60 hover:bg-ink-900/5"><X size={18} /></button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle size={44} className="mx-auto mb-3 text-forest-600" strokeWidth={1.5} />
            <p className="font-serif text-lg font-medium text-ink-900">Request sent</p>
            <p className="mt-2 text-sm text-ink-700">{wName(worker)} will review the scope and quote a price. You'll see it in your Coordinator Requests once BeyondX approves it.</p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-500">Close</button>
          </div>
        ) : (
          <div className="nice-scroll max-h-[75vh] space-y-4 overflow-y-auto p-5">
            <p className="text-xs leading-relaxed text-ink-700/70">
              Describe the job — {wName(worker)} handles scope and assignment for their team, and BeyondX confirms pricing before anything is booked.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Job description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                placeholder="What needs doing, over what period…" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Airport City, Accra" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-700">Duration</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inp}>
                  <option>Half Day</option><option>1 Day</option><option>2 Days</option><option>3 Days</option><option>5 Days</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-700">Workers needed</label>
                <input type="number" min={1} value={workersNeeded} onChange={(e) => setWorkersNeeded(e.target.value)}
                  placeholder={`e.g. ${application?.teamSize ?? 4}`} className={inp} />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-900/12 bg-white px-3 py-2.5 text-sm text-ink-800">
              <input type="checkbox" checked={materialsProvided} onChange={(e) => setMaterialsProvided(e.target.checked)}
                className="h-4 w-4 rounded border-ink-900/30 text-forest-600 focus:ring-forest-600/30" />
              I'll provide materials/supplies for this job
            </label>
            {err && <p className="text-xs text-red-700">{err}</p>}
            <button onClick={submit} disabled={!valid || busy}
              className="w-full rounded-xl bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-500 disabled:opacity-50">
              {busy ? 'Sending…' : 'Send request'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
