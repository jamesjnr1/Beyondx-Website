import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { MapPin, Calendar, Check, X, Star, RotateCcw, Info, RefreshCw, AlertCircle, Wrench } from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import ReferralCard from '../components/ReferralCard'
import ProfileModal, { type Profile } from '../components/ProfileModal'
import Toast, { type ToastMsg } from '../components/Toast'
import SupportPanel from '../components/SupportPanel'
import LocationShare from '../components/LocationShare'
import { tasks as tasksApi, workers as workersApi, contact, session, ApiError, type Task, type Worker } from '../lib/api'
import { isRemote } from '../data'

// ---------------------------------------------------------------------------
// Tools Status Card
// Lets a worker declare which skill categories they have their own tools for.
// Employers see a "Has tools" badge on their profile, and it feeds the tool
// modifier pricing in the dispatch modal. Workers are asked to fill this in
// via a broadcast SMS — this is the screen they land on when they do.
// ---------------------------------------------------------------------------
const TOOL_RELEVANT = ['Agriculture & Environment', 'Construction, Maintenance & Repairs', 'Facility & Cleaning']

function ToolsStatusCard({ worker, onSaved }: { worker: Worker | null; onSaved: (patch: Record<string, unknown>) => void }) {
  const mySkills = (Array.isArray(worker?.skills) ? worker!.skills as string[] : [])
    .filter((s) => TOOL_RELEVANT.includes(s))

  const [hasTools, setHasTools] = useState<boolean>(Boolean(worker?.hasTools))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Keep in sync if worker loads after initial render
  useEffect(() => { setHasTools(Boolean(worker?.hasTools)) }, [worker?.hasTools])

  if (mySkills.length === 0) return null   // only show if relevant to their skills

  const save = async () => {
    setSaving(true)
    try {
      const patch = { hasTools }
      await workersApi.updateMe(patch)
      onSaved(patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* toast is handled by parent if needed */ }
    finally { setSaving(false) }
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink-900/8 bg-cream-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600/10 text-forest-600">
          <Wrench size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-medium text-ink-900">Do you have your own tools?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-700/80">
            Workers who bring their own tools to {mySkills.join(', ')} jobs earn a 15% surcharge on the base rate.
            Employers can also see this on your profile when matching you to a task.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasTools(true)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all sm:flex-none sm:px-5 ${
                  hasTools
                    ? 'border-forest-600 bg-forest-600/8 text-forest-800'
                    : 'border-ink-900/15 text-ink-700 hover:border-forest-500/40'
                }`}
              >
                ✓ Yes, I bring my own tools
              </button>
              <button
                type="button"
                onClick={() => setHasTools(false)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all sm:flex-none sm:px-5 ${
                  !hasTools
                    ? 'border-ink-900 bg-ink-900/5 text-ink-900'
                    : 'border-ink-900/15 text-ink-700 hover:border-ink-900/30'
                }`}
              >
                ✗ No, employer provides
              </button>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 sm:ml-auto"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>

          {saved && (
            <p className="mt-2 text-xs text-forest-700">
              Updated — employers searching for workers with tools will now see this on your profile.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const cedis = (n?: number | string) => `GH\u20b5 ${Number(n || 0).toLocaleString()}`

const employerName = (t: Task) =>
  typeof t.employer === 'string' ? t.employer : t.employer?.orgName || t.employer?.name || 'BeyondX employer'

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} aria-hidden="true" className={i <= n ? 'fill-forest-600 text-forest-600' : 'text-ink-900/20'} />
      ))}
    </span>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream-50 p-4 shadow-sm ring-1 ring-ink-900/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-600/10 text-forest-600">{icon}</span>
      <span>
        <span className="block text-lg font-semibold text-ink-900">{value}</span>
        <span className="block text-xs text-ink-700">{label}</span>
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-cream-50 p-5 shadow-sm ring-1 ring-ink-900/5">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-ink-900/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/5" />
        </div>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-ink-900/15 p-10 text-center text-sm text-ink-700">{text}</div>
}

