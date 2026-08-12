import { AuthProvider, useAuth } from './components/auth/AuthContext'
import { AccessibilityProvider } from './components/a11y/AccessibilityContext'
import AccessibilityMenu from './components/a11y/AccessibilityMenu'
import AuthModals from './components/auth/AuthModals'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import TeamPage from './pages/TeamPage'
import GalleryPage from './pages/GalleryPage'
import NewsPage from './pages/NewsPage'
import WorkerDashboard from './pages/WorkerDashboard'
import EmployerDashboard from './pages/EmployerDashboard'

function Shell() {
  const { page } = useAuth()

  if (page === 'worker-dashboard') return <><WorkerDashboard /><AccessibilityMenu /></>
  if (page === 'employer-dashboard') return <><EmployerDashboard /><AccessibilityMenu /></>

  return (
    <div className="relative min-h-screen bg-cream-50 text-ink-900">
      <a href="#main" className="sr-only rounded-full bg-forest-600 px-4 py-2 text-sm font-semibold text-cream-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        {page === 'home' && <Home />}
        {page === 'team' && <TeamPage />}
        {page === 'gallery' && <GalleryPage />}
        {page === 'news' && <NewsPage />}
      </main>
      <Footer />
      <AuthModals />
      <AccessibilityMenu />
    </div>
  )
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </AccessibilityProvider>
  )
}
