import { CARE_STATUS_LABELS, serviceName } from '../../lib/labels.js'
import { formatDateTime } from '../../lib/format.js'

export const OPEN_STATUSES = ['PENDING', 'ATTENDING', 'LAPSED']

export const checkInLabel = (i) =>
  i.lastCheckedInAt
    ? `last check-in ${formatDateTime(i.lastCheckedInAt)}${i.lastCheckedInByName ? ` (${i.lastCheckedInByName})` : ''}`
    : 'not checked in yet'

const statusName = (s) => (CARE_STATUS_LABELS[s] || s || '').toLowerCase()

/** One care plan event as a short sentence, e.g. "Counselling (Hope Church): checked in". */
export function careEventEntry(e) {
  const what = `${serviceName(e.serviceType, e.serviceLabel)} (${e.internal ? 'us' : e.providerOrganizationName})${e.familyName ? `, ${e.familyName} family` : ''}`
  let action
  if (e.eventType === 'CHECKED_IN') action = 'checked in'
  else if (e.eventType === 'CREATED') action = e.toStatus === 'ATTENDING' ? 'added to the plan, attending' : 'added to the plan'
  else if (e.toStatus === 'CLOSED') action = 'removed'
  else action = `now ${statusName(e.toStatus)}${e.fromStatus ? ` (was ${statusName(e.fromStatus)})` : ''}`
  return {
    key: `care-${e.eventId}`,
    at: e.occurredAt,
    title: `${what}: ${action}`,
    meta: [e.note, e.actedByName ? `by ${e.actedByName}` : null, e.actedByOrganizationName].filter(Boolean).join(' · '),
  }
}

/** A project handover as a history entry. */
export function receivedEntry(h) {
  const what = `${h.stockItemName || h.description}${h.quantity > 1 ? ` × ${h.quantity}` : ''}`
  return {
    key: `received-${h.handoutId}`,
    at: `${h.handedOn}T12:00:00`,
    title: `${what}: received`,
    meta: [h.projectName, h.givenByName ? `by ${h.givenByName}` : null, h.organizationName].filter(Boolean).join(' · '),
  }
}

/** A finished request to a partner to complete the profile. */
export function profileRequestEntry(r) {
  return {
    key: `profile-${r.requestId}`,
    at: r.completedAt,
    title: `Profile completed by ${r.assigneeOrganizationName}`,
    meta: [r.completedByName ? `by ${r.completedByName}` : null, r.note].filter(Boolean).join(' · '),
  }
}

/** Care events, project handovers and completed profile requests merged into one newest-first list. */
export const mergeHistory = (events, received, requests) =>
  [
    ...(events || []).map(careEventEntry),
    ...(received || []).map(receivedEntry),
    ...(requests || []).filter((r) => r.status === 'COMPLETED' && r.completedAt).map(profileRequestEntry),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
