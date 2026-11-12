import { useCallback, useSyncExternalStore } from 'react'

/** true while the browser matches a CSS media query, e.g. useMediaQuery('(min-width: 1000px)'). */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
