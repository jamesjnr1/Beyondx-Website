import type { LucideIcon } from 'lucide-react'

export interface DashboardNavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

/** Sidebar nav shared by the Worker, Coordinator and Employer dashboards —
 *  a vertical rail from `lg:` up, collapsing to the same horizontal
 *  scrollable pill bar the dashboards already used before this existed. */
export default function DashboardSidebar({
  items, active, onSelect,
}: {
  items: DashboardNavItem[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <>
      <aside className="hidden shrink-0 lg:block lg:w-56">
        <nav className="sticky top-24 flex flex-col gap-1" aria-label="Dashboard sections">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none ${
                  isActive ? 'bg-forest-600 text-cream-50 shadow-sm' : 'text-ink-700 hover:bg-ink-900/5'
                }`}
              >
                <Icon size={17} aria-hidden="true" className={isActive ? 'text-cream-50' : 'text-ink-700/60'} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-cream-50/20 text-cream-50' : 'bg-ink-900/8 text-ink-700'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </aside>

      <nav
        className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-ink-900/5 p-1 lg:hidden"
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
                isActive ? 'bg-cream-50 text-forest-700 shadow-sm' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              {item.label}{typeof item.badge === 'number' && item.badge > 0 ? ` (${item.badge})` : ''}
            </button>
          )
        })}
      </nav>
    </>
  )
}
