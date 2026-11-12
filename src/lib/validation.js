// Same rules as the backend (util/StreetAddress.java, util/SaIdNumber.java, Person.java).

// ---- Street address: one field with a number and a name, e.g. "12 Mandela Way" ----
export const STREET_ADDRESS_MESSAGE =
  'Enter both a street number and a street name, for example 12 Mandela Way'

export function normaliseStreetAddress(value) {
  return (value || '').trim().replace(/\s+/g, ' ')
}

export function isValidStreetAddress(value) {
  const normalised = normaliseStreetAddress(value)
  if (!normalised || normalised.length > 255) return false
  if (!/^[\p{L}\p{N} .,'’/#&()-]+$/u.test(normalised)) return false

  let hasNumber = false
  let hasName = false
  for (const raw of normalised.split(' ')) {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    if (/\p{Nd}/u.test(word)) {
      hasNumber = true
    } else if (/^\p{L}[\p{L}'’-]*\p{L}$/u.test(word)) {
      hasName = true
    }
  }
  return hasNumber && hasName
}

/** Error text for a street address field, or '' when it is empty (when optional) or valid. */
export function streetAddressError(value, { required = false } = {}) {
  if (!(value || '').trim()) return required ? STREET_ADDRESS_MESSAGE : ''
  return isValidStreetAddress(value) ? '' : STREET_ADDRESS_MESSAGE
}

// ---- South African ID numbers and ages ----
export const AGE_OF_MAJORITY = 18

export function isValidSaId(id) {
  if (!/^\d{13}$/.test(id || '')) return false
  const yy = Number(id.slice(0, 2))
  const mm = Number(id.slice(2, 4))
  const dd = Number(id.slice(4, 6))
  const realDate = (year) => {
    const d = new Date(Date.UTC(year, mm - 1, dd))
    return d.getUTCFullYear() === year && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd
  }
  if (!realDate(1900 + yy) && !realDate(2000 + yy)) return false
  if (id[10] !== '0' && id[10] !== '1') return false // citizen / permanent resident

  let sum = 0
  let double = false
  for (let i = id.length - 1; i >= 0; i--) {
    let d = Number(id[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** YYYY-MM-DD from a valid SA ID; the century is the latest one that is not in the future. Staff can correct it. */
export function dateOfBirthFromSaId(id) {
  if (!isValidSaId(id)) return null
  const yy = Number(id.slice(0, 2))
  const year = 2000 + yy <= new Date().getFullYear() ? 2000 + yy : 1900 + yy
  return `${year}-${id.slice(2, 4)}-${id.slice(4, 6)}`
}

/** The YYMMDD part of the ID must match the date of birth (the century is not compared). */
export function dateOfBirthMatchesId(dob, id) {
  return (
    !!dob &&
    !!id &&
    dob.slice(2, 4) === id.slice(0, 2) &&
    dob.slice(5, 7) === id.slice(2, 4) &&
    dob.slice(8, 10) === id.slice(4, 6)
  )
}

/** The date of birth (YYYY-MM-DD) encoded in a valid SA ID number; the latest non-future century is assumed. */
export function dobFromId(id) {
  if (!isValidSaId(id)) return ''
  const yy = id.slice(0, 2)
  const rest = `-${id.slice(2, 4)}-${id.slice(4, 6)}`
  const recent = `20${yy}${rest}`
  return recent > new Date().toISOString().slice(0, 10) ? `19${yy}${rest}` : recent
}

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function ageOn(dob, today = new Date()) {
  const [y, m, d] = dob.split('-').map(Number)
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

/** A phone number in international form, e.g. +27821234567 (the phone input produces this). */
export function isValidPhone(value) {
  const digits = (value || '').replace(/\D/g, '')
  if (!/^\+\d+$/.test((value || '').trim())) return false
  if ((value || '').startsWith('+27')) return digits.length === 11 // +27 and nine digits
  return digits.length >= 8 && digits.length <= 15
}
