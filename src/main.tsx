import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { trackVisit } from './lib/track'

// Self-hosted visitor tracking — deliberately not Vercel Analytics. See
// src/lib/track.ts. Fires once per page load; the admin console reads the
// aggregated result back from our own backend.
trackVisit()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
