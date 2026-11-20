import type { LucideIcon } from 'lucide-react'

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

/** The one dashboard navigation on desktop: a light rail under the top bar.
 *  Small screens use DashboardMobileNav instead. */
export default function DashboardSidebar({ items, active, onSelect }: NavProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-900/10 bg-white lg:block">
      <nav className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto px-4 py-6" aria-label="Dashboard sections">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-ink-700/50">Menu</p>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none ${
                isActive ? 'bg-forest-600/10 text-forest-800' : 'text-ink-700 hover:bg-ink-900/[0.04] hover:text-ink-900'
              }`}
            >
              <Icon size={18} aria-hidden="true" className={isActive ? 'text-forest-700' : 'text-ink-700/60'} />
              <span className="flex-1">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 ? (
                <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${isActive ? 'bg-forest-700 text-white' : 'bg-ink-900/[0.06] text-ink-700'}`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>
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
