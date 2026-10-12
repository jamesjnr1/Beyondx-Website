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

export default function Home() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <Stats />
      <About />
      <HowItWorks />
      <WorkerCategories />
      <Pillars />
      <TrustChain />
      <Transparency />
      <Sponsors />
      <Testimonial />
      <CTA />
    </>
  )
}
