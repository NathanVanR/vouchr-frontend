// Shown when a screen cannot load or crashes. Most often it is an old open page asking for files from a previous deploy: that reloads
// itself once; anything else gets a plain message and a Reload button instead of React Router's developer error page.
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { isStaleChunkError, reloadForNewVersion, reloadedRecently } from '../lib/staleVersion.js'
import { Splash } from './Skeleton.jsx'

export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleChunkError(error)
  const willReload = stale && !reloadedRecently()

  useEffect(() => {
    if (willReload) reloadForNewVersion()
  }, [willReload])

  if (willReload) return <Splash />
  return (
    <div className="auth-page">
      <main className="auth-card">
        <h1>Something went wrong</h1>
        <p className="muted">
          {stale
            ? 'Vouchr has been updated and this page could not load the new version.'
            : 'This screen hit a problem. Reloading usually fixes it.'}
        </p>
        <button type="button" className="btn mt" onClick={() => window.location.reload()}>Reload</button>
      </main>
    </div>
  )
}
