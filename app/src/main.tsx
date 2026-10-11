import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { resumeIfNeeded } from './lib/audio'
import './index.css'
import App from './App'

// Installed PWAs stay alive in the background for days, so a normal "page load" update check never happens.
// Check for a new version every time the app returns to the foreground (and hourly); autoUpdate then reloads onto it.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { check(); resumeIfNeeded() } })
    setInterval(check, 60 * 60 * 1000)
  },
})
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
