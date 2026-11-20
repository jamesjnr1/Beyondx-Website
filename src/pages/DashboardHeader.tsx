import { CalendarDays, LogOut, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../components/auth/AuthContext'
import Notifications from '../components/Notifications'
import type { Task } from '../lib/api'

/** Top bar beside the sidebar: who is signed in on the left, the main action,
 *  notifications and today's date on the right. On phones it carries the logo
 *  and sign-out, since the sidebar is hidden there. */
export default function DashboardHeader({
  role, title, name, avatar, onEditProfile, tasks = [], cta,
}: {
  role: 'XPERT' | 'EMPLOYER'
  title: string
  name?: string
  avatar?: string
  onEditProfile?: () => void
  tasks?: Task[]
  /** Primary action button in the right cluster (e.g. Request an Xpert). */
  cta?: { label: string; onClick: () => void }
}) {
  const { go, logout } = useAuth()
  const initials = (name || '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const avatarEl = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-600/15 text-sm font-semibold text-forest-800">
      {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials || <UserRound size={16} aria-hidden="true" />}
    </span>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-ink-900/10 bg-white/90 backdrop-blur lg:pl-64">
      <h1 className="sr-only">{title}</h1>
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
        {/* Phones: logo (the sidebar is hidden) */}
        <button onClick={() => go('home')} aria-label="Go to BeyondX home" className="shrink-0 lg:hidden">
          <Logo tone="dark" className="h-7" />
        </button>

        {/* Desktop: who is signed in */}
        <button onClick={onEditProfile} disabled={!onEditProfile} title="Edit your profile"
          className="hidden min-w-0 items-center gap-3 rounded-full py-1 pr-3 text-left transition-colors enabled:hover:bg-ink-900/[0.03] lg:flex">
          {avatarEl}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-900">{name || 'Your account'}</span>
            <span className="block truncate text-xs text-ink-700/60">{title}</span>
          </span>
          <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-forest-700">
            {title.startsWith('Coordinator') ? 'Coordinator' : role === 'XPERT' ? 'Xpert' : 'Employer'}
          </span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {cta && (
            <button onClick={cta.onClick}
              className="hidden rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-800 sm:block">
              {cta.label}
            </button>
          )}
          <Notifications role={role === 'XPERT' ? 'worker' : 'employer'} tasks={tasks} />
          <span className="ml-2 hidden items-center gap-2 text-sm text-ink-700 lg:flex">
            <CalendarDays size={15} aria-hidden="true" className="text-forest-700" /> {today}
          </span>
          {/* Phones: sign out and profile (desktop has both in the sidebar) */}
          <button onClick={logout} aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/15 text-ink-700 transition-colors hover:bg-ink-900/5 lg:hidden">
            <LogOut size={15} aria-hidden="true" />
          </button>
          {onEditProfile && (
            <button onClick={onEditProfile} aria-label="Edit your profile" className="lg:hidden">{avatarEl}</button>
          )}
        </div>
      </div>
    </header>
  )
}
