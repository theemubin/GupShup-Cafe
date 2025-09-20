import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/speed-insights/web'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Inject Vercel Speed Insights for performance monitoring
inject()

// Force new deployment - socket context fixes applied
/* Build timestamp: Thu Sep 18 20:00:33 IST 2025 */
