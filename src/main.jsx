import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/queryClient.js'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { ToastProvider } from './toast/ToastProvider.jsx'
import { DialogProvider } from './dialogs/DialogProvider.jsx'
import { Splash } from './components/Skeleton.jsx'
import { router } from './router.jsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/pages.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <RouterProvider router={router} fallbackElement={<Splash />} />
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
