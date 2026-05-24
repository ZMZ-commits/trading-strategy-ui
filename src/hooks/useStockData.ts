import { useState, useEffect, useRef } from 'react'
import { getHistory } from '../api/stocks'
import type { OHLCBar, Range } from '../types'

interface Result { data: OHLCBar[]; loading: boolean; error: string | null }

export function useStockData(ticker: string, range: Range): Result {
  const cache = useRef<Map<string, OHLCBar[]>>(new Map())
  const [data, setData] = useState<OHLCBar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return
    const key = `${ticker}:${range}`
    if (cache.current.has(key)) {
      setData(cache.current.get(key)!)
      return
    }
    setLoading(true)
    setError(null)
    getHistory(ticker, range)
      .then(res => { cache.current.set(key, res.bars); setData(res.bars) })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [ticker, range])

  return { data, loading, error }
}
