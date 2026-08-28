// src/pages/CoordinatorDashboard.tsx
//
// Shown instead of WorkerDashboard once a worker's role is 'coordinator'.
// Team, quotes, and payout-split data are stored as JSON fields on the
// worker record (see src/lib/coordinator.ts) via the existing
// /api/workers/me PATCH — there is no dedicated backend for team accounts,
// bulk-job quoting, or payout splitting yet, so this dashboard is the
// coordinator's own record of that work. Pricing authority and actual
// payment stay with BeyondX; "Submit quote" and "Escalate to BeyondX" are
// the two actions here that reach BeyondX for real, via the existing
// contact/lead endpoint.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Users, Plus, Trash2, ClipboardList, Wallet, AlertTriangle, Star,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import ProfileModal, { type Profile } from '../components/ProfileModal'
import { tasks as tasksApi, workers as workersApi, contact, session, ApiError, type Task, type Worker } from '../lib/api'
import {
  ALL_CATEGORY_TITLES, getApplication, getTeam, getActiveTeam, getQuotes, getDisputes,
  getPayoutSplits, type TeamMember, type CoordinatorQuote, type CoordinatorDispute, type PayoutSplitRecord,
} from '../lib/coordinator'

const cedis = (n: number) => `GH₵ ${Number(n || 0).toLocaleString()}`
const inp = 'w-full rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/20'

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-cream-50 border border-ink-900/8 px-4 py-3.5">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-700/60">{label}</p>
        <p className="truncate font-serif text-lg font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------- Team tab -------------------------------- */

