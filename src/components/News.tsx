import { useMemo } from 'react'
import { Newspaper } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'

// On-brand confetti palette — BeyondX greens plus one warm gold accent for
// the "celebration" note, deliberately avoiding a generic rainbow burst.
const CONFETTI_COLORS = ['#6bab21', '#8bc53f', '#a6d96a', '#12180e', '#e0b23f']

type ConfettiPiece = {
  id: number
  x: number        // horizontal spread, in %
  delay: number
  duration: number
  rotate: number
  color: string
  shape: 'circle' | 'rect'
}

function useConfetti(count = 28): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.8 + Math.random() * 1.2,
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      })),
    [count],
  )
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useConfetti()
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.shape === 'circle' ? 8 : 10,
            height: p.shape === 'circle' ? 8 : 5,
            borderRadius: p.shape === 'circle' ? '9999px' : '2px',
            background: p.color,
          }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={
            active
              ? { y: [0, 260 + Math.random() * 80], opacity: [0, 1, 1, 0], rotate: p.rotate }
              : {}
          }
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

type NewsItem = {
  date: string
  title: string
  body: string[]
  featured?: boolean
}

const newsItems: NewsItem[] = [
  {
    date: 'August 2026',
    title: "BeyondX is officially live.",
    body: [
      'After months of building alongside workers, employers, and our community in Accra, BeyondX is officially launched.',
      'Every worker on our platform is verified — skills checked, identity confirmed, background reviewed — so employers can hire with confidence, and workers can find dignified, fairly paid work.',
      "From facility cleaning to skilled trades, event support to logistics, we're connecting Greater Accra's workforce with the people who need them — safely, fairly, and transparently.",
      'Thank you to everyone who believed in this from the start. This is just the beginning.',
    ],
    featured: true,
  },
]

function LaunchCard({ item, visible }: { item: NewsItem; visible: boolean }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl border border-forest-600/15 bg-white p-8 text-left shadow-[0_20px_60px_-15px_rgba(107,171,33,0.25)] sm:p-10"
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <Confetti active={visible} />

      {/* Badge */}
      <motion.div
        className="relative z-10 inline-flex items-center gap-2 rounded-full bg-forest-600/10 px-4 py-1.5"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={visible ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.5, type: 'spring', stiffness: 200 }}
      >
        <motion.span
          className="h-2 w-2 rounded-full bg-forest-600"
          animate={visible ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
          transition={{ delay: 1, duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-xs font-semibold uppercase tracking-widest text-forest-700">
          We're live · {item.date}
        </span>
      </motion.div>

      {/* Title */}
      <motion.h3
        className="relative z-10 mt-5 font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl"
        initial={{ opacity: 0, y: 12 }}
        animate={visible ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        {item.title}
      </motion.h3>

      {/* Body */}
      <div className="relative z-10 mt-5 space-y-4">
        {item.body.map((para, i) => (
          <motion.p
            key={i}
            className="max-w-xl text-base leading-relaxed text-ink-700 text-pretty"
            initial={{ opacity: 0, y: 10 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
          >
            {para}
          </motion.p>
        ))}
      </div>

      <motion.p
        className="relative z-10 mt-6 font-serif text-sm italic text-forest-700"
        initial={{ opacity: 0 }}
        animate={visible ? { opacity: 1 } : {}}
        transition={{ delay: 0.75, duration: 0.5 }}
      >
        — The BeyondX Team
      </motion.p>
    </motion.div>
  )
}

export default function News() {
  const { ref, visible } = useReveal()
  const hasNews = newsItems.length > 0

  return (
    <section id="news" ref={ref} className="relative bg-cream-100 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            News &amp; Events
          </span>
          {!hasNews && (
            <div className="mx-auto mb-6">
              <Newspaper size={36} className="text-forest-600" aria-hidden="true" />
            </div>
          )}
        </motion.div>

        {hasNews ? (
          <div className="mt-8 space-y-6">
            {newsItems.map((item, i) =>
              item.featured ? (
                <LaunchCard key={i} item={item} visible={visible} />
              ) : (
                <motion.div
                  key={i}
                  className="rounded-2xl border border-ink-900/8 bg-white p-6 text-left"
                  initial={{ opacity: 0, y: 16 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-clay-500">{item.date}</p>
                  <h3 className="mt-2 font-serif text-xl font-medium text-ink-900">{item.title}</h3>
                  {item.body.map((para, j) => (
                    <p key={j} className="mt-2 text-sm leading-relaxed text-ink-700">{para}</p>
                  ))}
                </motion.div>
              ),
            )}
          </div>
        ) : (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl">
              No live news{' '}
              <span className="italic gradient-text">yet</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700 text-pretty">
              We don't have any live news or events to share just yet. As BeyondX grows,
              partnerships, milestones, and upcoming events will appear here.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
