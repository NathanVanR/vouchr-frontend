import { useContext } from 'react'
import { DialogContext } from './context.js'

/**
 * Styled replacements for window.confirm / window.prompt that work the same way:
 *   if (await confirm({ title, message, confirmLabel, danger })) ...
 *   const reason = await prompt({ title, message, label, required })   // null when cancelled
 */
export function useDialogs() {
  return useContext(DialogContext)
}
