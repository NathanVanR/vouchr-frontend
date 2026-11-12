import { createBrowserRouter, Navigate } from 'react-router-dom'
import { startDemoMode } from './lib/demo.js'

// Every page is loaded on demand, so the first screen only downloads what it needs.
const page = (load) => async () => ({ Component: (await load()).default })

export const router = createBrowserRouter([
  { path: '/', lazy: page(() => import('./pages/Landing.jsx')) },
  { path: '/login', lazy: page(() => import('./pages/Login.jsx')) },
  { path: '/register', lazy: page(() => import('./pages/Register.jsx')) },
  { path: '/register-org', lazy: page(() => import('./pages/RegisterOrg.jsx')) },
  {
    // Starts demo mode (sample data, no login). A full page load keeps the auth state clean, like the old demo.
    path: '/demo',
    loader: () => {
      startDemoMode()
      window.location.replace('/app/projects')
      return null
    },
  },
  {
    path: '/app',
    lazy: page(() => import('./components/AppShell.jsx')),
    children: [
      { index: true, element: <Navigate to="projects" replace /> },
      { path: 'projects', lazy: page(() => import('./pages/projects/Projects.jsx')) },
      { path: 'projects/:id', lazy: page(() => import('./pages/projects/ProjectDetail.jsx')) },
      { path: 'people', lazy: page(() => import('./pages/people/People.jsx')) },
      { path: 'families', lazy: page(() => import('./pages/families/Families.jsx')) },
      { path: 'partners', lazy: page(() => import('./pages/partners/Partners.jsx')) },
      { path: 'team', lazy: page(() => import('./pages/admin/Team.jsx')) },
      { path: 'platform', lazy: page(() => import('./pages/admin/Platform.jsx')) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
