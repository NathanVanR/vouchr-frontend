import { useEffect, useRef } from 'react'

/**
 * A modal that slides up as a bottom sheet on phones and shows centred on desktop (native <dialog>: focus trap and
 * Escape come for free). Render it only while it is open: `{open && <Sheet onClose={...}>...</Sheet>}`.
 */
export default function Sheet({ title, onClose, children, closeLabel = 'Close' }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close() // a click on the dimmed backdrop
      }}
    >
      <div className="sheet-head">
        <h2>{title}</h2>
        <button type="button" className="link-btn" onClick={() => ref.current?.close()}>
          {closeLabel}
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  )
}
