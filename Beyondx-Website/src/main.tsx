import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import App from './App'
import './index.css'

// Vercel Web Analytics — records visitors and page views for beyondxco.com.
// Only runs on the deployed site; it is a no-op in local development.
inject()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
