import Team from '../components/Team'
import { Accent, PageHero } from '../components/site/ui'

export default function TeamPage() {
  return (
    <>
      <PageHero chip="The team" title={<>Meet the <Accent>team</Accent></>}
        lead="BeyondX is built by a lean founding team out of Ashesi University, connecting employers across Greater Accra with skilled, verified Xperts through a fast, mobile-first platform." />
      <Team />
    </>
  )
}
