import { LogOut, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../components/auth/AuthContext'
import Notifications from '../components/Notifications'
import type { Task } from '../lib/api'

export default function DashboardHeader({
  role, title, name, avatar, onEditProfile, tasks = [], cta,
}: {
  role: 'XPERT' | 'EMPLOYER'
  title: string
  name?: string
  avatar?: string
  onEditProfile?: () => void
  tasks?: Task[]
  /** Primary action button in the right cluster (e.g. Post a Task). */
  cta?: { label: string; onClick: () => void }
}) {
  const { go, logout } = useAuth()
  const initials = (name || '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:pl-0 lg:pr-8">
        {/* Logo sits directly above the sidebar rail on desktop */}
        <div className="flex shrink-0 items-center lg:h-full lg:w-64 lg:border-r lg:border-forest-600/15 lg:bg-[#dcefc5] lg:pl-6">
          <button onClick={() => go('home')} aria-label="Go to BeyondX home" className="shrink-0">
            <Logo tone="dark" className="h-7 sm:h-8" />
          </button>
        </div>
        <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-ink-900/15 sm:block lg:hidden" />
        <h1 className="sr-only min-w-0 truncate font-display text-base font-semibold text-ink-900 sm:not-sr-only sm:text-lg lg:pl-4">{title}</h1>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {cta && (
            <button onClick={cta.onClick}
              className="mr-1 hidden rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-800 sm:block">
              {cta.label}
            </button>
          )}
          <Notifications role={role === 'XPERT' ? 'worker' : 'employer'} tasks={tasks} />
          <button onClick={logout} aria-label="Log out and return home"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/15 text-ink-700 transition-colors hover:bg-ink-900/5 active:scale-[0.98] sm:w-auto sm:gap-1.5 sm:px-3">
            <LogOut size={15} aria-hidden="true" />
            <span className="hidden sm:inline text-sm font-medium text-ink-800">Log Out</span>
          </button>
          {onEditProfile && (
            <button onClick={onEditProfile} aria-label="Edit your profile" title={name || 'Profile'}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-900 text-sm font-semibold text-cream-50 transition-transform hover:opacity-90 active:scale-[0.96]">
              {avatar
                ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                : initials || <UserRound size={16} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