function TaskCard({ task, children }: { task: Task; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-cream-50 p-4 shadow-sm ring-1 ring-ink-900/5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <span className="mb-1 inline-block rounded-full bg-forest-600/10 px-2.5 py-0.5 text-xs font-medium text-forest-700">
          {task.taskType || 'Task'}
        </span>
        <h3 className="font-serif text-lg font-medium text-ink-900">{task.description || task.taskType || 'Task'}</h3>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
          {task.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" /> {task.location}</span>}
          {task.duration && <span className="inline-flex items-center gap-1"><Calendar size={14} aria-hidden="true" /> {task.duration}</span>}
          <span className="font-semibold text-ink-900">{cedis(task.pay)}</span>
        </div>
        <p className="mt-1 text-xs text-ink-700">Employer · <span className="font-medium text-ink-900">{employerName(task)}</span></p>
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  )
}

export default function WorkerDashboard() {
  const [tab, setTab] = useState<'available' | 'mine' | 'declined' | 'history' | 'support'>('available')
  const [offers, setOffers] = useState<Task[]>([])
  const [open, setOpen] = useState<Task[]>([])
  const [mine, setMine] = useState<Task[]>([])
  const [history, setHistory] = useState<Task[]>([])
  const [declined, setDeclined] = useState<Task[]>([])
  const [me, setMe] = useState<Worker | null>(session.worker())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | number | null>(null)
  const [editing, setEditing] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [toast, setToast] = useState<ToastMsg>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [openRes, mineRes, histRes, meRes] = await Promise.all([
        tasksApi.open(),
        tasksApi.mine(),
        tasksApi.workerHistory(),
        workersApi.me().catch(() => null),
      ])
      const mineTasks = mineRes?.tasks || []
      setOffers(mineTasks.filter((t) => t.status === 'offered'))
      setMine(mineTasks.filter((t) => t.status === 'accepted' || t.status === 'pending_confirmation'))
      setOpen((openRes?.tasks || []).filter((t) => t.status === 'open'))
      setHistory(histRes?.tasks || [])
      if (meRes?.worker) { setMe(meRes.worker); session.patchWorker(meRes.worker) }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (t: Task, fn: () => Promise<unknown>, msg: string, detail: string) => {
    if (busyId) return
    setBusyId(t.id)
    try {
      await fn()
      setToast({ id: Date.now(), kind: 'success', title: msg, detail })
      setAnnounce(msg)
      await load()
    } catch (e) {
      setToast({ id: Date.now(), kind: 'info', title: 'That did not go through', detail: e instanceof ApiError ? e.message : 'Please try again.' })
    } finally {
      setBusyId(null)
    }
  }

  const acceptOffer = (t: Task) => act(t, () => tasksApi.acceptOffer(t.id), 'Offer accepted', `${t.taskType || 'The task'} is now in My Tasks.`)
  const acceptOpen = (t: Task) => act(t, () => tasksApi.accept(t.id), 'Task accepted', `${t.taskType || 'The task'} is now in My Tasks.`)
  const markDone = (t: Task) =>
    act(
      t,
      async () => {
        await tasksApi.workerDone(t.id)
        // Notify BeyondX by email, as the main site does. Never let a failed
        // notification look like the task itself failed.
        const pay = Number(t.pay || 0).toFixed(2)
        contact
          .send({
            name: displayName,
            phone: (me?.phone as string) || undefined,
            message:
              `Worker ${displayName} (${(me?.workerId as string) || '—'}) marked a task as done.\n\n` +
              `Task: ${t.taskType || '—'}\n` +
              `Location: ${t.location || '—'}\n` +
              `Employer: ${employerName(t)}\n` +
              `Amount: GHS ${pay}`,
            category: 'task_completed',
          })
          .catch(() => null)
      },
      'Marked complete',
      `${employerName(t)} will confirm, then BeyondX releases your payment.`,
    )

  const declineOffer = async (t: Task) => {
    if (busyId) return
    setBusyId(t.id)
    try {
      await tasksApi.declineOffer(t.id)
      setDeclined((d) => [t, ...d])
      setToast({ id: Date.now(), kind: 'info', title: 'Offer declined', detail: 'It has moved to your Declined tab for this session.' })
      await load()
    } catch (e) {
      setToast({ id: Date.now(), kind: 'info', title: 'That did not go through', detail: e instanceof ApiError ? e.message : 'Please try again.' })
    } finally {
      setBusyId(null)
    }
  }

  const available = [...offers, ...open]
  const displayName = (me?.fullName as string) || (me?.name as string) || 'Worker'
  const photo = (me?.photoUrl as string) || undefined
  const completed = history.length
  const earned = history.reduce((sum, t) => sum + Number(t.pay || 0), 0)

  const profile: Profile = {
    avatar: photo,
    name: displayName,
    phone: (me?.phone as string) || '',
    experience: '',
    skills: Array.isArray(me?.skills) ? (me?.skills as string[]).join(', ') : '',
    bio: '',
  }

  const tabs = [
    { id: 'available', label: `Available (${available.length})` },
    { id: 'mine', label: `My Tasks (${mine.length})` },
    { id: 'declined', label: `Declined (${declined.length})` },
    { id: 'history', label: `History (${history.length})` },
    { id: 'support', label: 'Support' },
  ] as const

  return (
    <div className="min-h-screen bg-cream-100">
      <DashboardHeader role="WORKER" title="Worker Dashboard" name={displayName} avatar={photo} onEditProfile={() => setEditing(true)} tasks={[...offers, ...mine, ...history]} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <p aria-live="polite" className="sr-only">{announce}</p>

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {error}
            </p>
            <button onClick={() => { setLoading(true); load() }} className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-red-700">
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat icon={<Star size={20} />} label="Your rating" value={me?.rating && Number(me.rating) > 0 ? `${Number(me.rating).toFixed(1)}` : '—'} />
          <Stat icon={<img src="/icons/tasks.png" alt="" className="h-5 w-5 object-contain" />} label="Tasks completed" value={`${completed}`} />
          <Stat icon={<img src="/icons/wallet.png" alt="" className="h-5 w-5 object-contain" />} label="Total earned" value={cedis(earned)} />
        </div>

        <ReferralCard code={(me?.workerId as string) || 'BX-—'} referrals={0} />

        <ToolsStatusCard worker={me} onSaved={(patch) => { session.patchWorker(patch); setMe((m) => ({ ...(m || {}), ...patch })) }} />

        <div className="mt-8 flex items-center gap-2 overflow-x-auto border-b border-ink-900/10 pb-px" role="tablist" aria-label="Worker sections">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 ${tab === t.id ? 'border-forest-600 text-forest-700' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); load() }} aria-label="Refresh tasks"
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-900/5">
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>

        {tab === 'support' && (
          <SupportPanel
            role="worker"
            onSent={() => setToast({ id: Date.now(), kind: 'success', title: 'Message sent', detail: 'Our team will follow up with you shortly.' })}
            onError={(m) => setToast({ id: Date.now(), kind: 'info', title: 'Could not send', detail: m })}
          />
        )}

        <div className="mt-6 space-y-3">
          {tab === 'support' ? null : loading ? <Skeleton /> : (
            <>
              {tab === 'available' && (available.length ? available.map((t) => (
                <TaskCard key={t.id} task={t}>
                  <button onClick={() => (t.status === 'offered' ? acceptOffer(t) : acceptOpen(t))} disabled={busyId === t.id} aria-label={`Accept ${t.taskType || 'task'}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60 sm:flex-none">
                    <Check size={16} aria-hidden="true" /> {busyId === t.id ? 'Working…' : 'Accept'}
                  </button>
                  {t.status === 'offered' && (
                    <button onClick={() => declineOffer(t)} disabled={busyId === t.id} aria-label={`Decline ${t.taskType || 'task'}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5 disabled:opacity-60 sm:flex-none">
                      <X size={16} aria-hidden="true" /> Decline
                    </button>
                  )}
                </TaskCard>
              )) : <Empty text="No tasks available right now. Check back soon." />)}

              {tab === 'mine' && (
                <>
                  {mine.length > 0 && (
                    <p className="flex items-start gap-2 rounded-xl bg-forest-600/5 p-3 text-xs leading-relaxed text-ink-700 ring-1 ring-forest-600/15">
                      <Info size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-forest-600" />
                      Mark a task complete when you finish. Your employer confirms the work, then BeyondX releases your payment.
                    </p>
                  )}
                  {mine.length ? mine.map((t) => (
                    <div key={t.id}>
                      <TaskCard task={t}>
                        {t.status === 'pending_confirmation' ? (
                          <span className="rounded-full bg-ink-900/10 px-3 py-1.5 text-xs font-semibold text-ink-700">Awaiting employer confirmation</span>
                        ) : (
                          <button onClick={() => markDone(t)} disabled={busyId === t.id} aria-label={`Mark ${t.taskType || 'task'} complete`}
                            className="shrink-0 rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98] disabled:opacity-60">
                            {busyId === t.id ? 'Working…' : 'Mark Complete'}
                          </button>
                        )}
                      </TaskCard>
                      <div className="-mt-1 rounded-b-xl bg-cream-50 px-4 pb-4 shadow-sm ring-1 ring-ink-900/5 sm:px-5">
                        <LocationShare
                          taskId={t.id}
                          workerId={(me?.workerId as string) || undefined}
                          workerName={displayName}
                          disabled={t.status === 'pending_confirmation' || isRemote(t.taskType || '')}
                        />
                      </div>
                    </div>
                  )) : <Empty text="You haven't accepted any tasks yet." />}
                </>
              )}

              {tab === 'declined' && (declined.length ? declined.map((t) => (
                <TaskCard key={t.id} task={t}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1.5 text-xs text-ink-700">
                    <RotateCcw size={13} aria-hidden="true" /> Declined
                  </span>
                </TaskCard>
              )) : <Empty text="You haven't declined any offers in this session." />)}

              {tab === 'history' && (history.length ? history.map((t) => {
                const rating = t.reviews?.[0]?.rating
                return (
                  <div key={t.id} className="rounded-xl bg-cream-50 p-4 shadow-sm ring-1 ring-ink-900/5 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="mb-1 inline-block rounded-full bg-ink-900/5 px-2.5 py-0.5 text-xs font-medium text-ink-700">{t.taskType || 'Task'}</span>
                        <h3 className="font-serif text-lg font-medium text-ink-900">{t.description || t.taskType}</h3>
                        <p className="mt-0.5 text-sm text-ink-700">{employerName(t)}{t.location ? ` · ${t.location}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {rating ? (
                          <span className="text-right">
                            <span className="block text-xs text-ink-700">Employer rated you</span>
                            <Stars n={Number(rating)} />
                          </span>
                        ) : null}
                        <span className="font-semibold text-ink-900">{cedis(t.pay)}</span>
                      </div>
                    </div>
                  </div>
                )
              }) : <Empty text="No completed tasks yet." />)}
            </>
          )}
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {editing && (
        <ProfileModal
          role="WORKER"
          initial={profile}
          onClose={() => setEditing(false)}
          onSave={async (p) => {
            setEditing(false)
            try {
              const skills = p.skills ? p.skills.split(',').map((x) => x.trim()).filter(Boolean) : []
              // Only send the photo when it is a stored URL, never a local preview.
              const photoUrl = p.avatar && /^https?:\/\//.test(p.avatar) ? p.avatar : undefined
              const patch: Record<string, unknown> = { skills }
              if (photoUrl && photoUrl !== me?.photoUrl) patch.photoUrl = photoUrl
              await workersApi.updateMe(patch)
              session.patchWorker(patch)
              setMe((m) => ({ ...(m || {}), ...patch }))
              setToast({ id: Date.now(), kind: 'success', title: 'Profile updated', detail: 'Employers will now see your latest skills.' })
            } catch (e) {
              setToast({ id: Date.now(), kind: 'info', title: 'Could not save profile', detail: e instanceof ApiError ? e.message : 'Please try again.' })
            }
          }}
        />
      )}
    </div>
  )
}
