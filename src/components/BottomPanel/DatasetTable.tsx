import { useState, useEffect } from 'react'
import { getDatasetBars, type DatasetMeta } from '../../api/datasets'
import type { OHLCBar } from '../../types'

interface Props {
  dataset: DatasetMeta
  /** Clamp displayed rows to the chart's currently active range-tab/custom-
   *  window cutoff (native-granularity timestamps), instead of every stored row. */
  windowStart?: string | null
  windowEnd?: string | null
}

/** Lab Platform: a scrollable raw-row view of a stored dataset's OHLCV bars. */
export function DatasetTable({ dataset, windowStart, windowEnd }: Props) {
  const [bars, setBars] = useState<OHLCBar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getDatasetBars(dataset.id)
      .then(b => { if (!cancelled) setBars(b) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dataset.id])

  const displayBars = windowStart && windowEnd
    ? bars.filter(b => b.timestamp >= windowStart && b.timestamp <= windowEnd)
    : bars

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
          {dataset.ticker}{' '}
          <span className="text-gray-600 normal-case">
            · {displayBars.length === bars.length ? `${bars.length} rows` : `${displayBars.length} of ${bars.length} rows`}
          </span>
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {loading ? (
          <p className="px-3 py-2 text-xs text-gray-600">Loading…</p>
        ) : error ? (
          <p className="px-3 py-2 text-xs text-red-400">{error}</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-[9px] uppercase tracking-wide text-gray-600">
                <th className="text-left font-medium px-3 py-1">Time</th>
                <th className="text-right font-medium px-1.5 py-1">Open</th>
                <th className="text-right font-medium px-1.5 py-1">High</th>
                <th className="text-right font-medium px-1.5 py-1">Low</th>
                <th className="text-right font-medium px-1.5 py-1">Close</th>
                <th className="text-right font-medium px-3 py-1">Volume</th>
              </tr>
            </thead>
            <tbody>
              {displayBars.map((b, i) => (
                <tr key={i} className="border-t border-border/30 font-mono">
                  <td className="px-3 py-0.5 text-gray-500 whitespace-nowrap">{b.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-1.5 py-0.5 text-right text-gray-300">{b.open.toFixed(2)}</td>
                  <td className="px-1.5 py-0.5 text-right text-gray-300">{b.high.toFixed(2)}</td>
                  <td className="px-1.5 py-0.5 text-right text-gray-300">{b.low.toFixed(2)}</td>
                  <td className="px-1.5 py-0.5 text-right text-gray-300">{b.close.toFixed(2)}</td>
                  <td className="px-3 py-0.5 text-right text-gray-500">{b.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
