import { useContext } from 'react'
import { ToastContext } from './context.js'

/** toast('Saved.') or toast('Could not save', 'error') */
export function useToast() {
  return useContext(ToastContext)
}
