export const fullName = (p) => `${p.name} ${p.surname}`

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const pad2 = (n) => String(n).padStart(2, '0')

/** A date or timestamp as day/month/year (the browser's own locale order is never used). */
export const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

export const formatDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${formatDate(iso)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** A plain "YYYY-MM-DD" shown as day/month/year. */
export const formatDay = (day) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

/** A project's run, e.g. "01/12/2026 to 20/01/2027" or "From 01/12/2026"; '' when it has no dates. */
export const projectDates = (p) => {
  if (!p?.startsOn) return ''
  return p.endsOn && p.endsOn !== p.startsOn ? `${formatDay(p.startsOn)} to ${formatDay(p.endsOn)}` : `From ${formatDay(p.startsOn)}`
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
