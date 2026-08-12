import Hero from '../components/Hero'
import Stats from '../components/Stats'
import About from '../components/About'
import HowItWorks from '../components/HowItWorks'
import WorkerCategories from '../components/WorkerCategories'
import Pillars from '../components/Pillars'
import Transparency from '../components/Transparency'
import Testimonial from '../components/Testimonial'
import Sponsors from '../components/Sponsors'
import CTA from '../components/CTA'

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <About />
      <HowItWorks />
      <WorkerCategories />
      <Pillars />
      <Transparency />
      <Sponsors />
      <Testimonial />
      <CTA />
    </>
  )
}
