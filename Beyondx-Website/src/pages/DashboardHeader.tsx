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
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-cream-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-8">
        {/* Far left: logo + dashboard title */}
        <button onClick={() => go('home')} aria-label="Go to BeyondX home" className="shrink-0">
          <Logo tone="dark" className="h-7 sm:h-8" />
        </button>
        <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-ink-900/15 sm:block" />
        <h1 className="min-w-0 truncate font-serif text-base font-medium text-ink-900 sm:text-lg">{title}</h1>

        {/* Right cluster, same line */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full bg-forest-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-forest-700 lg:inline">
            {role} · VERIFIED
          </span>
          <Notifications role={role === 'WORKER' ? 'worker' : 'employer'} tasks={tasks} />
          {onEditProfile && (
            <button onClick={onEditProfile} aria-label="Edit your profile"
              className="flex items-center gap-2 rounded-full border border-ink-900/15 py-1 pl-1 pr-1 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5 active:scale-[0.98] sm:pr-3.5">
              {avatar
                ? <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-cream-50"><UserRound size={15} /></span>}
              <span className="hidden sm:inline">{name ? name.split(' ')[0] : 'Profile'}</span>
            </button>
          )}
          <button onClick={logout} aria-label="Log out and return home"
            className="flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5 active:scale-[0.98]">
            <LogOut size={15} aria-hidden="true" /> <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
