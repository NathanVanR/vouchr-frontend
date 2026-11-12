import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import { Splash } from '../components/Skeleton.jsx'

/** Shows its children only to a signed-in staff member (or in demo mode). */
export default function RequireAuth({ children }) {
  const { status, profileMissing, error, logout } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (status === 'error') {
    // signed in with Supabase, but no staff profile yet: finish registering
    if (profileMissing) return <Navigate to="/register" replace />
    return (
      <div className="auth-page">
        <div className="auth-card center">
          <h1>Could not load your account</h1>
          <p className="muted mt">{error?.message || 'Something went wrong. Check your connection and try again.'}</p>
          <div className="row mt" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Try again
            </button>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    )
  }
  return children
}
