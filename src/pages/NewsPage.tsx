import News from '../components/News'
import { Accent, PageHero } from '../components/site/ui'

export default function NewsPage() {
  return (
    <>
      <PageHero chip="News & Events" title={<>What's new at <Accent>BeyondX</Accent></>} lead="Launches, partnerships, milestones and upcoming events." />
      <News />
    </>
  )
}
