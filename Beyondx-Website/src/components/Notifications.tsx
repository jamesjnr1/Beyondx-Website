import { useEffect, useMemo, useState } from 'react'
import { Bell, X, Megaphone, CircleCheck, Clock, Wallet } from 'lucide-react'
import type { Task } from '../lib/api'

/**
 * Platform-wide announcements. Add an entry here and it appears for everyone,
 * newest first. Keep `id` unique — it is what marks an item as read.
 */
export const ANNOUNCEMENTS: {
  id: string
  audience: 'worker' | 'employer' | 'all'
  date: string
  title: string
  body: string
}[] = [
  {
    id: 'dispatch-paused-2026-07',
    audience: 'employer',
    date: '2026-07-23',
    title: 'Dispatch opens soon',
    body: 'We are onboarding employers now. Direct dispatch opens once enough employers have joined — you can still post tasks in the meantime.',
  },
  {
    id: 'referrals-soon-2026-07',
    audience: 'worker',
    date: '2026-07-23',
    title: 'Referral rewards coming soon',
    body: 'Once there is steady work on the platform you will be able to invite people and earn for every person who joins and gets verified.',
  },
  {
    id: 'welcome-2026-07',
    audience: 'all',
    date: '2026-07-20',
    title: 'Welcome to BeyondX',
    body: 'We are in our early stages and growing the platform. Keep your profile up to date so we can match you faster.',
  },
]

type Item = {
  id: string
  kind: 'announcement' | 'task'
  icon: 'megaphone' | 'check' | 'clock' | 'wallet'
  date: string
  title: string
  body: string
}

const READ_KEY = 'bx_read_notifications'

function readIds(): string[] {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]') } catch { return [] }
}
function markRead(ids: string[]) {
  try { localStorage.setItem(READ_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

const ICONS = { megaphone: Megaphone, check: CircleCheck, clock: Clock, wallet: Wallet }

function when(date: string) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Turns the person's own tasks into activity entries, newest first. */
function taskItems(role: 'worker' | 'employer', tasks: Task[]): Item[] {
  return tasks
    .filter((t) => t.status && t.status !== 'open')
    .slice(0, 12)
    .map((t) => {
      const name = t.taskType || 'Task'
      const date = String(t.createdAt || '')
      if (t.status === 'offered') {
        return { id: `t-${t.id}-offered`, kind: 'task' as const, icon: 'clock' as const, date,
          title: role === 'worker' ? `New offer: ${name}` : `${name} offered to a worker`,
          body: role === 'worker' ? 'Accept or decline it from your Available tab.' : 'Waiting for the worker to respond.' }
      }
      if (t.status === 'accepted') {
        return { id: `t-${t.id}-accepted`, kind: 'task' as const, icon: 'check' as const, date,
          title: `${name} is on the job`,
          body: role === 'worker' ? 'Mark it complete when you finish.' : 'The worker has started this task.' }
      }
      if (t.status === 'pending_confirmation') {
        return { id: `t-${t.id}-pending`, kind: 'task' as const, icon: 'clock' as const, date,
          title: `${name} marked done`,
          body: role === 'employer' ? 'Confirm the work to release payment.' : 'Awaiting the employer’s confirmation.' }
      }
      if (t.status === 'employer_confirmed') {
        return { id: `t-${t.id}-confirmed`, kind: 'task' as const, icon: 'wallet' as const, date,
          title: `${name} confirmed`,
          body: 'BeyondX is processing the payment release.' }
      }
      return { id: `t-${t.id}-completed`, kind: 'task' as const, icon: 'wallet' as const, date,
        title: `${name} completed`,
        body: role === 'worker' ? 'Payment has been released.' : 'This job is closed.' }
    })
}

type Sent = { id: string; title: string; body: string; created_at: string }

export default function Notifications({ role, tasks }: { role: 'worker' | 'employer'; tasks: Task[] }) {
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<string[]>(readIds)
  const [sent, setSent] = useState<Sent[]>([])

  // Notifications sent from the admin console. Silently ignored if the
  // endpoint is not configured yet — the rest of the panel still works.
  useEffect(() => {
    let live = true
    fetch(`/api/notifications?audience=${role}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.notifications) setSent(d.notifications) })
      .catch(() => null)
    return () => { live = false }
  }, [role])

  const items = useMemo<Item[]>(() => {
    const fromAdmin: Item[] = sent.map((n) => ({
      id: `n-${n.id}`, kind: 'announcement', icon: 'megaphone',
      date: n.created_at, title: n.title, body: n.body,
    }))
    const announcements: Item[] = ANNOUNCEMENTS
      .filter((a) => a.audience === 'all' || a.audience === role)
      .map((a) => ({ id: a.id, kind: 'announcement', icon: 'megaphone', date: a.date, title: a.title, body: a.body }))
    const all = [...fromAdmin, ...announcements, ...taskItems(role, tasks)]
    return all.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [role, tasks, sent])

  const unread = items.filter((i) => !read.includes(i.id)).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      const ids = items.map((i) => i.id)
      setRead(ids)
      markRead(ids)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/15 text-ink-700 transition-colors hover:bg-ink-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
      >
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest-600 px-1 text-[10px] font-bold text-cream-50">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-xl ring-1 ring-ink-900/10"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-ink-900/10 px-4 py-3">
              <h2 className="font-serif text-base font-medium text-ink-900">Notifications</h2>
              <button onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-lg p-1 text-ink-700 hover:bg-ink-900/5">
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink-700">Nothing yet. Updates about your work will appear here.</p>
              ) : (
                <ul className="divide-y divide-ink-900/5">
                  {items.map((i) => {
                    const Icon = ICONS[i.icon]
                    return (
                      <li key={i.id} className="flex gap-3 px-4 py-3.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${i.kind === 'announcement' ? 'bg-clay-400/15 text-clay-600' : 'bg-forest-600/10 text-forest-700'}`}>
                          <Icon size={14} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-ink-900">{i.title}</span>
                            <span className="shrink-0 text-[11px] text-ink-700/70">{when(i.date)}</span>
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-700">{i.body}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
