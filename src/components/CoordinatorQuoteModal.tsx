// src/components/CoordinatorQuoteModal.tsx
//
// Employer-facing request flow for Coordinator (team) profiles. Coordinator
// jobs don't have instant pricing — BeyondX quotes them — so this collects
// the job brief and sends it to BeyondX via the existing lead/contact
// endpoint (the same one used for onboarding enquiries) rather than the
// single-worker payment flow in BookWorker.tsx. BeyondX follows up with the
// employer directly to confirm price before any payment happens.

import { useState } from 'react'
import { X, CheckCircle, Users } from 'lucide-react'
import { contact, session, ApiError, type Worker } from '../lib/api'
import { getApplication } from '../lib/coordinator'

const inp = 'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'
const wName = (w: Worker) => (w.fullName as string) || (w.name as string) || 'this team'

export default function CoordinatorQuoteModal({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const employer = session.employer()
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const valid = description.trim().length > 5

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr(null)
    try {
      await contact.send({
        name: (employer?.contactPerson as string) || (employer?.orgName as string) || 'Employer',
        email: employer?.email as string | undefined,
        phone: employer?.phone as string | undefined,
        category: 'Coordinator team job quote request',
        message: `Quote request for ${wName(worker)} (team of ${getApplication(worker)?.teamSize ?? '—'}). ` +
          `Roles/quantity: ${quantity.trim() || 'not specified'}. Location: ${location.trim() || 'not specified'}. ` +
          `Job: ${description.trim()}`,
      })
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
            <p className="font-serif text-lg font-medium text-ink-900">Quote requested</p>
            <p className="mt-2 text-sm text-ink-700">BeyondX will review the scope with {wName(worker)} and follow up with pricing before anything is booked.</p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-500">Close</button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <p className="text-xs leading-relaxed text-ink-700/70">
              Custom quote for team jobs — describe the work and BeyondX will confirm pricing with you directly, since {wName(worker)} handles scope and assignment for their team.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Job description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                placeholder="What needs doing, over what period…" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Quantity / roles needed</label>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 4 cleaners, 1 supervisor" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Job site" className={inp} />
            </div>
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
