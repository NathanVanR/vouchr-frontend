// Your sign-in details. Changing the email sends a confirmation to the NEW address (and, with secure email change on, to the old one
// too); nothing changes until it is confirmed. The staff profile's email then follows through the callback page or a one-click banner.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { callbackUrl, hasPasswordLogin, resendEmailChange } from '../../lib/authFlow.js'
import { useAuth } from '../../auth/useAuth.js'
import { useToast } from '../../toast/useToast.js'
import PageHero from '../../components/PageHero.jsx'
import Field from '../../components/Field.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

export default function Account() {
  const { demo, profile, activeOrg, isPlatformAdmin } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [newEmail, setNewEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const account = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    enabled: !demo,
    gcTime: 0,
  })
  const user = account.data
  const pending = user?.new_email || ''
  const passwordLogin = hasPasswordLogin(user)

  async function change(e) {
    e.preventDefault()
    const email = newEmail.trim()
    setError('')
    if (!email) return
    if (email.toLowerCase() === (user?.email || '').toLowerCase()) return setError('That is already your email address.')
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email }, { emailRedirectTo: callbackUrl() })
      if (updateError) throw updateError
      setNewEmail('')
      await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      toast(`We sent a confirmation link to ${email}.`)
    } catch (err) {
      setError(err.message || 'Could not start the email change.')
    } finally {
      setBusy(false)
    }
    return undefined
  }

  async function resend() {
    try {
      await resendEmailChange(pending)
      toast('We sent the confirmation link again.')
    } catch (err) {
      toast(err.message || 'Could not send the email', 'error')
    }
  }

  return (
    <>
      <PageHero eyebrow={activeOrg?.name} title="Account" subtitle="How you sign in" />
      <div className="page-body">
        {location.state?.emailUpdated && <p className="message" role="status">Your email address has been updated.</p>}

        <section className="card">
          <h2>Sign-in email</h2>
          {demo && <p className="muted">Accounts are not available in the demo.</p>}
          {!demo && account.isPending && <Skeleton height={80} />}
          {!demo && user && (
            <>
              <div className="kv"><span>Email</span><span>{user.email}</span></div>
              <div className="kv"><span>Signs in with</span><span>{passwordLogin ? 'Email and password' : 'Google'}</span></div>
              {profile?.email && profile.email.toLowerCase() !== (user.email || '').toLowerCase() && (
                <p className="muted small">Your staff profile still shows {profile.email}. Use the banner at the top to update it.</p>
              )}
            </>
          )}
        </section>

        {!demo && user && !passwordLogin && (
          <section className="card">
            <h2>Change email</h2>
            <p className="muted">You sign in with Google, so your email comes from your Google account. Change it there.</p>
          </section>
        )}

        {!demo && user && passwordLogin && (
          <section className="card">
            <h2>Change email</h2>
            {pending ? (
              <>
                <p>
                  Waiting for you to confirm <strong>{pending}</strong>. Open the link we sent to that address
                  {' '}(and to {user.email}, as a safety check). Your email only changes once that is done.
                </p>
                <div className="row mt">
                  <button type="button" className="btn btn-ghost" onClick={resend}>Send the link again</button>
                </div>
              </>
            ) : (
              <form onSubmit={change}>
                <p className="muted">
                  We will send a confirmation link to the new address, and also to {user.email}. Nothing changes until you confirm it.
                </p>
                <Field label="New email address">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required />
                </Field>
                {isPlatformAdmin && (
                  <p className="message">
                    You are a platform admin. That access follows your email address, so the new address must also be in
                    VOUCHR_PLATFORM_ADMIN_EMAILS or you will lose it.
                  </p>
                )}
                {error && <p className="message error" role="alert">{error}</p>}
                <button type="submit" className="btn mt" disabled={busy}>{busy ? 'Sending…' : 'Send confirmation'}</button>
              </form>
            )}
          </section>
        )}
      </div>
    </>
  )
}
