import { useState } from 'react'
import { addStaff } from '../../lib/api.js'
import { useAuth } from '../../auth/useAuth.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import PageHero from '../../components/PageHero.jsx'
import Field from '../../components/Field.jsx'

/** Attach an existing staff account to the active organisation (admins only). */
export default function Team() {
  const { activeOrgId, activeOrg, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('STAFF')

  const add = useApiMutation(
    () => addStaff({ email: email.trim(), role, organizationId: activeOrgId, organizationName: activeOrg?.name }),
    { success: 'Staff member added.', onSuccess: () => setEmail('') },
  )

  return (
    <>
      <PageHero back={{ to: '/app/projects', label: 'Back to the app' }} eyebrow={activeOrg?.name || 'Organisation administration'} title="Team management" />
      <div className="page-body">
        {!isAdmin ? (
          <p className="message">Only organisation admins can manage the team.</p>
        ) : (
          <section className="card">
            <h2>Add a staff member</h2>
            <p className="muted">Enter the email address of a registered staff account to attach them to {activeOrg?.name || 'your organisation'}.</p>
            <form className="mt" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
              <div className="field-row">
                <Field label="Staff work email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@organisation.org" required />
                </Field>
                <Field label="Role">
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>
              </div>
              <button type="submit" className="btn" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add member'}</button>
            </form>
          </section>
        )}
      </div>
    </>
  )
}
