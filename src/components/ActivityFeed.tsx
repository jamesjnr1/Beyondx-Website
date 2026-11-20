import type { ReactNode } from 'react'
import { ClockCounterClockwise } from '@phosphor-icons/react'
import { EmptyState, Panel, Status } from './dash/kit'

export type ActivityTone = 'success' | 'info' | 'warning'

export interface ActivityItem {
  id: string | number
  icon: ReactNode
  title: string
  detail?: string
  status?: { label: string; tone: ActivityTone }
}

/** "Recent activity" panel shared across dashboards. Dates and status are only
 *  shown when the underlying record actually carries them, never invented. */
export default function ActivityFeed({ items, empty, title, action }: { items: ActivityItem[]; empty: string; title?: string; action?: ReactNode }) {
  return (
    <Panel title={title || 'Recent activity'} subtitle="The latest changes across your jobs" icon={ClockCounterClockwise} action={action} bodyClassName="">
      {items.length ? (
        <ul className="divide-y divide-ink-900/[0.06]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">{item.title}</span>
                {item.detail && <span className="mt-0.5 block truncate text-xs text-ink-700/60">{item.detail}</span>}
              </span>
              {item.status && <span className="shrink-0"><Status tone={item.status.tone}>{item.status.label}</Status></span>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={ClockCounterClockwise} text={empty} />
      )}
    </Panel>
  )
}
