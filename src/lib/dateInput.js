// Day/month/year text helpers for DateInput (the value itself is always an ISO "YYYY-MM-DD" string).

const pad = (n) => String(n).padStart(2, '0')

/** "2026-11-19" -> "19/11/2026" ('' for anything else). */
export function isoToDmy(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** "19/11/2026" -> "2026-11-19", or '' unless it is a real calendar date. */
export function dmyToIso(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || '')
  if (!m) return ''
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return ''
  return `${y}-${pad(mo)}-${pad(d)}`
}

/** Keeps only digits and puts the slashes in as they type: 1911 -> 19/11, 19112026 -> 19/11/2026. */
export function mask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

