import { useState, useEffect, useRef, useCallback } from 'react'
import { getStrategyStatus } from '../api/execution'
import type { RunResult } from '../types'

interface Result { status: RunResult | null; loading: boolean; refetch: () => void }

export function useStrategyStatus(strategyId: string | null): Result {
  const [status, setStatus] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch_ = useCallback(async () => {
    if (!strategyId) return
    setLoading(true)
    try {
      setStatus(await getStrategyStatus(strategyId))
    } catch { /* ignore poll errors */ }
    finally { setLoading(false) }
  }, [strategyId])

  useEffect(() => {
    if (!strategyId) { setStatus(null); return }
    fetch_()
  }, [strategyId, fetch_])

  useEffect(() => {
    if (status?.state === 'running') {
      intervalRef.current = setInterval(fetch_, 5000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [status?.state, fetch_])

  return { status, loading, refetch: fetch_ }
}
