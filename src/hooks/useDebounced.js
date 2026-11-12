import { useEffect, useState } from 'react'

/** The value, but only after it has stopped changing for `delay` ms (so a search waits for the typing to pause). */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
