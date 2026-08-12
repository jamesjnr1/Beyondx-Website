import { Instagram } from 'lucide-react'

export default function SocialGrid() {
  return (
    <section className="relative overflow-hidden bg-cream-100 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500">
            Follow us
          </span>
          <h2 className="font-serif text-3xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
            On the ground,{' '}
            <span className="italic gradient-text">on Instagram</span>
          </h2>
          <p className="mt-4 text-lg text-ink-700 text-pretty">
            Real workers, real job sites, real second chances. Follow our daily work across Greater Accra.
          </p>
          <a
            href="https://instagram.com/beyondx26"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-600 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-all hover:bg-forest-500 active:scale-[0.98]"
          >
            <Instagram size={16} />
            @beyondx26
          </a>
        </div>
      </div>
    </section>
  )
}
