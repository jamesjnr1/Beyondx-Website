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
  success: 'bg-forest-600/10 text-forest-700',
  info: 'bg-ink-900/8 text-ink-700',
  warning: 'bg-amber-100 text-amber-800',
}

/** "Recent Activity" list shared across dashboards. Dates/status are only
 *  shown when the underlying record actually carries them — never invented. */
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
        <li key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600/10 text-forest-600">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">{item.title}</span>
            {item.detail && <span className="block truncate text-xs text-ink-700/60">{item.detail}</span>}
          </span>
          {item.status && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASSES[item.status.tone]}`}>
              {item.status.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
