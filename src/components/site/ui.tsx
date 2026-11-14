import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** One container and one vertical rhythm for every public section, so the page reads as a single system. */
export const container = 'mx-auto w-full max-w-[1200px] px-5 sm:px-8'
export const sectionY = 'py-16 sm:py-24 lg:py-28'

/** Fade-and-rise once, when scrolled into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Section label: a short rule and small capitals. */
export function Chip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] ${dark ? 'text-forest-300' : 'text-forest-800'}`}>
      <span aria-hidden="true" className={`h-px w-8 ${dark ? 'bg-forest-400' : 'bg-forest-600'}`} />
      {children}
    </span>
  )
}

/** The accent words inside a heading: italic serif in the brand green. */
export function Accent({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <span className={`italic ${dark ? 'text-forest-400' : 'text-forest-700'}`}>{children}</span>
}

export const h2 = 'font-serif text-[2rem] font-medium leading-[1.12] tracking-[-0.015em] text-balance sm:text-[2.5rem] sm:leading-[1.1] lg:text-5xl lg:leading-[1.08]'

/** Label, heading and lead for a section. Left-aligned by default; centred where the content below is centred. */
export function SectionHead({ chip, title, lead, dark, center, className = '' }: {
  chip: string; title: ReactNode; lead?: ReactNode; dark?: boolean; center?: boolean; className?: string
}) {
  return (
    <Reveal className={`${center ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      <Chip dark={dark}>{chip}</Chip>
      <h2 className={`${h2} mt-5 ${dark ? 'text-cream-50' : 'text-ink-900'}`}>{title}</h2>
      {lead && <p className={`mt-5 text-base leading-relaxed text-pretty sm:text-lg ${dark ? 'text-cream-200/75' : 'text-ink-700/80'}`}>{lead}</p>}
    </Reveal>
  )
}

/** Plain bordered card used across the light sections: a hairline, no drop shadow. */
export const card = 'rounded-2xl border border-ink-900/10 bg-white'

/** Header band for the inner pages (Team, Gallery, News). */
export function PageHero({ chip, title, lead }: { chip: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <section className="border-b border-ink-900/10 bg-cream-100 pt-32 pb-12 sm:pt-40 sm:pb-16">
      <div className={container}>
        <Chip>{chip}</Chip>
        <h1 className="mt-5 max-w-3xl font-serif text-[2.5rem] font-medium leading-[1.08] tracking-[-0.02em] text-ink-900 text-balance sm:text-6xl sm:leading-[1.05]">{title}</h1>
        {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700/80 text-pretty">{lead}</p>}
      </div>
    </section>
  )
}
