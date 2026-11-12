import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../toast/useToast.js'

/**
 * A write to the API that refreshes the lists it changes and tells the user how it went.
 *
 *   const save = useApiMutation((vars) => updateThing(vars), { invalidate: [['things', orgId]], success: 'Saved.' })
 *   save.mutate(vars)  /  await save.mutateAsync(vars)
 *
 * invalidate: query keys to refetch afterwards.  success: toast text (or a function of the result and variables).
 * quiet: true leaves failures to the caller (it handles the error itself).
 */
export function useApiMutation(mutationFn, { invalidate = [], success, onSuccess, quiet = false } = {}) {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      if (success) toast(typeof success === 'function' ? success(data, variables) : success)
      onSuccess?.(data, variables)
    },
    onError: (err) => {
      if (!quiet) toast(err.message || 'Something went wrong', 'error')
    },
  })
}
