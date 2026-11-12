export const consentTone = (status) => (status === 'VALID' ? 'ok' : 'bad')

/** A child is covered by an adult in their own family, so the family must have a registered adult. */
export function canCaptureForChild(child, people) {
  return !!child.familyId && people.some((x) => x.familyId === child.familyId && x.ageGroup !== 'CHILD')
}
