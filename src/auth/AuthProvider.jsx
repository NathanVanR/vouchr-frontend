import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { getMe, getPlatformMe } from '../lib/api.js'
import { isDemo, exitDemoMode } from '../lib/demo.js'
import { isAdminRole } from '../lib/labels.js'
import { AuthContext } from './context.js'

const ACTIVE_ORG_KEY = 'activeOrgId'

function readActiveOrg() {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY)
  } catch {
    return null
  }
}

/**
 * Who is signed in. Supabase holds the session; /api/users/me says which organisations the staff member belongs to.
 * status: 'loading' | 'anon' | 'authed' | 'error' (signed in, but the profile could not be loaded:
 * `profileMissing` means the account has no staff profile yet).
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const demo = isDemo()
  const [storedOrgId, setStoredOrgId] = useState(readActiveOrg)

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session', demo],
    queryFn: async () => (demo ? { demo: true } : (await supabase.auth.getSession()).data.session),
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const hasSession = demo || !!sessionQuery.data

  const meQuery = useQuery({
    queryKey: ['auth', 'me', demo],
    queryFn: async () => {
      if (!demo) return getMe()
      const { demoUserOrganizations } = await import('../lib/demo-data.js')
      return { profileId: 'demo-user', role: 'STAFF', userOrganizations: demoUserOrganizations() }
    },
    enabled: hasSession,
    staleTime: 60_000,
    retry: false,
  })

  // Signing out in another tab (or the token being revoked) must end this session too.
  useEffect(() => {
    if (demo) return undefined
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        queryClient.setQueryData(['auth', 'session', false], null)
      } else if (event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [demo, queryClient])

  const platformQuery = useQuery({
    queryKey: ['platform', 'me', demo],
    queryFn: getPlatformMe,
    enabled: meQuery.isSuccess,
    retry: false,
  })

  const orgs = meQuery.data?.userOrganizations ?? {}
  const orgIds = Object.keys(orgs)
  const activeOrgId = orgIds.includes(storedOrgId) ? storedOrgId : (orgIds[0] ?? null)
  const activeOrg = activeOrgId ? orgs[activeOrgId] : null

  const setActiveOrgId = useCallback((id) => {
    setStoredOrgId(id)
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, id)
    } catch {
      /* the choice just is not remembered */
    }
  }, [])

  /** Re-read the session and profile (after signing in, registering or creating an organisation). */
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth'] })
  }, [queryClient])

  const logout = useCallback(async () => {
    if (demo) {
      exitDemoMode()
      return
    }
    await supabase.auth.signOut()
    queryClient.clear()
    window.location.href = '/'
  }, [demo, queryClient])

  let status = 'authed'
  if (sessionQuery.isPending || (hasSession && meQuery.isPending)) status = 'loading'
  else if (!hasSession) status = 'anon'
  else if (meQuery.isError) status = 'error'

  const value = useMemo(
    () => ({
      status,
      demo,
      profile: meQuery.data ?? null,
      profileMissing: meQuery.isError && [403, 404].includes(meQuery.error?.status),
      error: meQuery.error,
      orgs,
      orgIds,
      activeOrgId,
      activeOrg,
      setActiveOrgId,
      isAdmin: isAdminRole(activeOrg?.role),
      isPlatformAdmin: !!platformQuery.data?.platformAdmin,
      refresh,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, demo, meQuery.data, meQuery.error, meQuery.isError, activeOrgId, platformQuery.data, refresh, logout, setActiveOrgId],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
