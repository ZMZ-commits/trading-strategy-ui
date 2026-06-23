import { useState, useEffect } from 'react'
import { getCustomIndicators, getCustomSeries, type CustomIndicatorMeta, type CustomSeries } from '../api/custom'
import type { Range, Interval } from '../types'

/** The catalog of published custom indicators (for the picker). */
export function useCustomList(): CustomIndicatorMeta[] {
  const [list, setList] = useState<CustomIndicatorMeta[]>([])
  useEffect(() => {
    getCustomIndicators().then(setList).catch(() => setList([]))
  }, [])
  return list
}

/** Fetches the series for the selected custom indicators (one request per slug). */
export function useCustomSeries(ticker: string, range: Range, slugs: string[], interval?: Interval): CustomSeries[] {
  const [series, setSeries] = useState<CustomSeries[]>([])
  const key = slugs.join(',')

  useEffect(() => {
    if (!ticker || range === 'NOW' || slugs.length === 0) {
      setSeries([])
      return
    }
    let cancelled = false
    Promise.all(slugs.map(s => getCustomSeries(ticker, s, range, interval)))
      .then(results => { if (!cancelled) setSeries(results.flat()) })
      .catch(() => { if (!cancelled) setSeries([]) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, range, key, interval])

  return series
}
