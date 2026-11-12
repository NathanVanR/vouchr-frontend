import { createContext } from 'react'

export const DialogContext = createContext({
  confirm: async () => false,
  prompt: async () => null,
})
