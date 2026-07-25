import { useState, useEffect, useRef } from 'react'

/** useState backed by localStorage, so the value survives a reload.
 *
 *  Reads once on mount (lazy initializer) and writes on every change. Both
 *  sides are wrapped in try/catch: localStorage throws in private-mode Safari
 *  and when the quota is full, and a corrupt/hand-edited entry shouldn't take
 *  the whole app down -- in either case we fall back to `initial` and just
 *  behave like a normal useState for the session. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  // Skip the write on the very first render -- it would just rewrite what we
  // read, and would clobber a good stored value with `initial` if parsing failed.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* quota / private mode -- keep working in-memory */ }
  }, [key, value])

  return [value, setValue] as const
}
