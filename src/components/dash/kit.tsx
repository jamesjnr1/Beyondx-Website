// The dashboards' shared building blocks, so every section of every dashboard
// reads the same way: a page header, KPI tiles, white panels with a titled
// header, status shown as a coloured dot and text (never a pill), list rows,
// empty states and loading skeletons. Icons are Phosphor duotone.
import type { ComponentType, ReactNode } from 'react'
import { ArrowUpRight, CaretRight } from '@phosphor-icons/react'

export type IconType = ComponentType<{ size?: number | string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; className?: string }>

/* ------------------------------ page header ------------------------------ */

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink-900 sm:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-700/70">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* --------------------------------- buttons -------------------------------- */

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-800 active:scale-[0.98] disabled:opacity-60'
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-900/[0.04] active:scale-[0.98] disabled:opacity-60'
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-forest-700 transition-colors hover:bg-forest-600/10'

/* -------------------------------- KPI tiles ------------------------------- */

const KPI_TONES = {
  green: 'from-forest-700 to-forest-900',
  teal: 'from-teal-600 to-teal-800',
  blue: 'from-sky-600 to-blue-800',
  violet: 'from-violet-600 to-purple-800',
} as const
export type KpiTone = keyof typeof KPI_TONES

/** A headline figure on a coloured tile: label top-left, an arrow to open the
 *  related section top-right, the figure large, and a one-line hint. */
export function KpiTile({ tone, icon: Icon, label, value, hint, onClick }: {
  tone: KpiTone; icon: IconType; label: string; value: ReactNode; hint?: ReactNode; onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`group relative isolate flex min-h-[8rem] flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${KPI_TONES[tone]} p-4 sm:min-h-[9.5rem] sm:p-5 text-left text-white shadow-sm transition-transform ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <span aria-hidden="true" className="absolute -right-10 -top-10 -z-10 h-36 w-36 rounded-full border border-white/10" />
      <span aria-hidden="true" className="absolute -right-4 -top-4 -z-10 h-20 w-20 rounded-full border border-white/10" />
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium text-white/85 sm:text-sm">
          <Icon size={18} weight="duotone" className="shrink-0" /> {label}
        </span>
        {onClick && (
          <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink-900 transition-transform group-hover:rotate-12 sm:grid">
            <ArrowUpRight size={16} weight="bold" />
          </span>
        )}
      </div>
      <p className="mt-auto pt-3 font-display text-[1.625rem] font-bold leading-none tracking-tight sm:pt-4 sm:text-[2.25rem]">{value}</p>
      {hint && <p className="mt-2 line-clamp-2 text-xs text-white/75">{hint}</p>}
    </Tag>
  )
}

/* --------------------------------- panels --------------------------------- */

/** A white card with a titled header row (icon, title, description, action). */
export function Panel({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = 'p-5 sm:p-6' }: {
  title?: ReactNode; subtitle?: ReactNode; icon?: IconType; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-ink-900/[0.08] bg-white shadow-[0_1px_2px_rgba(18,24,14,0.04)] ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-ink-900/[0.06] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && <Icon size={22} weight="duotone" className="mt-0.5 shrink-0 text-forest-700" />}
            <div className="min-w-0">
              {title && <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-ink-700/65">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

/* ------------------------------ status, rows ------------------------------ */

const DOT = { success: 'bg-forest-600', info: 'bg-sky-500', warning: 'bg-amber-500', danger: 'bg-red-500', muted: 'bg-ink-900/25' } as const
const TXT = { success: 'text-forest-800', info: 'text-sky-800', warning: 'text-amber-800', danger: 'text-red-700', muted: 'text-ink-700/70' } as const
export type Tone = keyof typeof DOT

/** Status as a coloured dot and text. */
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${TXT[tone]}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} /> {children}
    </span>
  )
}

/** Map the free-text colour class used by older status helpers to a tone. */
export function toneFromClass(cls = ''): Tone {
  if (/red/.test(cls)) return 'danger'
  if (/amber|yellow|orange/.test(cls)) return 'warning'
  if (/forest|green/.test(cls)) return 'success'
  if (/sky|blue/.test(cls)) return 'info'
  return 'muted'
}

/** One line of label / value, for detail panels. */
export function InfoRow({ icon: Icon, label, children }: { icon?: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon size={18} weight="duotone" className="mt-0.5 shrink-0 text-forest-700" />}
      <span className="w-28 shrink-0 text-sm text-ink-700/60">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink-900">{children}</span>
    </div>
  )
}

/** A clickable or static row inside a panel list. */
export function ListRow({ icon: Icon, title, detail, meta, right, onClick }: {
  icon?: IconType; title: ReactNode; detail?: ReactNode; meta?: ReactNode; right?: ReactNode; onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`flex w-full items-center gap-4 px-5 py-3.5 text-left sm:px-6 ${onClick ? 'transition-colors hover:bg-forest-50/60' : ''}`}>
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700">
          <Icon size={20} weight="duotone" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-xs text-ink-700/60">{detail}</span>}
      </span>
      {meta && <span className="hidden shrink-0 text-xs text-ink-700/60 sm:block">{meta}</span>}
      {right && <span className="shrink-0">{right}</span>}
      {onClick && <CaretRight size={16} className="shrink-0 text-ink-700/35" />}
    </Tag>
  )
}

/** Banner for the one thing that needs attention now. */
export function AlertBanner({ tone = 'warning', icon: Icon, title, text, action }: {
  tone?: 'warning' | 'danger' | 'info' | 'success'; icon: IconType; title: ReactNode; text?: ReactNode; action?: ReactNode
}) {
  const styles = {
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-forest-600/20 bg-forest-50 text-forest-900',
  }[tone]
  return (
    <div className={`mb-6 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center ${styles}`}>
      <Icon size={24} weight="duotone" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {text && <p className="mt-0.5 text-sm opacity-80">{text}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------ empty, loading ---------------------------- */

export function EmptyState({ icon: Icon, title, text, action }: { icon: IconType; title?: string; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon size={44} weight="duotone" className="text-forest-600" />
      {title && <p className="mt-4 font-display text-base font-semibold text-ink-900">{title}</p>}
      <p className={`${title ? 'mt-1' : 'mt-4'} max-w-sm text-sm leading-relaxed text-ink-700/70`}>{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink-900/[0.06] rounded-2xl border border-ink-900/[0.08] bg-white" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-ink-900/[0.07]" />
          <div className="flex-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink-900/[0.08]" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-ink-900/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Text tabs for switching lists within a section; the current one is bold
 *  and green with a small dot, matching the site navigation. */
export function TextTabs<T extends string>({ tabs, active, onChange, label }: {
  tabs: readonly { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void; label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex min-w-0 items-center gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button key={t.id} role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            className={`relative shrink-0 py-1.5 text-sm transition-colors focus:outline-none ${on ? 'font-semibold text-forest-700' : 'font-medium text-ink-700/70 hover:text-ink-900'}`}>
            {t.label}{typeof t.count === 'number' ? <span className={`ml-1.5 ${on ? 'text-forest-700' : 'text-ink-700/45'}`}>{t.count}</span> : null}
            {on && <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-forest-600" />}
          </button>
        )
      })}
    </div>
  )
}
