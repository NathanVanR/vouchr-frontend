// Plain date maths for the area calendar (no library). Days are "YYYY-MM-DD" strings in local time, so they compare as text.

const pad = (n) => String(n).padStart(2, '0')

export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayDay = () => isoDay(new Date())

export const parseDay = (iso) => new Date(`${iso}T00:00:00`)

export const monthTitle = (year, month) => new Date(year, month, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })

export function addMonths(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/**
 * The weeks shown for a month, Monday first, padded with days of the neighbouring months.
 * Returns { days: [{ iso, inMonth, day }], from, to } where from/to are the first and last day on the grid.
 */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(year, month, 1 - offset)
  const last = new Date(year, month + 1, 0)
  const trailing = (7 - ((last.getDay() + 6) % 7) - 1 + 7) % 7
  const end = new Date(year, month + 1, trailing === 0 ? 0 : trailing)
  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({ iso: isoDay(d), inMonth: d.getMonth() === month, day: d.getDate() })
  }
  return { days, from: days[0].iso, to: days[days.length - 1].iso }
}

export const eventCoversDay = (event, iso) => event.startsOn <= iso && event.endsOn >= iso

/** "5 Dec" or "5 to 7 Dec". */
export function eventDates(event) {
  const fmt = (iso, withMonth = true) => parseDay(iso).toLocaleDateString('en-ZA', withMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' })
  if (event.startsOn === event.endsOn) return fmt(event.startsOn)
  const a = parseDay(event.startsOn)
  const b = parseDay(event.endsOn)
  return a.getMonth() === b.getMonth() ? `${fmt(event.startsOn, false)} to ${fmt(event.endsOn)}` : `${fmt(event.startsOn)} to ${fmt(event.endsOn)}`
}

/** "Randburg, Johannesburg", "Durban", "All areas" or our own city. */
export function placeLabel(place, ownCity) {
  if (!place) return ownCity ? `${ownCity} (our area)` : 'our area'
  if (place.all) return 'All areas'
  return [place.suburb, place.city].filter(Boolean).join(', ')
}
