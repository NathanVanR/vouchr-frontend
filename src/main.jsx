import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/queryClient.js'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { ToastProvider } from './toast/ToastProvider.jsx'
import { DialogProvider } from './dialogs/DialogProvider.jsx'
import { Splash } from './components/Skeleton.jsx'
import UpdatePrompt from './components/UpdatePrompt.jsx'
import StagingBanner from './components/StagingBanner.jsx'
import { router } from './router.jsx'
import { reloadForNewVersion } from './lib/staleVersion.js'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/pages.css'

// Vite fires this when a lazily loaded file (or its CSS) is gone after a deploy: reload once to get the new version.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <RouterProvider router={router} fallbackElement={<Splash />} />
            <UpdatePrompt />
            <StagingBanner />
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
