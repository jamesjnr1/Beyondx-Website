import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'
import { categories, remoteCategories } from '../data'
import { REMOTE_JOBS_ENABLED } from '../lib/config'
import { session } from '../lib/api'
import { setRequestCategory } from '../lib/requestIntent'
import { useAuth } from './auth/AuthContext'
import { ArrowRight } from 'lucide-react'
import { Accent, SectionHead, container, sectionY } from './site/ui'

/** Every category leads into the request flow with that category chosen —
 *  never to a list of Xperts. */
function useRequestCategory() {
  const { open, go } = useAuth()
  return (category: string) => {
    setRequestCategory(category)
    if (session.employerToken()) go('employer-dashboard')
    else open('employer-login')
  }
}

function RequestLink() {
  return (
    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-800 sm:text-sm">
      Request an Xpert <ArrowRight size={13} aria-hidden="true" />
    </span>
  )
}

const REMOTE_IMAGES: Record<string, string> = {
  'Data Entry & Digitisation': '/categories/remote/data-entry.jpg',
  'Customer Support': '/categories/remote/customer-support.jpg',
  'Social Media & Content': '/categories/remote/social-media.jpg',
  'Transcription & Translation': '/categories/remote/transcription.jpg',
  'Online Research & Listings': '/categories/remote/research.jpg',
  'Virtual Assistance': '/categories/remote/virtual-assistance.jpg',
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-clay-500">
      <span className="h-px w-6 bg-clay-400/60" aria-hidden="true" />
      {children}
    </span>
  )
}

/** Photo on top, title and description below in normal document flow — never
 *  overlaid on the image. Text laid over a fixed-height photo has to be
 *  clipped by `overflow-hidden` the moment it needs more room than the photo
 *  allows, which is exactly what happens when the accessibility text-size
 *  setting is turned up. Putting the text in its own block below means the
 *  card simply grows taller instead — safe at any text size, and nothing is
 *  ever hidden to save space. */
function CategoryTile({
  image,
  title,
  description,
  delay,
  onRequest,
}: {
  image: string
  title: string
  description: string
  delay: number
  onRequest: (category: string) => void
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onRequest(title)}
      aria-label={`Request an Xpert for ${title}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.45, delay }}
      className="group overflow-hidden rounded-2xl border border-ink-900/10 bg-white text-left transition-colors hover:border-forest-600/50"
    >
      <div className="img-zoom relative overflow-hidden">
        <img
          src={image}
          alt=""
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-3.5 sm:p-5">
        <h3 className="font-serif text-base font-medium leading-tight text-ink-900 sm:text-xl">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-snug text-ink-700 text-pretty sm:mt-1.5 sm:text-sm sm:leading-relaxed">
          {description}
        </p>
        <RequestLink />
      </div>
    </motion.button>
  )
}

export default function WorkerCategories() {
  const { ref, visible } = useReveal()
  const request = useRequestCategory()
  const [featured, ...rest] = categories

  return (
    <section id="services" ref={ref} className={`bg-white ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="What our Xperts do"
          title={<>Vetted across <Accent>every category</Accent></>}
          lead={<>Choose a category and tell us what you need. BeyondX selects and manages the right Xpert throughout Greater Accra{REMOTE_JOBS_ENABLED ? ' — on site or remote.' : '.'}</>}
        />

        {/* On the field — one featured tile up top, then a compact grid.
            Seven items never divide evenly into a grid, so rather than leave
            one tile stranded on its own row, the odd one out becomes the
            lead. Its text sits below the photo too, for the same reason as
            the grid tiles: never clipped, however large the text gets. */}
        <div className="mt-10 sm:mt-16">
          {REMOTE_JOBS_ENABLED && <SectionLabel>On the field</SectionLabel>}

          <motion.button
            type="button"
            onClick={() => request(featured.title)}
            aria-label={`Request an Xpert for ${featured.title}`}
            initial={{ opacity: 0, y: 20 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="group block w-full overflow-hidden rounded-2xl border border-ink-900/10 bg-white text-left transition-colors hover:border-forest-600/50 sm:grid sm:grid-cols-2 sm:items-stretch"
          >
            <div className="img-zoom relative overflow-hidden">
              <img
                src={featured.image}
                alt=""
                className="aspect-[16/10] h-full w-full object-cover sm:aspect-auto sm:min-h-[280px]"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <h3 className="font-serif text-2xl font-medium text-ink-900 lg:text-3xl">
                {featured.title}
              </h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-700 text-pretty sm:mt-2 sm:text-base">
                {featured.description}
              </p>
              <RequestLink />
            </div>
          </motion.button>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-3">
            {rest.map((cat, i) => (
              <CategoryTile
                key={cat.title}
                image={cat.image}
                title={cat.title}
                description={cat.description}
                delay={(i % 3) * 0.06}
                onRequest={request}
              />
            ))}
          </div>
        </div>

        {/* Remote — same card system as the field grid, real photos rather
            than a solid colour stand-in. Six items split evenly into two
            rows regardless of column count, so there's no orphan tile here
            either. Hidden while REMOTE_JOBS_ENABLED is off — see lib/config.ts. */}
        {REMOTE_JOBS_ENABLED && (
          <div className="mt-10 sm:mt-20">
            <SectionLabel>Remote</SectionLabel>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {remoteCategories.map((cat, i) => (
                <CategoryTile
                  key={cat.title}
                  image={REMOTE_IMAGES[cat.title] || cat.image}
                  title={cat.title}
                  description={cat.description}
                  delay={(i % 3) * 0.06}
                  onRequest={request}
                />
              ))}
            </div>

            <p className="mt-5 text-center text-xs leading-relaxed text-ink-700/80 sm:mt-6 sm:text-sm">
              These are the categories we support today. As BeyondX grows, more
              will be added based on demand from Xperts and employers.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
