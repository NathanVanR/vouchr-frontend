import { cloneElement, useId } from 'react'

/** A labelled form control: <Field label="Name"><input .../></Field>. The label is tied to the control automatically. */
export default function Field({ label, hint, children }) {
  const generated = useId()
  const id = children?.props?.id || generated
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {cloneElement(children, { id })}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
