export const fullName = (p) => `${p.name} ${p.surname}`

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-ZA') : '—')

/** A plain "YYYY-MM-DD" (an aid session date) shown in the local format. */
export const formatDay = (day) => new Date(`${day}T00:00:00`).toLocaleDateString('en-ZA')

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
