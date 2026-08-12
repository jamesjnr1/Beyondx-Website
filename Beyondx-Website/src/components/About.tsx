import { motion } from 'framer-motion'
import { useReveal } from '../hooks/useReveal'

const blocks = [
  {
    eyebrow: 'About BeyondX',
    title: 'Work that restores dignity. Hire that builds trust.',
    body: 'BeyondX is a verified labour marketplace. It places vetted, skill-matched workers into short-term roles with responsible employers across Greater Accra, and tracks impact for workers rebuilding after setbacks as part of that mission.',
    image: '/about.jpg',
    alt: 'Certified workers in safety harnesses on a construction site in Greater Accra',
  },
  {
    eyebrow: 'How we work',
    title: 'Every worker vetted. Every shift GPS-verified.',
    body: 'Every worker is vetted through our guarantor verification process and carries a digital work record tracked in real time. Every employer receives GPS-verified attendance logs and responsive support if anything comes up.',
    image: 'https://images.pexels.com/photos/8961342/pexels-photo-8961342.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Workers collaborating on site',
    reverse: true,
  },
]

export default function About() {
  const { ref, visible } = useReveal()

  return (
    <section id="about" ref={ref} className="relative overflow-hidden py-14 sm:py-32">
      <div className="mx-auto max-w-7xl space-y-12 px-5 sm:px-8 sm:space-y-32">
        {blocks.map((block, i) => (
          <div
            key={i}
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
              block.reverse ? 'lg:[&>div:first-child]:order-2' : ''
            }`}
          >
            <motion.div
              initial={{ opacity: 0, x: block.reverse ? 30 : -30 }}
              animate={visible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <span className="mb-2 inline-block text-sm font-semibold uppercase tracking-widest text-clay-500 sm:mb-4">
                {block.eyebrow}
              </span>
              <h2 className="font-serif text-2xl font-medium leading-tight text-ink-900 text-balance sm:text-4xl lg:text-5xl">
                {block.title.split(' ').map((word, wi) => (
                  <span key={wi}>
                    {wi === Math.floor(block.title.split(' ').length / 2) ? (
                      <span className="italic gradient-text">{word} </span>
                    ) : (
                      <>{word} </>
                    )}
                  </span>
                ))}
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink-700 text-pretty sm:mt-6 sm:text-lg">
                {block.body}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: block.reverse ? -30 : 30 }}
              animate={visible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.1 + 0.15 }}
              className="img-zoom relative overflow-hidden rounded-2xl"
            >
              <img
                src={block.image}
                alt={block.alt}
                className="aspect-[16/10] w-full object-cover sm:aspect-[4/3]"
                loading="lazy"
              />
            </motion.div>
          </div>
        ))}

      </div>
    </section>
  )
}
