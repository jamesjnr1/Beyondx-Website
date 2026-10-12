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

/** Full-height dark rail flush against the left edge, directly under the
 *  top bar. Desktop only — see DashboardMobileNav for small screens. */
export default function DashboardSidebar({ items, active, onSelect }: NavProps) {
  return (
    <aside className="hidden w-60 shrink-0 bg-ink-900 lg:block">
      <nav className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto px-3 py-5" aria-label="Dashboard sections">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors focus:outline-none ${
                isActive ? 'bg-forest-700 text-cream-50 shadow-sm' : 'text-cream-200/70 hover:bg-cream-50/5 hover:text-cream-50'
              }`}
            >
              <Icon size={18} aria-hidden="true" className={isActive ? 'text-cream-50' : 'text-cream-200/60'} />
              <span className="flex-1">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-cream-50/20 text-cream-50' : 'bg-cream-50/10 text-cream-200/80'}`}>
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

/** Horizontal scrollable pill bar standing in for the sidebar below `lg:`. */
export function DashboardMobileNav({ items, active, onSelect }: NavProps) {
  return (
    <nav
      className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-ink-900 p-1 lg:hidden"
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
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none ${
              isActive ? 'bg-forest-700 text-cream-50' : 'text-cream-200/65 hover:text-cream-100'
            }`}
          >
            {item.label}{typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
          </button>
        )
      })}
    </nav>
  )
}
