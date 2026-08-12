import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { categories, remoteCategories } from '../data'

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
  Icon,
  delay,
}: {
  image: string
  title: string
  description: string
  Icon: LucideIcon
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.45, delay }}
      className="overflow-hidden rounded-xl bg-cream-50 shadow-sm ring-1 ring-ink-900/5 sm:rounded-2xl"
    >
      <div className="img-zoom relative overflow-hidden">
        <img
          src={image}
          alt=""
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-ink-950/40 backdrop-blur-sm sm:h-9 sm:w-9">
          <Icon size={14} className="text-cream-50 sm:hidden" aria-hidden="true" />
          <Icon size={18} className="hidden text-cream-50 sm:block" aria-hidden="true" />
        </div>
      </div>
      <div className="p-2.5 sm:p-4">
        <h3 className="font-serif text-[13px] font-semibold leading-tight text-ink-900 sm:text-lg">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-snug text-ink-700 text-pretty sm:mt-1.5 sm:text-sm sm:leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  )
}

export default function WorkerCategories() {
  const { ref, visible } = useReveal()
  const [featured, ...rest] = categories

  return (
    <section id="workers" ref={ref} className="relative py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500 sm:mb-4">
            What our workers do
          </span>
          <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            Vetted across{' '}
            <span className="italic gradient-text">every category</span>
          </h2>
          <p className="mt-3 text-base text-ink-700 text-pretty sm:mt-4 sm:text-lg">
            Workers are vetted and matched to employer needs throughout
            Greater Accra &mdash; on site or remote.
          </p>
        </div>

        {/* On the field — one featured tile up top, then a compact grid.
            Seven items never divide evenly into a grid, so rather than leave
            one tile stranded on its own row, the odd one out becomes the
            lead. Its text sits below the photo too, for the same reason as
            the grid tiles: never clipped, however large the text gets. */}
        <div className="mt-10 sm:mt-16">
          <SectionLabel>On the field</SectionLabel>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-xl bg-cream-50 shadow-sm ring-1 ring-ink-900/5 sm:rounded-2xl"
          >
            <div className="img-zoom relative overflow-hidden">
              <img
                src={featured.image}
                alt=""
                className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
                loading="eager"
                decoding="async"
              />
              <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950/40 backdrop-blur-sm sm:h-11 sm:w-11">
                <featured.icon size={18} className="text-cream-50 sm:hidden" aria-hidden="true" />
                <featured.icon size={22} className="hidden text-cream-50 sm:block" aria-hidden="true" />
              </div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <h3 className="font-serif text-lg font-semibold text-ink-900 sm:text-2xl lg:text-3xl">
                {featured.title}
              </h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-700 text-pretty sm:mt-2 sm:text-base">
                {featured.description}
              </p>
            </div>
          </motion.div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-3">
            {rest.map((cat, i) => (
              <CategoryTile
                key={cat.title}
                image={cat.image}
                title={cat.title}
                description={cat.description}
                Icon={cat.icon}
                delay={(i % 3) * 0.06}
              />
            ))}
          </div>
        </div>

        {/* Remote — same card system as the field grid, real photos rather
            than a solid colour stand-in. Six items split evenly into two
            rows regardless of column count, so there's no orphan tile here
            either. */}
        <div className="mt-10 sm:mt-20">
          <SectionLabel>Remote</SectionLabel>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {remoteCategories.map((cat, i) => (
              <CategoryTile
                key={cat.title}
                image={REMOTE_IMAGES[cat.title] || cat.image}
                title={cat.title}
                description={cat.description}
                Icon={cat.icon}
                delay={(i % 3) * 0.06}
              />
            ))}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink-700/80 sm:mt-6 sm:text-sm">
            These are the categories we support today. As BeyondX grows, more
            will be added based on demand from workers and employers.
          </p>
        </div>
      </div>
    </section>
  )
}
