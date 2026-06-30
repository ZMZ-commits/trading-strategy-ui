import { API_BASE } from './config'
import type { CustomSeries } from './custom'
import type { Range, Interval } from '../types'

export interface StrategySignal {
  time: string
  type: 'buy' | 'sell'
  price: number
}

export interface StrategyChartData {
  lines: CustomSeries[]
  signals: StrategySignal[]
}

const EMPTY: StrategyChartData = { lines: [], signals: [] }

/** Run an IDE strategy over a ticker/range; returns its plotted line(s) + the
 *  buy/sell signal points for the chart markers. */
export async function getStrategyChart(
  ticker: string,
  slug: string,
  range: Range,
  interval?: Interval,
): Promise<StrategyChartData> {
  const params = new URLSearchParams({ range })
  if (interval) params.set('interval', interval)
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/strategy/${encodeURIComponent(slug)}?${params}`)
  if (!res.ok) return EMPTY
  const j = await res.json()
  const lines: CustomSeries[] = []
  for (const [name, s] of Object.entries(j.indicators ?? {})) {
    const series = s as { kind?: string; time: string[]; values: (number | null)[] }
    lines.push({ name, kind: series.kind ?? 'overlay', time: series.time, values: series.values })
  }
  return { lines, signals: (j.signals ?? []) as StrategySignal[] }
}
