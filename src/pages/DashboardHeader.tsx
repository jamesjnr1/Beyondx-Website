import { LogOut, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../components/auth/AuthContext'
import Notifications from '../components/Notifications'
import type { Task } from '../lib/api'

export default function DashboardHeader({
  role, title, name, avatar, onEditProfile, tasks = [],
}: {
  role: 'WORKER' | 'EMPLOYER'
  title: string
  name?: string
  avatar?: string
  onEditProfile?: () => void
  tasks?: Task[]
}) {
  const { go, logout } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-cream-50/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-8">

        {/* Logo */}
        <button
          onClick={() => go('home')}
          aria-label="Go to BeyondX home"
          className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
        >
          <Logo tone="dark" className="h-6 sm:h-7" />
        </button>

        {/* Divider + page title */}
        <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-ink-900/15 sm:block" />
        <h1 className="min-w-0 truncate text-sm font-semibold text-ink-900 sm:text-base">{title}</h1>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Notifications role={role === 'WORKER' ? 'worker' : 'employer'} tasks={tasks} />

          {onEditProfile && (
            <button
              onClick={onEditProfile}
              aria-label="Edit profile"
              className="flex items-center gap-2 rounded-full border border-ink-900/12 bg-cream-50 py-1 pl-1 pr-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/4 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 sm:pr-3"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-cream-50">
                  <UserRound size={14} />
                </span>
              )}
              <span className="hidden max-w-[120px] truncate sm:block">
                {name ? name.split(' ').slice(0, 2).join(' ') : 'Profile'}
              </span>
            </button>
          )}

          <button
            onClick={logout}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-full border border-ink-900/12 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40"
          >
            <LogOut size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
