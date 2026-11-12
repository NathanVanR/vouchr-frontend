import { useId, useState } from 'react'

/** Password input with a Show / Hide button. */
export default function PasswordField({ label, value, onChange, autoComplete, minLength, placeholder = '••••••••' }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          required
        />
        <button type="button" onClick={() => setShown(!shown)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}
