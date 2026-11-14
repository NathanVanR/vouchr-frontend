import { useQuery } from '@tanstack/react-query'
import { externalProviders } from '../lib/authFlow.js'

/** Whether "Continue with Google" is switched on in this environment (the button is hidden when it is not). */
export const useGoogleEnabled = () =>
  !!useQuery({ queryKey: ['auth-providers'], queryFn: externalProviders, staleTime: 10 * 60_000 }).data?.google
