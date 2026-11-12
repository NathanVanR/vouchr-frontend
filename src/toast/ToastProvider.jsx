import { useCallback, useState } from 'react'
import { ToastContext } from './context.js'

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((text, type = 'info') => {
    const id = nextId++
    setToasts((all) => [...all, { id, text, type }])
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), type === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
