import { useState } from 'react'
import { Phone, Send, Headset } from 'lucide-react'
import { contact, session, ApiError } from '../lib/api'

const SUPPORT_PHONE = '0553608309'
const SUPPORT_PHONE_DISPLAY = '055 360 8309'

const OPTIONS = {
  worker: [
    { value: 'worker_support', label: 'General support' },
    { value: 'worker_report', label: 'Report an employer' },
  ],
  employer: [
    { value: 'employer_support', label: 'General support' },
    { value: 'employer_report', label: 'Report a worker' },
  ],
} as const

export default function SupportPanel({
  role,
  onSent,
  onError,
}: {
  role: 'worker' | 'employer'
  onSent: () => void
  onError: (message: string) => void
}) {
  const options = OPTIONS[role]
  const [category, setCategory] = useState<string>(options[0].value)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const worker = session.worker()
  const employer = session.employer()

  const submit = async () => {
    const text = message.trim()
    if (text.length < 5) {
      setError('Please write a short message so we know how to help.')
      return
    }
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      if (role === 'worker') {
        await contact.send({
          name: (worker?.fullName as string) || (worker?.name as string) || 'BeyondX Worker',
          phone: (worker?.phone as string) || undefined,
          message: `[${(worker?.workerId as string) || '—'}] ${text}`,
          category,
        })
      } else {
        await contact.send({
          name: (employer?.orgName as string) || (employer?.contactPerson as string) || 'BeyondX Employer',
          email: (employer?.email as string) || undefined,
          phone: (employer?.phone as string) || undefined,
          message: text,
          category,
        })
      }
      setMessage('')
      onSent()
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Could not send your message. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const reporting = role === 'worker' ? 'an employer' : 'a worker'

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-cream-50 p-6 shadow-sm ring-1 ring-ink-900/5">
      <div className="flex items-start gap-4">
        <span className="hidden h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-forest-600/10 text-forest-600 sm:flex" style={{ width: 52, height: 52 }}>
          <Headset size={26} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-serif text-xl font-medium text-ink-900">
            <Headset size={20} aria-hidden="true" className="text-forest-600 sm:hidden" />
            Support &amp; Reporting
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            Need help, or need to report a problem with {reporting}? Send us a message directly and our team will follow up.
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">What&rsquo;s this about?</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition-colors focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">Message</span>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => { setMessage(e.target.value); if (error) setError(null) }}
          placeholder="Tell us what happened…"
          className="w-full rounded-lg border border-ink-900/15 bg-white p-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-700/40 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/25"
        />
      </label>

      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-600 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
      >
        <Send size={15} aria-hidden="true" /> {busy ? 'Sending…' : 'Send message'}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-700">
        <Phone size={14} aria-hidden="true" className="text-forest-600" />
        Or call us on{' '}
        <a href={`tel:${SUPPORT_PHONE}`} className="font-medium text-forest-700 underline-offset-2 hover:underline">
          {SUPPORT_PHONE_DISPLAY}
        </a>
      </p>
    </div>
  )
}
