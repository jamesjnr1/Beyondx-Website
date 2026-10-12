import type { LucideIcon } from 'lucide-react'

export interface DashboardNavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

/** Dark sidebar nav shared by the Worker, Coordinator and Employer
 *  dashboards — a vertical rail from `lg:` up, collapsing to a horizontal
 *  scrollable pill bar on smaller screens. */
export default function DashboardSidebar({
  items, active, onSelect,
}: {
  items: DashboardNavItem[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <>
      {/* The dark panel stretches to the full height of the content column
          (and at least most of the viewport), with the links kept sticky. */}
      <aside className="hidden shrink-0 lg:flex lg:w-64">
        <nav className="flex w-full flex-col rounded-2xl bg-ink-900 p-3 lg:min-h-[calc(100vh-8rem)]" aria-label="Dashboard sections">
          <div className="sticky top-24 flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none ${
                  isActive ? 'bg-forest-700 text-cream-50 shadow-sm' : 'text-cream-200/65 hover:bg-cream-50/5 hover:text-cream-100'
                }`}
              >
                <Icon size={17} aria-hidden="true" className={isActive ? 'text-cream-50' : 'text-cream-200/50'} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-cream-50/20 text-cream-50' : 'bg-cream-50/10 text-cream-200/80'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
          </div>
        </nav>
      </aside>

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
    </>
  )
}
