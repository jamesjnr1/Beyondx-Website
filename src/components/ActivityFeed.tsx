import type { ReactNode } from 'react'

export type ActivityTone = 'success' | 'info' | 'warning'

export interface ActivityItem {
  id: string | number
  icon: ReactNode
  title: string
  detail?: string
  status?: { label: string; tone: ActivityTone }
}

const TONE_CLASSES: Record<ActivityTone, string> = {
  success: 'text-forest-700',
  info: 'text-ink-700/70',
  warning: 'text-amber-700',
}

/** "Recent Activity" list shared across dashboards. Dates/status are only
 *  shown when the underlying record actually carries them — never invented. */
export default function ActivityFeed({ items, empty, title }: { items: ActivityItem[]; empty: string; title?: string }) {
  return (
    <div className="rounded-2xl border border-ink-900/8 bg-white p-5 shadow-sm sm:p-6">
      {title && <h2 className="mb-2 text-base font-semibold text-ink-900">{title}</h2>}
      {items.length ? (
    <ul className="divide-y divide-ink-900/8">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600/10 text-forest-600">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">{item.title}</span>
            {item.detail && <span className="block truncate text-xs text-ink-700/60">{item.detail}</span>}
          </span>
          {item.status && (
            <span className={`shrink-0 text-sm font-medium ${TONE_CLASSES[item.status.tone]}`}>
              {item.status.label}
            </span>
          )}
        </li>
      ))}
    </ul>
      ) : (
        <p className="py-6 text-center text-sm text-ink-700/70">{empty}</p>
      )}
    </div>
  )
}
