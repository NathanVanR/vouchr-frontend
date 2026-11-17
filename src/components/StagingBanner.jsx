import { useEffect } from 'react'
import { isStaging } from '../config.js'

/** Staging builds only: a visible tag so nobody mistakes it for the real site, and a request to search engines to skip it. */
export default function StagingBanner() {
  useEffect(() => {
    if (!isStaging) return
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = `[STAGING] ${document.title}`
    return () => meta.remove()
  }, [])

  if (!isStaging) return null
  return (
    <div
      style={{
        position: 'fixed', bottom: 8, left: 8, zIndex: 9999, background: '#b45309', color: '#fff',
        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, pointerEvents: 'none',
      }}
    >
      STAGING · test data only
    </div>
  )
}
