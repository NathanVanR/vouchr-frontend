// One care plan item: service, provider, status, schedule and last check-in. Shared by the care plan sheet and the
// person's profile. A check-in button shows when the viewer's org is the provider and the person is attending.
import { checkInCarePlanItem } from '../../lib/api.js'
import { CARE_STATUS_LABELS, serviceName } from '../../lib/labels.js'
import { OPEN_STATUSES, checkInLabel } from './careHelpers.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'

export default function CareItemRow({ item: i, onRemove, invalidate }) {
  const checkIn = useApiMutation(() => checkInCarePlanItem(i.itemId), { invalidate, success: 'Checked in.' })
  const canCheckIn = i.canUpdateStatus && i.status === 'ATTENDING' && invalidate
  return (
    <li className="list-row">
      <div className="grow">
        <strong>{serviceName(i.serviceType, i.serviceLabel)}</strong> — {i.internal ? 'us' : i.providerOrganizationName}
        <div className="meta">
          {CARE_STATUS_LABELS[i.status] || i.status}
          {i.schedule ? ` · ${i.schedule}` : ''} · {checkInLabel(i)}
        </div>
      </div>
      {canCheckIn && (
        <button type="button" className="btn btn-sm" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>Check in</button>
      )}
      {onRemove && (OPEN_STATUSES.includes(i.status) || i.status === 'COMPLETED') && (
        <button type="button" className="link-btn danger" onClick={() => onRemove(i.itemId)}>Remove</button>
      )}
    </li>
  )
}
