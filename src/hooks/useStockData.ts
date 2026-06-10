import { useState, useEffect, useRef } from 'react'
import { getHistory } from '../api/stocks'
import type { OHLCBar, Range, Interval } from '../types'

interface Result { data: OHLCBar[]; loading: boolean; error: string | null }

export function useStockData(ticker: string, range: Range, interval?: Interval): Result {
  const cache = useRef<Map<string, OHLCBar[]>>(new Map())
  const [data, setData] = useState<OHLCBar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return
    if (range === 'NOW') { setData([]); return }  // live path handled by useLiveTicks
    const key = `${ticker}:${range}:${interval ?? ''}`
    if (cache.current.has(key)) {
      setData(cache.current.get(key)!)
      return
    }
    setLoading(true)
    setError(null)
    getHistory(ticker, range, interval)
      .then(res => { cache.current.set(key, res.bars); setData(res.bars) })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [ticker, range, interval])

  return { data, loading, error }
}
