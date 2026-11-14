// Ask an active partner to complete a partly filled profile (e.g. on a home visit). The person stays with us: the partner only
// sees their name and which details are missing, and can only fill those in.
import { useState } from 'react'
import { createProfileRequest } from '../../lib/api.js'
import { MISSING_FIELD_LABELS } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { usePartnershipList } from '../../hooks/care.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

export default function ProfileRequestSheet({ orgId, person, onClose }) {
  const partnerships = usePartnershipList(orgId)
  const [partnerId, setPartnerId] = useState('')
  const [note, setNote] = useState('')

  const partners = (partnerships.data || []).filter((p) => p.status === 'ACTIVE').map((p) => {
    const weAreRequester = p.requesterOrganizationId === orgId
    return {
      id: weAreRequester ? p.partnerOrganizationId : p.requesterOrganizationId,
      name: weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName,
    }
  })

  const ask = useApiMutation(
    () => createProfileRequest(person.personId, { assigneeOrganizationId: partnerId || partners[0]?.id, note: note.trim() || null }),
    {
      invalidate: [['profile-requests', person.personId], ['profile-requests-org']],
      success: 'Request sent.',
      onSuccess: onClose,
    },
  )

  const missing = (person.missingFields || []).map((f) => MISSING_FIELD_LABELS[f] || f)

  return (
    <Sheet title={`Ask a partner to complete ${person.name}'s profile`} onClose={onClose}>
      {partnerships.isPending && <Skeleton height={120} />}
      {partnerships.isSuccess && partners.length === 0 && (
        <p className="muted">You have no active partners yet. An admin can set one up on the Partners page.</p>
      )}
      {partnerships.isSuccess && partners.length > 0 && (
        <form onSubmit={(e) => { e.preventDefault(); ask.mutate() }}>
          <p className="muted">
            They will see {person.name} {person.surname} and that these details are missing: {missing.join(', ') || 'none'}. They can only fill
            those in, and lose sight of {person.name} once they submit. {person.name} stays registered with us.
          </p>
          <Field label="Which partner?">
            <select value={partnerId || partners[0].id} onChange={(e) => setPartnerId(e.target.value)}>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Note (optional)" hint="e.g. Home visit on Tuesday. They see this note.">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          <div className="sheet-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={ask.isPending}>{ask.isPending ? 'Sending…' : 'Send request'}</button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
