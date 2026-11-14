// Where links from emails (confirm your address, confirm a new address) and Google bring the browser back to. By the time this renders,
// the session in the link has been picked up. What happens next:
//  - a staff profile exists          -> Projects (or the Account page after a confirmed email change, once the profile email follows)
//  - no staff profile, details known -> create it from the details typed at sign-up (or Google's name) and go to Projects
//  - no staff profile, details short -> the "finish your profile" form
//  - no session / an error in the link -> explain, with a way to get a new link
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, urlError } from '../lib/supabase.js'
import { registerStaff, syncMyEmail } from '../lib/api.js'
import { profileFromUser } from '../lib/authFlow.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { Splash } from '../components/Skeleton.jsx'

const WAIT_MS = 2500

function Problem({ message }) {
  return (
    <AuthLayout
      title="This link did not work"
      headLink={{ to: '/login', label: 'Sign in' }}
      footer={<p className="auth-foot"><Link to="/login">Sign in</Link> or <Link to="/register">create an account</Link></p>}
    >
      <p>{message}</p>
      <p className="muted mt">
        Confirmation links expire after a while and only work once. If you have not confirmed your email yet, sign in with it: you will be
        offered a new link. If you already confirmed it, just sign in.
      </p>
    </AuthLayout>
  )
}

export default function AuthCallback() {
  const { status, profileMissing, profile, refresh } = useAuth()
  const navigate = useNavigate()
  const problem = urlError
  const [waited, setWaited] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), WAIT_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (problem || ran.current) return
    if (status === 'authed') {
      ran.current = true
      ;(async () => {
        const { data } = await supabase.auth.getSession()
        const sessionEmail = data.session?.user?.email
        if (sessionEmail && profile?.email && sessionEmail.toLowerCase() !== profile.email.toLowerCase()) {
          // they just confirmed a new address in this browser: the profile email follows
          try {
            await syncMyEmail()
            await refresh()
            navigate('/app/account', { replace: true, state: { emailUpdated: true } })
            return
          } catch (err) {
            console.error('Could not update the profile email:', err)
          }
        }
        navigate('/app/projects', { replace: true })
      })()
    } else if (status === 'error' && profileMissing) {
      ran.current = true
      ;(async () => {
        try {
          const { data } = await supabase.auth.getSession()
          const user = data.session?.user
          const details = profileFromUser(user)
          if (user && details.firstName && details.lastName && details.phoneNumber) {
            await registerStaff({ authUserId: user.id, ...details, email: user.email }, data.session.access_token)
            await refresh()
            navigate('/app/projects', { replace: true })
          } else {
            navigate('/register', { replace: true }) // shows the finish-your-profile form
          }
        } catch (err) {
          console.error('Could not create the profile from the sign-up details:', err)
          navigate('/register', { replace: true })
        }
      })()
    }
  }, [status, profileMissing, profile, problem, navigate, refresh])

  if (problem) return <Problem message={problem} />
  if (status === 'anon' && waited) return <Problem message="We could not sign you in from this link." />
  return <Splash />
}
