import { useState, useEffect } from 'react'

/** Subscribe to a CSS media query and re-render when it changes. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * True for phones and portrait tablets (anything narrower than the `lg`
 * breakpoint). At/above this width we keep the mouse-oriented desktop layout;
 * below it we render a stacked, touch-friendly layout.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}
