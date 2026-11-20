import { ArrowRight } from 'lucide-react'
import { categories, remoteCategories, type Category } from '../data'
import { REMOTE_JOBS_ENABLED } from '../lib/config'
import { session } from '../lib/api'
import { setRequestCategory } from '../lib/requestIntent'
import { useAuth } from './auth/AuthContext'
import { Reveal, SectionHead, container, sectionY } from './site/ui'

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

const REMOTE_IMAGES: Record<string, string> = {
  'Data Entry & Digitisation': '/categories/remote/data-entry.jpg',
  'Customer Support': '/categories/remote/customer-support.jpg',
  'Social Media & Content': '/categories/remote/social-media.jpg',
  'Transcription & Translation': '/categories/remote/transcription.jpg',
  'Online Research & Listings': '/categories/remote/research.jpg',
  'Virtual Assistance': '/categories/remote/virtual-assistance.jpg',
}

/** Photo on top, text below in normal flow, so the card grows rather than
 *  clipping when the accessibility text size is turned up. */
function CategoryCard({ cat, image, delay, onRequest }: {
  cat: Category; image: string; delay: number; onRequest: (c: string) => void
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <button
        type="button"
        onClick={() => onRequest(cat.title)}
        aria-label={`Request an Xpert for ${cat.title}`}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ink-900/10 bg-white text-left transition-all hover:-translate-y-1 hover:border-forest-600/40 hover:shadow-lg"
      >
        <div className="relative overflow-hidden">
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-6">
          <h3 className="font-display text-lg font-semibold text-ink-900">{cat.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700/80">{cat.description}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
            Request an Xpert
            <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </button>
    </Reveal>
  )
}

export default function WorkerCategories() {
  const request = useRequestCategory()

  return (
    <section id="services" className={`bg-cream-50 ${sectionY}`}>
      <div className={container}>
        <SectionHead
          chip="Service categories"
          title={`Vetted Xperts across ${categories.length} categories`}
          lead={<>Every Xpert is checked before they are approved, and matched to the work you actually need done throughout Greater Accra{REMOTE_JOBS_ENABLED ? ', on site or remote.' : '.'}</>}
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.title} cat={cat} image={cat.image} delay={(i % 3) * 0.05} onRequest={request} />
          ))}

          <Reveal className="sm:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={() => request('')}
              className="flex h-full w-full flex-col justify-between rounded-2xl bg-ink-900 p-7 text-left text-cream-50 transition-all hover:-translate-y-1 hover:shadow-lg sm:p-9"
            >
              <div>
                <p className="font-display text-xl font-semibold sm:text-2xl">Need a category not listed?</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-100/70 sm:text-base">
                  Tell us what you need. Our coordinators source and vet Xperts for new categories on request.
                </p>
              </div>
              <span className="mt-8 inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-500 px-5 py-2.5 text-sm font-semibold text-ink-900">
                Ask us <ArrowRight size={15} aria-hidden="true" />
              </span>
            </button>
          </Reveal>
        </div>

        {REMOTE_JOBS_ENABLED && (
          <div className="mt-16">
            <h3 className="font-display text-2xl font-semibold text-ink-900">Remote work</h3>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {remoteCategories.map((cat, i) => (
                <CategoryCard key={cat.title} cat={cat} image={REMOTE_IMAGES[cat.title] || cat.image} delay={(i % 3) * 0.05} onRequest={request} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
