import Gallery from '../components/Gallery'
import { Accent, PageHero } from '../components/site/ui'

export default function GalleryPage() {
  return (
    <>
      <PageHero chip="Gallery" title={<>BeyondX <Accent>in pictures</Accent></>} lead="Xperts on the job, events, and moments from the programme." />
      <Gallery />
    </>
  )
}
