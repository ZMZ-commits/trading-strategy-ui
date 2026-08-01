import type { OHLCBar } from '../types'
import type { LabelMark } from '../api/datasets'

export type ExportFormat = 'csv' | 'json'

interface Series { time: string[]; values: (number | null)[] }

export interface ExportInput {
  datasetName: string
  ticker: string
  interval: string
  bars: OHLCBar[]
  /** Indicator series keyed by name, as computed over the same bars. */
  indicators: Record<string, Series>
  /** Buy/sell marks from the label set being exported. */
  labels: LabelMark[]
  /** Signals from the selected backtest, if one is showing. */
  strategySignals?: { time: string; type: 'buy' | 'sell' }[]
  strategyName?: string | null
}

/** Align every series onto the bar timeline.
 *
 *  Indicators come back as parallel time/value arrays that may be shorter than
 *  the bars (a rolling window has no value until it fills), so they're indexed
 *  by timestamp rather than position -- lining them up by array index would
 *  silently shift every value once any series started late. */
function buildRows(input: ExportInput) {
  const indicatorNames = Object.keys(input.indicators).sort()

  const byName = new Map<string, Map<string, number | null>>()
  for (const name of indicatorNames) {
    const s = input.indicators[name]
    const m = new Map<string, number | null>()
    for (let i = 0; i < s.time.length; i++) m.set(s.time[i], s.values[i])
    byName.set(name, m)
  }

  // Marks and signals are keyed by instant, not string, because bars and
  // signals can carry different UTC offsets for the same moment.
  const ms = (t: string) => new Date(t).getTime()
  const labelAt = new Map<number, string>()
  for (const l of input.labels) labelAt.set(ms(l.time), l.type)
  const signalAt = new Map<number, string>()
  for (const s of input.strategySignals ?? []) signalAt.set(ms(s.time), s.type)

  return input.bars.map(b => {
    const row: Record<string, string | number> = {
      timestamp: b.timestamp,
      open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
    }
    for (const name of indicatorNames) {
      const v = byName.get(name)?.get(b.timestamp)
      row[name] = v == null ? '' : v
    }
    row.strategy_signal = signalAt.get(ms(b.timestamp)) ?? ''
    row.label = labelAt.get(ms(b.timestamp)) ?? ''
    return row
  })
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

function download(filename: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before dropping the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (s: string) => s.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'export'

/** Write the labelled dataset out: raw bars, the indicators that were on, the
 *  active strategy's signals, and the label set's marks -- one row per bar. */
export function exportLabelledDataset(input: ExportInput, format: ExportFormat, labelSetName: string) {
  const rows = buildRows(input)
  const base = `${slug(input.ticker)}-${slug(labelSetName)}`

  if (format === 'csv') {
    download(`${base}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
    return rows.length
  }

  download(`${base}.json`, JSON.stringify({
    dataset: {
      name: input.datasetName,
      ticker: input.ticker,
      interval: input.interval,
      bars: input.bars.length,
    },
    label_set: labelSetName,
    indicators: Object.keys(input.indicators).sort(),
    strategy: input.strategyName ?? null,
    exported_at: new Date().toISOString(),
    rows,
  }, null, 2), 'application/json')
  return rows.length
}
