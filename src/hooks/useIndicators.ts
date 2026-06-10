import { useState, useEffect } from 'react'
import { API_BASE } from '../api/config'
import type { Range } from '../types'

export interface IndicatorSeries {
  time: string[]
  values: (number | null)[]
}
export type Indicators = Record<string, IndicatorSeries>

/**
 * Fetches computed indicator series from the backend for the selected studies.
 * Skips fetching for the live NOW range or when nothing is selected.
 */
export function useIndicators(ticker: string, range: Range, studies: string[]): Indicators {
  const [data, setData] = useState<Indicators>({})
  const key = studies.join(',')

  // Wipe immediately when the ticker changes — previous asset's indicators are
  // never valid for a new symbol.
  useEffect(() => { setData({}) }, [ticker])

  useEffect(() => {
    if (!ticker || range === 'NOW' || studies.length === 0) {
      setData({})
      return
    }
    let cancelled = false
    // Clear immediately on ticker change (different asset = stale data).
    // On range change within the same ticker we let the previous indicators
    // stay visible until the new ones arrive — avoids a blank intermediate
    // render that causes a double series-rebuild and chart flicker.
    fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/indicators?range=${range}&studies=${key}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(j => { if (!cancelled) setData(j.indicators || {}) })
      .catch(() => { if (!cancelled) setData({}) })
    return () => { cancelled = true }
  }, [ticker, range, key])

  return data
}
