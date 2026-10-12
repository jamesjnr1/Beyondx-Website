import type { ReactNode } from 'react'

export interface ActivityItem {
  id: string | number
  icon: ReactNode
  title: string
  detail?: string
  date?: string
}

/** "Recent Activity" list shared across dashboards. Dates are only shown
 *  when the underlying record actually carries one — never invented. */
export default function ActivityFeed({ items, empty }: { items: ActivityItem[]; empty: string }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-900/15 bg-cream-50/50 p-8 text-center">
        <p className="text-sm text-ink-700">{empty}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-ink-900/6 overflow-hidden rounded-2xl border border-ink-900/8 bg-cream-50">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600/10 text-forest-600">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">{item.title}</span>
            {item.detail && <span className="block truncate text-xs text-ink-700/60">{item.detail}</span>}
          </span>
          {item.date && <span className="shrink-0 pt-0.5 text-xs text-ink-700/50">{item.date}</span>}
        </li>
      ))}
    </ul>
  )
}
