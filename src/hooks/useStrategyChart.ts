import { useState, useEffect } from 'react'
import { getStrategyChart, type StrategyChartData } from '../api/strategyChart'
import type { Range, Interval } from '../types'

const EMPTY: StrategyChartData = { lines: [], signals: [], logs: [], requires: [], pnl: 0 }

/** Fetches the trailing line + buy/sell signals for the selected strategy. */
export function useStrategyChart(
  ticker: string,
  range: Range,
  slug: string | null,
  interval?: Interval,
  start?: string,
  end?: string,
): StrategyChartData {
  const [data, setData] = useState<StrategyChartData>(EMPTY)

  useEffect(() => {
    if (!ticker || range === 'NOW' || !slug) {
      setData(EMPTY)
      return
    }
    let cancelled = false
    getStrategyChart(ticker, slug, range, interval, start, end)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(EMPTY) })
    return () => { cancelled = true }
  }, [ticker, range, slug, interval, start, end])

  return data
}
