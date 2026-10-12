import { LogOut, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../components/auth/AuthContext'
import Notifications from '../components/Notifications'
import type { Task } from '../lib/api'
import type { DashboardNavItem } from '../components/DashboardSidebar'

export default function DashboardHeader({
  role, title, name, avatar, onEditProfile, tasks = [], navItems, active, onSelect,
}: {
  role: 'WORKER' | 'EMPLOYER'
  title: string
  name?: string
  avatar?: string
  onEditProfile?: () => void
  tasks?: Task[]
  /** A short, curated subset of the sidebar's sections (3-4 items), shown as
   *  a full-width top nav bar on large screens — the sidebar itself carries
   *  the complete list. */
  navItems?: DashboardNavItem[]
  active?: string
  onSelect?: (id: string) => void
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
        <h1 className={`min-w-0 shrink-0 truncate font-serif text-base font-medium text-ink-900 sm:text-lg ${navItems && navItems.length > 0 ? 'lg:sr-only' : ''}`}>{title}</h1>

        {/* Long centre nav bar — a short, curated set of top-level sections
         *  (not the full sidebar list, which can run to 6-8 items). */}
        {navItems && navItems.length > 0 && (
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Dashboard sections">
            {navItems.map((item) => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none ${
                    isActive ? 'bg-ink-900 text-cream-50' : 'text-ink-700 hover:bg-ink-900/5 hover:text-ink-900'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Notifications role={role === 'WORKER' ? 'worker' : 'employer'} tasks={tasks} />
          {onEditProfile && (
            <button onClick={onEditProfile} aria-label="Edit your profile"
              className="flex items-center gap-2 rounded-full border border-ink-900/15 py-1 pl-1 pr-1 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5 active:scale-[0.98] sm:pr-3.5">
              {avatar
                ? <img src={avatar} alt="" className="h-7 w-7 rounded-[9999px] object-cover" />
                : <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-cream-50"><UserRound size={15} /></span>}
              <span className="hidden sm:inline">{name ? name.split(' ')[0] : 'Profile'}</span>
            </button>
          )}
          <button onClick={logout} aria-label="Log out and return home"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/15 text-ink-700 transition-colors hover:bg-ink-900/5 active:scale-[0.98] sm:w-auto sm:gap-1.5 sm:px-3">
            <LogOut size={15} aria-hidden="true" />
            <span className="hidden sm:inline text-sm font-medium text-ink-800">Log Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
