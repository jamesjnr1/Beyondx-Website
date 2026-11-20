import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import WorkerCategories from '../components/WorkerCategories'
import TrustSafety from '../components/TrustSafety'
import ForXperts from '../components/ForXperts'
import Testimonial from '../components/Testimonial'
import CTA from '../components/CTA'

/** Home: hero, how it works, categories, trust & safety, for Xperts, the CEO's message, then hire. */
export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WorkerCategories />
      <TrustSafety />
      <ForXperts />
      <Testimonial />
      <CTA />
    </>
  )
}
