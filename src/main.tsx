import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { trackVisit } from './lib/track'

// Self-hosted visitor tracking — deliberately not Vercel Analytics. See
// src/lib/track.ts. Fires once per page load; the admin console reads the
// aggregated result back from our own backend.
trackVisit()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })
}

// Capture the browser's install prompt as early as possible — it can fire
// before InstallPrompt.tsx has mounted, and only fires once.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as typeof window & { __bxInstallPrompt?: Event }).__bxInstallPrompt = e
  window.dispatchEvent(new Event('bx-install-prompt-ready'))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
