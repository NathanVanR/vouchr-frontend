// A new version of the app is downloaded in the background; the open page keeps running the old one until it is reloaded, which is what
// caused stale screens after a deploy. This asks the person to reload (never reloads on its own, so nothing half-typed is lost).
import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>A new version of Vouchr is ready.</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>Reload</button>
    </div>
  )
}
