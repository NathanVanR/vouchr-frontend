import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOperatorHistory, getPlatformMe, saveOperatorDetails } from '../../lib/api.js'
import { formatDateTime } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import PageHero from '../../components/PageHero.jsx'
import Field from '../../components/Field.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'

const FIELDS = [
  ['legalName', 'Legal name', 255, true],
  ['registrationNumber', 'Registration number (if applicable)', 100, false],
  ['physicalAddress', 'Physical address', 500, true],
  ['contactDetails', 'Contact details', 500, true],
  ['informationOfficer', 'Information Officer / privacy contact', 500, true],
]

function OperatorForm({ current, hasCurrent }) {
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map(([key]) => [key, current?.[key] || ''])))
  const [reason, setReason] = useState('')
  const save = useApiMutation(
    () => {
      const payload = { changeReason: reason.trim() || null }
      for (const [key] of FIELDS) payload[key] = values[key].trim() || null
      return saveOperatorDetails(payload)
    },
    { invalidate: [['platform', 'history']], success: 'Saved. A new version was added to the history.', onSuccess: () => setReason('') },
  )

  return (
    <form className="mt" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      {FIELDS.map(([key, label, max, required]) => (
        <Field key={key} label={label}>
          <input value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} maxLength={max} required={required} />
        </Field>
      ))}
      {hasCurrent && (
        <Field label="Reason for this change">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. New Information Officer appointed" required />
        </Field>
      )}
      <button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
    </form>
  )
}

/** Vouchr operator details shown in the consent form (platform admins only). */
export default function Platform() {
  const me = useQuery({ queryKey: ['platform', 'me-page'], queryFn: getPlatformMe, retry: false })
  const isAdmin = !!me.data?.platformAdmin
  const history = useQuery({ queryKey: ['platform', 'history'], queryFn: getOperatorHistory, enabled: isAdmin, gcTime: 0 })
  const rows = history.data ?? []

  return (
    <>
      <PageHero back={{ to: '/app/projects', label: 'Back to the app' }} eyebrow="Platform settings" title="Vouchr operator details" />
      <div className="page-body">
        {me.isPending && <CardSkeletons count={2} height={140} />}
        {me.isError && <p className="message error">{me.error.message || 'Could not load the platform settings.'}</p>}
        {me.isSuccess && !isAdmin && <p className="message">Only Vouchr platform admins can change these settings.</p>}

        {isAdmin && (
          <>
            <section className="card">
              <h2>Details shown in the consent form (Part 11)</h2>
              <p className="muted">
                These identify the entity that runs Vouchr. They are shown to everyone who signs a POPIA consent. Until they are entered, the consent
                form cannot be used. Each change is kept as a new version; consents already signed keep the version that was shown to the signer.
              </p>
              {history.isPending && <CardSkeletons count={1} height={200} />}
              {history.isError && <p className="message error mt">{history.error.message}</p>}
              {history.isSuccess && <OperatorForm key={rows[0]?.createdDate || 'first'} current={rows[0]} hasCurrent={rows.length > 0} />}
            </section>

            <section className="card">
              <h2>History</h2>
              {history.isSuccess && rows.length === 0 && <p className="muted mt">Nothing has been entered yet.</p>}
              {rows.length > 0 && (
                <div className="table-wrap mt">
                  <table className="table">
                    <thead>
                      <tr><th>When</th><th>Changed by</th><th>What changed</th><th>Reason</th><th>Information Officer</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((h, i) => (
                        <tr key={h.createdDate + i}>
                          <td>{formatDateTime(h.createdDate)} {i === 0 && <span className="badge ok">Current</span>}</td>
                          <td>{h.changedByName}</td>
                          <td>{h.changedFields.length ? h.changedFields.join(', ') : 'First entry'}</td>
                          <td>{h.changeReason || '—'}</td>
                          <td>{h.informationOfficer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
