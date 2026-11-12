import { CONSENT_LABELS } from '../../lib/labels.js'
import { formatDate } from '../../lib/format.js'
import { Skeleton } from '../../components/Skeleton.jsx'
import Empty from '../../components/Empty.jsx'
import { EXTRA_FIELDS } from './extraFields.js'

/** Everyone enrolled that the viewer can see (our own people, plus partners' people who agreed to be shared). */
export default function EnrolledPeople({ project, participants, beneficiaries }) {
  const extras = EXTRA_FIELDS[project.projectType] || []
  const showOrg = participants.some((p) => p.status === 'ACTIVE')
  const showRequirement = !!project.requiredServiceType
  const rows = beneficiaries.data ?? []

  return (
    <section className="card">
      <h2>People</h2>
      <div className="mt">
        {beneficiaries.isPending && <Skeleton height={90} />}
        {beneficiaries.isError && <p className="message error">{beneficiaries.error.message || 'Failed to load people.'}</p>}
        {beneficiaries.isSuccess && rows.length === 0 && <Empty title="Nobody has been enrolled yet" />}
        {rows.length > 0 && (
          <ul className="show-mobile">
            {rows.map((p) => (
              <li className="list-row" key={p.beneficiaryId || p.personId}>
                <div className="avatar">{p.name[0]}{p.surname[0]}</div>
                <div className="grow">
                  <strong>{p.name} {p.surname}</strong>
                  <div className="meta">
                    {CONSENT_LABELS[p.consentStatus] || p.consentStatus}
                    {showOrg && ` · ${p.organizationName}`}
                    {extras.map((f) => (p.attributes?.[f.key] ? ` · ${f.label}: ${p.attributes[f.key]}` : ''))}
                  </div>
                  <div className="meta">Enrolled {formatDate(p.createdDate)}{p.registeredByName ? ` by ${p.registeredByName}` : ''}</div>
                </div>
                {showRequirement && p.requirementMet != null && (
                  <span className={`badge ${p.requirementMet ? 'ok' : 'bad'}`}>{p.requirementMet ? 'Met' : 'Not met'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="table-wrap hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  {extras.map((f) => <th key={f.key}>{f.label}</th>)}
                  {showOrg && <th>Organisation</th>}
                  <th>Consent</th>
                  {showRequirement && <th>Prerequisite</th>}
                  <th>Enrolled by</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.beneficiaryId || p.personId}>
                    <td><strong>{p.name} {p.surname}</strong></td>
                    <td>{p.gender || '—'}</td>
                    {extras.map((f) => <td key={f.key}>{p.attributes?.[f.key] ?? '—'}</td>)}
                    {showOrg && <td>{p.organizationName}</td>}
                    <td>{CONSENT_LABELS[p.consentStatus] || p.consentStatus}</td>
                    {showRequirement && (
                      <td>
                        {p.requirementMet == null ? '—' : p.requirementMet
                          ? <span className="badge ok">Met</span>
                          : <span className="badge bad">Not met</span>}
                      </td>
                    )}
                    <td>{p.registeredByName || '—'}</td>
                    <td>{formatDate(p.createdDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
