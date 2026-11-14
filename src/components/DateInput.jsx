// A date field that always reads day/month/year, whatever the browser's language (the native <input type="date"> follows the
// browser locale and cannot be changed from the page). The value going in and out is an ISO "YYYY-MM-DD" string, or '' while the
// date is empty or incomplete. The initial value is read once: the field then keeps its own text. A calendar button opens the native picker for people who would rather pick.
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { dmyToIso, isoToDmy, mask } from '../lib/dateInput.js'

export default function DateInput({ id, value, onChange, min, max, required = false, ...rest }) {
  const [text, setText] = useState(isoToDmy(value))
  const textRef = useRef(null)
  const pickerRef = useRef(null)

  const iso = dmyToIso(text)
  let problem = ''
  if (text && !iso) problem = 'Enter the date as day/month/year, for example 19/11/2026.'
  else if (iso && min && iso < min) problem = 'That date is too early.'
  else if (iso && max && iso > max) problem = 'That date is too late.'
  useEffect(() => { textRef.current?.setCustomValidity(problem) }, [problem])

  function change(e) {
    const next = mask(e.target.value)
    setText(next)
    onChange(dmyToIso(next))
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        {...rest}
        ref={textRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        value={text}
        required={required}
        onChange={change}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label="Pick a date from a calendar"
        onClick={() => pickerRef.current?.showPicker?.()}
      >
        <Icon name="calendar" small />
      </button>
      {/* only used to pick: its own display format is never shown */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        max={max}
        value={iso}
        onChange={(e) => { setText(isoToDmy(e.target.value)); onChange(e.target.value) }}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
