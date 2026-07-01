import { useState, useEffect } from 'react'
import { API_BASE } from '../api/config'
import type { Range, Interval } from '../types'

export interface IndicatorSeries {
  time: string[]
  values: (number | null)[]
}
export type Indicators = Record<string, IndicatorSeries>

/**
 * Fetches computed indicator series from the backend for the selected studies.
 * Skips fetching for the live NOW range or when nothing is selected.
 */
export function useIndicators(ticker: string, range: Range, studies: string[], interval?: Interval, start?: string, end?: string): Indicators {
  const [data, setData] = useState<Indicators>({})
  const key = studies.join(',')

  useEffect(() => { setData({}) }, [ticker, range, interval, start, end])

  useEffect(() => {
    if (!ticker || range === 'NOW' || studies.length === 0) {
      setData({})
      return
    }
    let cancelled = false
    const params = new URLSearchParams({ range, studies: key })
    if (interval) params.set('interval', interval)
    if (start && end) { params.set('start', start); params.set('end', end) }
    fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/indicators?${params}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(j => { if (!cancelled) setData(j.indicators || {}) })
      .catch(() => { if (!cancelled) setData({}) })
    return () => { cancelled = true }
  }, [ticker, range, key, interval, start, end])

  return data
}
