import Hero from '../components/Hero'
import ProblemSection from '../components/ProblemSection'
import Stats from '../components/Stats'
import About from '../components/About'
import HowItWorks from '../components/HowItWorks'
import WorkerCategories from '../components/WorkerCategories'
import Pillars from '../components/Pillars'
import TrustChain from '../components/TrustChain'
import Transparency from '../components/Transparency'
import Testimonial from '../components/Testimonial'
import Sponsors from '../components/Sponsors'
import CTA from '../components/CTA'

/** Home: the promise, the problem, how it works, what we cover, why to trust it, then the next step. */
export default function Home() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <WorkerCategories />
      <Stats />
      <About />
      <Pillars />
      <TrustChain />
      <Transparency />
      <Testimonial />
      <Sponsors />
      <CTA />
    </>
  )
}