function AddMemberForm({ onAdd, onClose }: { onAdd: (m: TeamMember) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const toggle = (t: string) => setPicked((prev) => {
    const next = new Set(prev)
    next.has(t) ? next.delete(t) : next.add(t)
    return next
  })

  const valid = name.trim().length > 1

  return (
    <div className="rounded-xl border border-ink-900/10 bg-cream-100/60 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team member name" className={inp} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={inp} />
      </div>
      <div className="grid max-h-32 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-ink-900/10 bg-white p-2 sm:grid-cols-2">
        {ALL_CATEGORY_TITLES.map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-ink-800 hover:bg-ink-900/5">
            <input type="checkbox" checked={picked.has(t)} onChange={() => toggle(t)} className="h-3.5 w-3.5 rounded border-ink-900/30 text-forest-600" />
            {t}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">Cancel</button>
        <button
          disabled={!valid}
          onClick={() => {
            onAdd({
              id: Date.now().toString(), name: name.trim(), phone: phone.trim() || undefined,
              categories: Array.from(picked), status: 'active', addedAt: new Date().toISOString(),
              rating: undefined, jobsCompleted: 0,
            })
            onClose()
          }}
          className="rounded-lg bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 disabled:opacity-50"
        >
          Add to team
        </button>
      </div>
    </div>
  )
}

function TeamTab({ worker, onSaved }: { worker: Worker | null; onSaved: (patch: Record<string, unknown>) => void }) {
  const team = getTeam(worker)
  const active = team.filter((m) => m.status === 'active')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const persist = async (next: TeamMember[]) => {
    setSaving(true)
    try {
      const patch = { coordinatorTeam: JSON.stringify(next) }
      await workersApi.updateMe(patch)
      onSaved(patch)
    } catch { /* silent — team list stays as-is in local state until retry */ }
    finally { setSaving(false) }
  }

  const add = (m: TeamMember) => persist([...team, m])
  const remove = (id: string) => persist(team.map((m) => m.id === id ? { ...m, status: 'removed' } : m))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-medium text-ink-900">Your team ({active.length})</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-500">
            <Plus size={13} /> Add worker
          </button>
        )}
      </div>

      {adding && <AddMemberForm onAdd={add} onClose={() => setAdding(false)} />}

      {active.length === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-ink-900/15 py-8 text-center text-sm text-ink-700/60">
          No team members yet. Add the people you'll assign jobs to.
        </p>
      )}

      <ul className="divide-y divide-ink-900/8 overflow-hidden rounded-2xl border border-ink-900/8 bg-cream-50">
        {active.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3.5">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-600/10 text-sm font-bold text-forest-700">
              {m.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{m.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-700/70">
                {m.phone && <span>{m.phone}</span>}
                {m.rating ? <span className="inline-flex items-center gap-0.5"><Star size={11} className="fill-forest-600 text-forest-600" /> {m.rating.toFixed(1)}</span> : null}
                <span>{m.jobsCompleted ?? 0} job{(m.jobsCompleted ?? 0) === 1 ? '' : 's'} on record</span>
              </p>
              {m.categories.length > 0 && <p className="mt-0.5 truncate text-[11px] text-ink-700/50">{m.categories.join(', ')}</p>}
            </div>
            <button onClick={() => remove(m.id)} disabled={saving} aria-label={`Remove ${m.name}`}
              className="shrink-0 rounded-lg p-2 text-ink-700/50 hover:bg-red-50 hover:text-red-700">
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------- Jobs tab -------------------------------- */

function JobQuoteCard({
  task, team, quote, onQuoted,
}: {
  task: Task
  team: TeamMember[]
  quote: CoordinatorQuote | undefined
  onQuoted: (q: CoordinatorQuote) => Promise<void>
}) {
  const [notes, setNotes] = useState(quote?.scopeNotes || '')
  const [price, setPrice] = useState(quote ? String(quote.price) : '')
  const [assigned, setAssigned] = useState<Set<string>>(new Set(quote?.assignedMemberIds || []))
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => setAssigned((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const submit = async () => {
    const p = parseFloat(price)
    if (!p || busy) return
    setBusy(true)
    try {
      await onQuoted({
        taskId: String(task.id), price: p, scopeNotes: notes.trim(),
        assignedMemberIds: Array.from(assigned), status: 'pending', submittedAt: new Date().toISOString(),
      })
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-ink-900/8 bg-cream-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{task.taskType || 'Job'}</p>
          <p className="mt-0.5 text-xs text-ink-700/70">{task.location || 'Location TBC'} · {Number(task.workersNeeded ?? 1)} worker slots</p>
          {task.description && <p className="mt-1 text-xs text-ink-700/60 line-clamp-2">{String(task.description)}</p>}
        </div>
        {quote && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            quote.status === 'approved' ? 'bg-forest-600/10 text-forest-700'
            : quote.status === 'denied' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {quote.status === 'pending' ? 'Quote pending' : quote.status === 'approved' ? 'Quote approved' : 'Quote denied'}
          </span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Scope inspection notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="What you found on inspection, materials needed, access notes…" className={inp} />
      </div>

      {team.length > 0 && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Assign team members</label>
          <div className="flex flex-wrap gap-1.5">
            {team.map((m) => (
              <button key={m.id} type="button" onClick={() => toggle(m.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  assigned.has(m.id) ? 'border-forest-600 bg-forest-600/10 text-forest-700' : 'border-ink-900/15 text-ink-700 hover:bg-ink-900/5'
                }`}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Price quote (GH₵)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 1200" className={inp} />
        </div>
        <button onClick={submit} disabled={!price || busy}
          className="shrink-0 rounded-lg bg-forest-600 px-4 py-2 text-xs font-semibold text-cream-50 disabled:opacity-50">
          {busy ? 'Sending…' : quote ? 'Update quote' : 'Submit for approval'}
        </button>
      </div>
      <p className="text-[11px] text-ink-700/50">Final pricing is set by BeyondX — this sends your quote for approval, it isn't charged yet.</p>
    </div>
  )
}

function JobsTab({
  worker, tasks, onSaved, onToast,
}: {
  worker: Worker | null
  tasks: Task[]
  onSaved: (patch: Record<string, unknown>) => void
  onToast: (t: ToastMsg) => void
}) {
  const team = getActiveTeam(worker)
  const quotes = getQuotes(worker)
  const bulkTasks = tasks.filter((t) => Number(t.workersNeeded ?? 1) > 1 && t.status === 'open')

  const saveQuote = async (q: CoordinatorQuote) => {
    const next = { ...quotes, [q.taskId]: q }
    try {
      const patch = { coordinatorQuotes: JSON.stringify(next) }
      await workersApi.updateMe(patch)
      onSaved(patch)
      onToast({ id: Date.now(), kind: 'success', title: 'Quote sent', detail: 'BeyondX will review and confirm pricing.' })
    } catch {
      onToast({ id: Date.now(), kind: 'info', title: 'Could not send quote', detail: 'Please try again.' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-medium text-ink-900">Multi-worker job requests</h2>
        <p className="mt-0.5 text-xs text-ink-700/60">Bulk jobs open for a team. Inspect scope, then submit a price for BeyondX to approve.</p>
      </div>
      {bulkTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-900/15 py-8 text-center text-sm text-ink-700/60">
          No multi-worker jobs open right now.
        </p>
      ) : (
        bulkTasks.map((t) => (
          <JobQuoteCard key={String(t.id)} task={t} team={team} quote={quotes[String(t.id)]} onQuoted={saveQuote} />
        ))
      )}
    </div>
  )
}

/* ------------------------------ Payouts tab ------------------------------ */

function PayoutsTab({
  worker, history, onSaved, onToast,
}: {
  worker: Worker | null
  history: Task[]
  onSaved: (patch: Record<string, unknown>) => void
  onToast: (t: ToastMsg) => void
}) {
  const team = getActiveTeam(worker)
  const splits = getPayoutSplits(worker)
  const teamJobs = history.filter((t) => Number(t.workersNeeded ?? 1) > 1 && (t.status === 'completed' || t.status === 'employer_confirmed'))
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-medium text-ink-900">Payout splits</h2>
        <p className="mt-0.5 text-xs text-ink-700/60">BeyondX pays completed team jobs to your account in full. Record how you split each payout across the team.</p>
      </div>

      {teamJobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-900/15 py-8 text-center text-sm text-ink-700/60">No completed team jobs yet.</p>
      ) : teamJobs.map((t) => {
        const tid = String(t.id)
        const total = Number(t.pay || 0)
        const existing = splits[tid]
        const isOpen = openTaskId === tid
        return (
          <div key={tid} className="rounded-2xl border border-ink-900/8 bg-cream-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{t.taskType || 'Job'}</p>
                <p className="text-xs text-ink-700/60">{cedis(total)} total payout</p>
              </div>
              <button onClick={() => setOpenTaskId(isOpen ? null : tid)} className="shrink-0 rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
                {existing ? 'Edit split' : 'Split payout'}
              </button>
            </div>

            {existing && !isOpen && (
              <ul className="mt-3 space-y-1 border-t border-ink-900/6 pt-3 text-xs text-ink-700">
                {existing.lines.map((l) => {
                  const m = team.find((tm) => tm.id === l.memberId)
                  return <li key={l.memberId} className="flex justify-between"><span>{m?.name || 'Removed member'}</span><span className="font-medium">{cedis(l.amount)} ({l.percent}%)</span></li>
                })}
              </ul>
            )}

            {isOpen && (
              <SplitEditor
                total={total} team={team} initial={existing}
                onCancel={() => setOpenTaskId(null)}
                onSave={async (record) => {
                  const next = { ...splits, [tid]: { ...record, taskId: tid } }
                  try {
                    const patch = { coordinatorPayoutSplits: JSON.stringify(next) }
                    await workersApi.updateMe(patch)
                    onSaved(patch)
                    onToast({ id: Date.now(), kind: 'success', title: 'Split recorded', detail: '' })
                    setOpenTaskId(null)
                  } catch {
                    onToast({ id: Date.now(), kind: 'info', title: 'Could not save split', detail: 'Please try again.' })
                  }
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SplitEditor({
  total, team, initial, onSave, onCancel,
}: {
  total: number
  team: TeamMember[]
  initial: PayoutSplitRecord | undefined
  onSave: (r: PayoutSplitRecord) => Promise<void>
  onCancel: () => void
}) {
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const m of team) {
      const line = initial?.lines.find((l) => l.memberId === m.id)
      map[m.id] = line ? String(line.percent) : ''
    }
    return map
  })
  const sum = Object.values(percents).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  return (
    <div className="mt-3 space-y-2 border-t border-ink-900/6 pt-3">
      {team.length === 0 && <p className="text-xs text-ink-700/60">Add team members first to split this payout.</p>}
      {team.map((m) => {
        const pct = parseFloat(percents[m.id]) || 0
        return (
          <div key={m.id} className="flex items-center gap-2">
            <span className="flex-1 truncate text-xs text-ink-800">{m.name}</span>
            <input type="number" min={0} max={100} value={percents[m.id]}
              onChange={(e) => setPercents((p) => ({ ...p, [m.id]: e.target.value }))}
              className="w-16 rounded-lg border border-ink-900/15 px-2 py-1 text-right text-xs" />
            <span className="w-8 text-xs text-ink-700/60">%</span>
            <span className="w-20 shrink-0 text-right text-xs font-medium text-ink-900">{cedis((total * pct) / 100)}</span>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className={sum === 100 ? 'text-forest-700' : 'text-amber-700'}>{sum}% allocated</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 font-medium text-ink-700 hover:bg-ink-900/5">Cancel</button>
          <button
            disabled={sum !== 100 || team.length === 0}
            onClick={() => onSave({
              taskId: '', totalPayout: total, recordedAt: new Date().toISOString(),
              lines: team.map((m) => ({ memberId: m.id, percent: parseFloat(percents[m.id]) || 0, amount: (total * (parseFloat(percents[m.id]) || 0)) / 100 })),
            })}
            className="rounded-lg bg-forest-600 px-3.5 py-1.5 font-semibold text-cream-50 disabled:opacity-50"
          >
            Save split
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Disputes tab ------------------------------ */

function DisputesTab({
  worker, onSaved, onToast,
}: {
  worker: Worker | null
  onSaved: (patch: Record<string, unknown>) => void
  onToast: (t: ToastMsg) => void
}) {
  const disputes = getDisputes(worker)
  const team = getActiveTeam(worker)
  const [adding, setAdding] = useState(false)
  const [summary, setSummary] = useState('')
  const [memberId, setMemberId] = useState('')
  const [busy, setBusy] = useState(false)

  const persist = async (next: CoordinatorDispute[]) => {
    const patch = { coordinatorDisputes: JSON.stringify(next) }
    await workersApi.updateMe(patch)
    onSaved(patch)
  }

  const create = async () => {
    if (!summary.trim() || busy) return
    setBusy(true)
    try {
      const d: CoordinatorDispute = { id: Date.now().toString(), summary: summary.trim(), memberId: memberId || undefined, status: 'open', createdAt: new Date().toISOString() }
      await persist([...disputes, d])
      setSummary(''); setMemberId(''); setAdding(false)
    } finally { setBusy(false) }
  }

  const escalate = async (d: CoordinatorDispute) => {
    const memberName = team.find((m) => m.id === d.memberId)?.name
    try {
      await contact.send({
        name: (worker?.fullName as string) || (worker?.name as string) || 'Coordinator',
        phone: worker?.phone as string | undefined,
        category: 'Coordinator team dispute',
        message: `Team dispute escalated by coordinator${memberName ? ` regarding ${memberName}` : ''}: ${d.summary}`,
      })
      await persist(disputes.map((x) => x.id === d.id ? { ...x, status: 'escalated' } : x))
      onToast({ id: Date.now(), kind: 'success', title: 'Escalated to BeyondX', detail: 'Our team will follow up.' })
    } catch {
      onToast({ id: Date.now(), kind: 'info', title: 'Could not escalate', detail: 'Please try again.' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-medium text-ink-900">Team disputes</h2>
          <p className="mt-0.5 text-xs text-ink-700/60">You're the first point of contact — escalate to BeyondX if it can't be resolved within the team.</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-500">
            <Plus size={13} /> Log dispute
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-ink-900/10 bg-cream-100/60 p-4 space-y-3">
          {team.length > 0 && (
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inp}>
              <option value="">Not tied to a specific member</option>
              {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="What happened?" className={inp} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">Cancel</button>
            <button onClick={create} disabled={!summary.trim() || busy} className="rounded-lg bg-forest-600 px-3.5 py-1.5 text-xs font-semibold text-cream-50 disabled:opacity-50">Log</button>
          </div>
        </div>
      )}

      {disputes.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-ink-900/15 py-8 text-center text-sm text-ink-700/60">No disputes logged.</p>
      ) : (
        <ul className="divide-y divide-ink-900/8 overflow-hidden rounded-2xl border border-ink-900/8 bg-cream-50">
          {disputes.slice().reverse().map((d) => (
            <li key={d.id} className="flex items-start gap-3 px-4 py-3.5">
              <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${d.status === 'open' ? 'text-amber-700' : d.status === 'escalated' ? 'text-red-700' : 'text-forest-700'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">{d.summary}</p>
                <p className="mt-0.5 text-xs text-ink-700/50">{new Date(d.createdAt).toLocaleDateString()} · {d.status}</p>
              </div>
              {d.status === 'open' && (
                <button onClick={() => escalate(d)} className="shrink-0 rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
                  Escalate to BeyondX
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------ Main export ------------------------------ */

export default function CoordinatorDashboard() {
  const [tab, setTab] = useState<'team' | 'jobs' | 'payouts' | 'disputes' | 'support'>('team')
  const [me, setMe] = useState<Worker | null>(session.worker())
  const [openTasks, setOpenTasks] = useState<Task[]>([])
  const [history, setHistory] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<ToastMsg>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [openRes, histRes, meRes] = await Promise.all([
        tasksApi.open(), tasksApi.workerHistory(), workersApi.me().catch(() => null),
      ])
      setOpenTasks((openRes?.tasks || []).filter((t) => t.status === 'open'))
      setHistory(histRes?.tasks || [])
      if (meRes?.worker) { setMe(meRes.worker); session.patchWorker(meRes.worker) }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const onSaved = (patch: Record<string, unknown>) => {
    session.patchWorker(patch)
    setMe((m) => ({ ...(m || {}), ...patch }))
  }

  const team = getActiveTeam(me)
  const application = getApplication(me)
  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'team', label: 'Team' },
    { id: 'jobs', label: 'Job requests' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'support', label: 'Support' },
  ]

  return (
    <div className="min-h-screen bg-cream-100">
      <DashboardHeader
        role="WORKER"
        title="Coordinator Dashboard"
        name={(me?.fullName as string) || (me?.name as string)}
        avatar={me?.photoUrl as string}
        onEditProfile={() => setEditing(true)}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {application?.businessName && (
          <p className="mb-4 text-sm text-ink-700/70">{application.businessName} · Coordinator account</p>
        )}

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">Try again</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat icon={<Users size={20} className="text-forest-600" />} label="Team size" value={`${team.length}`} />
          <Stat icon={<ClipboardList size={20} className="text-forest-600" />} label="Open team jobs" value={`${openTasks.filter((t) => Number(t.workersNeeded ?? 1) > 1).length}`} />
          <Stat icon={<Wallet size={20} className="text-forest-600" />} label="Total earned" value={cedis(Number(me?.totalEarned || 0))} />
        </div>

        <div className="mt-6 flex items-center gap-2 overflow-x-auto border-b border-ink-900/10 pb-px">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'border-forest-600 text-forest-700' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); load() }} className="ml-auto flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-ink-700/60 hover:text-ink-900">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-700/60">Loading…</p>
          ) : (
            <>
              {tab === 'team' && <TeamTab worker={me} onSaved={onSaved} />}
              {tab === 'jobs' && <JobsTab worker={me} tasks={openTasks} onSaved={onSaved} onToast={setToast} />}
              {tab === 'payouts' && <PayoutsTab worker={me} history={history} onSaved={onSaved} onToast={setToast} />}
              {tab === 'disputes' && <DisputesTab worker={me} onSaved={onSaved} onToast={setToast} />}
              {tab === 'support' && (
                <SupportPanel role="worker"
                  onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
                  onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
                />
              )}
            </>
          )}
        </div>
      </main>

      {editing && (
        <ProfileModal
          role="WORKER"
          initial={{
            avatar: me?.photoUrl as string, name: (me?.fullName as string) || (me?.name as string) || '',
            phone: (me?.phone as string) || '', bio: '',
          } as Profile}
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            const patch = { fullName: p.name, photoUrl: p.avatar }
            try { await workersApi.updateMe(patch) } catch { /* handled elsewhere */ }
            onSaved(patch)
            setEditing(false)
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
