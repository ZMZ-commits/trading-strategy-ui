import type { OHLCBar, Range, Interval } from '../types'

// Coarser-or-equal granularity order. A stored dataset can only be VIEWED at
// its own interval or something coarser (aggregated up) -- there's no way to
// fabricate finer data than what was actually pulled.
const GRANULARITY_ORDER: Interval[] = ['1m', '1h', '1d', '1w', '1mo']

/** Intervals a dataset stored at `nativeInterval` can be displayed at:
 *  itself, plus anything coarser. */
export function availableIntervals(nativeInterval: string): Interval[] {
  const i = GRANULARITY_ORDER.indexOf(nativeInterval as Interval)
  return i === -1 ? [nativeInterval as Interval] : GRANULARITY_ORDER.slice(i)
}

function bucketKey(ts: string, interval: Interval): string {
  const d = new Date(ts)
  switch (interval) {
    case '1h':
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
    case '1d':
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    case '1w': {
      // Bucket by ISO week (Monday start).
      const day = (d.getUTCDay() + 6) % 7
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
      return monday.toISOString().slice(0, 10)
    }
    case '1mo':
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    default:
      return ts // '1m' (or anything finer) -- no bucketing, 1:1
  }
}

/** Resample OHLCV bars up to a coarser interval (e.g. 1m -> 1d): open=first,
 *  high=max, low=min, close=last, volume=sum within each bucket. Assumes
 *  `bars` is sorted ascending by time. A no-op if `interval` isn't coarser
 *  than the bars' own granularity (bucketKey falls through to 1:1). */
export function resampleBars(bars: OHLCBar[], interval: Interval): OHLCBar[] {
  if (bars.length === 0) return bars
  const groups = new Map<string, OHLCBar[]>()
  for (const b of bars) {
    const k = bucketKey(b.timestamp, interval)
    const g = groups.get(k)
    if (g) g.push(b); else groups.set(k, [b])
  }
  const out: OHLCBar[] = []
  for (const g of groups.values()) {
    out.push({
      timestamp: g[0].timestamp,
      open: g[0].open,
      high: Math.max(...g.map(x => x.high)),
      low: Math.min(...g.map(x => x.low)),
      close: g[g.length - 1].close,
      volume: g.reduce((sum, x) => sum + x.volume, 0),
    })
  }
  return out
}

// Intraday ranges: keep the last N bars (matches the backend's own tail-trim
// for these ranges). Everything else: keep the last N calendar days.
const RANGE_TAIL_BARS: Partial<Record<Range, number>> = { '30M': 30, '1H': 60, '5H': 300 }
const RANGE_DAYS: Partial<Record<Range, number>> = {
  '1D': 1, '5D': 5, '1M': 31, '3M': 92, '6M': 183, '1Y': 366, '5Y': 1830,
}

/** Window bars for display per a preset range tab, clamped to whatever the
 *  dataset actually has (e.g. clicking "1Y" on a 3-month dataset just shows
 *  all 3 months -- it never tries to fetch more). */
export function windowBars(bars: OHLCBar[], range: Range): OHLCBar[] {
  if (bars.length === 0 || range === 'MAX' || range === 'NOW') return bars
  const tailN = RANGE_TAIL_BARS[range]
  if (tailN != null) return bars.slice(-tailN)
  if (range === 'YTD') {
    const lastYear = new Date(bars[bars.length - 1].timestamp).getUTCFullYear()
    const cutoff = Date.UTC(lastYear, 0, 1)
    return bars.filter(b => new Date(b.timestamp).getTime() >= cutoff)
  }
  const days = RANGE_DAYS[range]
  if (days == null) return bars
  const cutoff = new Date(bars[bars.length - 1].timestamp).getTime() - days * 86400000
  return bars.filter(b => new Date(b.timestamp).getTime() >= cutoff)
}

/** Filter bars to an explicit [start,end] date range (the custom date picker,
 *  bounded to the dataset's own start/end by the caller). */
export function filterByDateRange(bars: OHLCBar[], start: string, end: string): OHLCBar[] {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime() + 86400000 - 1 // inclusive of the end date
  return bars.filter(b => {
    const t = new Date(b.timestamp).getTime()
    return t >= startMs && t <= endMs
  })
}

/** Window an already-computed indicator series the same way as windowBars,
 *  by matching against the windowed bars' time range (so price + indicators
 *  stay aligned after either range-tab windowing or a custom date filter). */
export function windowSeries<T extends { time: string[]; values: (number | null)[] }>(
  series: T, windowedBars: OHLCBar[],
): T {
  if (windowedBars.length === 0) return { ...series, time: [], values: [] }
  const startMs = new Date(windowedBars[0].timestamp).getTime()
  const endMs = new Date(windowedBars[windowedBars.length - 1].timestamp).getTime()
  const keep: number[] = []
  for (let i = 0; i < series.time.length; i++) {
    const t = new Date(series.time[i]).getTime()
    if (t >= startMs && t <= endMs) keep.push(i)
  }
  return { ...series, time: keep.map(i => series.time[i]), values: keep.map(i => series.values[i]) }
}
