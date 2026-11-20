import { Globe, LifeBuoy, LogOut, UserRound, type LucideIcon } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from './auth/AuthContext'

export interface DashboardNavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

type NavProps = {
  items: DashboardNavItem[]
  active: string
  onSelect: (id: string) => void
}

type SidebarProps = NavProps & {
  /** Shown under the logo, e.g. "Employer". */
  roleLabel: string
  onEditProfile?: () => void
  /** The card at the foot of the rail. Defaults to a link to Support. */
  card?: { title: string; text: string; label: string; onClick: () => void }
}

const itemCls = (isActive: boolean) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none ${
    isActive ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10' : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`

/** The one dashboard navigation on desktop: a full-height brand-green rail
 *  with the logo, the sections, general links and a help card. Small screens
 *  use DashboardMobileNav instead. */
export default function DashboardSidebar({ items, active, onSelect, roleLabel, onEditProfile, card }: SidebarProps) {
  const { go, logout } = useAuth()
  const foot = card ?? { title: 'Need help?', text: 'Our team is here for you, every step of the way.', label: 'Contact support', onClick: () => onSelect('support') }
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col bg-gradient-to-b from-forest-700 via-forest-800 to-forest-900 text-white">
      <button onClick={() => go('home')} aria-label="Go to BeyondX home" className="flex items-center gap-3 px-6 pb-6 pt-6 text-left">
        <Logo tone="light" className="h-8" />
        <span className="border-l border-white/20 pl-3 text-[0.6875rem] font-semibold uppercase leading-tight tracking-[0.14em] text-white/70">
          {roleLabel}<span className="block font-normal normal-case tracking-normal text-white/50">Dashboard</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-4" aria-label="Dashboard sections">
        <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/50">Menu</p>
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button key={item.id} onClick={() => onSelect(item.id)} aria-current={isActive ? 'page' : undefined} className={itemCls(isActive)}>
                <Icon size={18} aria-hidden="true" className={isActive ? 'text-white' : 'text-white/60'} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-red-500 px-1.5 text-[0.6875rem] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <p className="mb-2 mt-7 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/50">General</p>
        <div className="flex flex-col gap-0.5">
          {onEditProfile && (
            <button onClick={onEditProfile} className={itemCls(false)}>
              <UserRound size={18} aria-hidden="true" className="text-white/60" /> <span>Edit profile</span>
            </button>
          )}
          <button onClick={() => go('home')} className={itemCls(false)}>
            <Globe size={18} aria-hidden="true" className="text-white/60" /> <span>BeyondX website</span>
          </button>
          <button onClick={logout} className={itemCls(false)}>
            <LogOut size={18} aria-hidden="true" className="text-white/60" /> <span>Sign out</span>
          </button>
        </div>
      </nav>

      <div className="m-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
        <p className="flex items-center gap-2 text-sm font-semibold"><LifeBuoy size={16} aria-hidden="true" className="text-forest-300" /> {foot.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/65">{foot.text}</p>
        <button onClick={foot.onClick} className="mt-3 w-full rounded-full bg-white py-2 text-sm font-semibold text-forest-900 transition-colors hover:bg-cream-100">
          {foot.label}
        </button>
      </div>
    </aside>
  )
}

/** Pill tabs, scrollable sideways, standing in for the sidebar below `lg:`. */
export function DashboardMobileNav({ items, active, onSelect }: NavProps) {
  return (
    <nav
      className="-mx-4 mb-6 flex min-w-0 items-center gap-2 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Dashboard sections"
      role="tablist"
    >
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
              isActive ? 'border-forest-700 bg-forest-700 text-white' : 'border-ink-900/10 bg-white text-ink-700 hover:text-ink-900'
            }`}
          >
            {item.label}{typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
          </button>
        )
      })}
    </nav>
  )
}
