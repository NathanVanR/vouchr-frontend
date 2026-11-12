import { useCallback, useMemo, useRef, useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { DialogContext } from './context.js'

function DialogSheet({ dialog, onSettle }) {
  const { type, opts } = dialog
  const [value, setValue] = useState(opts.initialValue || '')
  const settled = useRef(false)
  const cancelValue = type === 'confirm' ? false : null

  const settle = (result) => {
    if (settled.current) return
    settled.current = true
    onSettle(result)
  }

  const canSubmit = type === 'confirm' || !opts.required || value.trim().length > 0

  return (
    <Sheet title={opts.title || (type === 'confirm' ? 'Are you sure?' : 'Please answer')} onClose={() => settle(cancelValue)} closeLabel="Cancel">
      {opts.message && <p style={{ whiteSpace: 'pre-wrap' }}>{opts.message}</p>}
      {type === 'prompt' && (
        <div className="field mt">
          <label htmlFor="dialog-input">{opts.label || 'Reason'}</label>
          <textarea id="dialog-input" rows={3} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </div>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={() => settle(cancelValue)}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn${opts.danger ? ' btn-danger' : ''}`}
          disabled={!canSubmit}
          onClick={() => settle(type === 'confirm' ? true : value.trim())}
        >
          {opts.confirmLabel || (type === 'confirm' ? 'Yes' : 'Continue')}
        </button>
      </div>
    </Sheet>
  )
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((opts = {}) => new Promise((resolve) => setDialog({ type: 'confirm', opts, resolve })), [])
  const prompt = useCallback((opts = {}) => new Promise((resolve) => setDialog({ type: 'prompt', opts, resolve })), [])
  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt])

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <DialogSheet
          key={dialog.opts.title + dialog.type}
          dialog={dialog}
          onSettle={(result) => {
            dialog.resolve(result)
            setDialog(null)
          }}
        />
      )}
    </DialogContext.Provider>
  )
}
