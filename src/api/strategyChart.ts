import { API_BASE } from './config'
import type { CustomSeries } from './custom'
import type { Range, Interval } from '../types'

export interface StrategySignal {
  time: string
  type: 'buy' | 'sell'
  price: number
}

export interface StrategyLog {
  time: string | null
  msg: string
}

export interface StrategyChartData {
  lines: CustomSeries[]
  signals: StrategySignal[]
  logs: StrategyLog[]
  requires: string[]
  pnl: number
}

const EMPTY: StrategyChartData = { lines: [], signals: [], logs: [], requires: [], pnl: 0 }

/** Run an IDE strategy over a ticker/range; returns its plotted line(s) + the
 *  buy/sell signal points for the chart markers. */
export async function getStrategyChart(
  ticker: string,
  slug: string,
  range: Range,
  interval?: Interval,
  start?: string,
  end?: string,
): Promise<StrategyChartData> {
  const params = new URLSearchParams({ range })
  if (interval) params.set('interval', interval)
  if (start && end) { params.set('start', start); params.set('end', end) }
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/strategy/${encodeURIComponent(slug)}?${params}`)
  if (!res.ok) return EMPTY
  const j = await res.json()
  const lines: CustomSeries[] = []
  for (const [name, s] of Object.entries(j.indicators ?? {})) {
    const series = s as { kind?: string; time: string[]; values: (number | null)[] }
    lines.push({ name, kind: series.kind ?? 'overlay', time: series.time, values: series.values })
  }
  return {
    lines,
    signals: (j.signals ?? []) as StrategySignal[],
    logs: (j.logs ?? []) as StrategyLog[],
    requires: (j.requires ?? []) as string[],
    pnl: typeof j.pnl === 'number' ? j.pnl : 0,
  }
}
