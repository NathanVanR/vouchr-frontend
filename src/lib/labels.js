// Labels shared across the app. They match the backend enums (ServiceType, project types, Relationship...).

export const SERVICE_LABELS = {
  FOOD: 'Food',
  CLOTHING: 'Clothing',
  COUNSELLING: 'Counselling',
  COURSE: 'Course / training',
  DOCTOR_VISIT: 'Doctor visit',
  NURSE_VISIT: 'Nurse visit',
  BUDGETING_HELP: 'Help with budgeting',
  OTHER: 'Other',
}

/** The services a project can require someone to be receiving before they get aid. */
export const PREREQUISITE_SERVICES = {
  COUNSELLING: SERVICE_LABELS.COUNSELLING,
  COURSE: SERVICE_LABELS.COURSE,
  BUDGETING_HELP: SERVICE_LABELS.BUDGETING_HELP,
}

export const PROJECT_TYPE_LABELS = {
  FEEDING_SCHEME: 'Feeding scheme',
  GLASSES_DRIVE: 'Reading glasses drive',
  SCHOOL_SUPPLIES_DRIVE: 'School supplies drive',
  CLOTHING_DRIVE: 'Clothing drive',
  OTHER: 'Other',
}

export const CARE_STATUS_LABELS = {
  PENDING: 'Waiting for a reply',
  ATTENDING: 'Attending',
  COMPLETED: 'Completed',
  LAPSED: 'Lapsed',
  DECLINED: 'Declined',
  CLOSED: 'Closed',
}

/** Relationship of a dependent to the adult they are registered under. */
export const RELATIONSHIP_OPTIONS = [
  ['CHILD', 'Child'],
  ['STEPCHILD', 'Stepchild'],
  ['FOSTER_CHILD', 'Foster child'],
  ['GRANDCHILD', 'Grandchild'],
  ['SIBLING', 'Sibling'],
  ['NIECE_NEPHEW', 'Niece / nephew'],
  ['SPOUSE_PARTNER', 'Spouse / partner'],
  ['PARENT', 'Parent'],
  ['OTHER_RELATIVE', 'Other relative'],
  ['OTHER', 'Other'],
]
export const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS)

export const CONSENT_LABELS = {
  VALID: 'Consent signed',
  MISSING: 'No consent yet',
  WITHDRAWN: 'Consent withdrawn',
  NEEDS_OWN_CONSENT: 'Needs own consent',
}

export const AGE_LABELS = { ADULT: 'Adult', CHILD: 'Child', UNKNOWN: 'Age unknown' }

/** A service's name; "Other" shows the free text somebody typed in. */
export const serviceName = (type, label) =>
  type === 'OTHER' && label ? label : SERVICE_LABELS[type] || type

/** A project's kind; "Other" shows the free text somebody typed in. */
export const projectTypeName = (type, label) =>
  type === 'OTHER' && label ? label : PROJECT_TYPE_LABELS[type] || type

/** Org roles come back as ROLE_ORG_ADMIN or ADMIN depending on the endpoint. */
export const isAdminRole = (role) => role === 'ROLE_ORG_ADMIN' || role === 'ADMIN'
