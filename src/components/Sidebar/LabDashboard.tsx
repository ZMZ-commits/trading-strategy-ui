import { useState, useEffect, useCallback } from 'react'
import {
  createDataset, listDatasets, cancelDataset, deleteDataset,
  createBacktest, listBacktests, cancelBacktest,
  type DatasetMeta, type BacktestMeta,
} from '../../api/datasets'
import { listItems } from '../../api/workspace'
import type { Interval } from '../../types'

const INTERVALS: Interval[] = ['1m', '1h', '1d', '1w', '1mo']
const POLL_MS = 2000

function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-400',
  running: 'bg-yellow-900 text-yellow-400',
  ready: 'bg-green-900 text-green-400',
  completed: 'bg-green-900 text-green-400',
  error: 'bg-red-900 text-red-400',
  cancelled: 'bg-gray-700 text-gray-500',
}

function StatusBadge({ status, progress }: { status: string; progress?: { done: number; total: number } }) {
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}{status === 'running' && pct != null ? ` ${pct}%` : ''}
    </span>
  )
}

/** Lab Platform: create a durable, server-stored OHLCV dataset (ticker + date
 *  range + granularity), watch the pull job's progress, then configure and run
 *  a workspace strategy against it as a tracked backtest job. Selecting a
 *  ready dataset (or a completed backtest) reports up to App, which switches
 *  the main chart + bottom panel into "dataset mode" to display it. */
export function LabDashboard({
  defaultTicker,
  activeDatasetId,
  onSelectDataset,
  activeBacktestId,
  onSelectBacktest,
}: {
  defaultTicker: string
  activeDatasetId: string | null
  onSelectDataset: (d: DatasetMeta | null) => void
  activeBacktestId: string | null
  onSelectBacktest: (b: BacktestMeta | null) => void
}) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([])
  const [strategies, setStrategies] = useState<string[]>([])
  const [backtests, setBacktests] = useState<BacktestMeta[]>([])
  const [strategySlug, setStrategySlug] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [ticker, setTicker] = useState(defaultTicker)
  const [start, setStart] = useState(todayISO(-90))
  const [end, setEnd] = useState(todayISO())
  const [interval, setInterval_] = useState<Interval>('1d')
  const [creating, setCreating] = useState(false)

  const refreshDatasets = useCallback(() => { listDatasets().then(setDatasets).catch(() => {}) }, [])
  useEffect(() => {
    refreshDatasets()
    const id = window.setInterval(refreshDatasets, POLL_MS)
    return () => window.clearInterval(id)
  }, [refreshDatasets])

  useEffect(() => { listItems().then(d => setStrategies(d.strategies)).catch(() => {}) }, [])

  const refreshBacktests = useCallback(() => {
    if (!activeDatasetId) { setBacktests([]); return }
    listBacktests(activeDatasetId).then(setBacktests).catch(() => {})
  }, [activeDatasetId])
  useEffect(() => {
    refreshBacktests()
    const id = window.setInterval(refreshBacktests, POLL_MS)
    return () => window.clearInterval(id)
  }, [refreshBacktests])

  const activeDataset = datasets.find(d => d.id === activeDatasetId) ?? null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim() || !start || !end) return
    setCreating(true); setError(null)
    try {
      await createDataset(ticker.trim().toUpperCase(), start, end, interval)
      refreshDatasets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset')
    } finally {
      setCreating(false)
    }
  }

  const handleRunBacktest = async () => {
    if (!activeDatasetId || !strategySlug) return
    try {
      const bt = await createBacktest(activeDatasetId, strategySlug)
      refreshBacktests()
      onSelectBacktest(bt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start backtest')
    }
  }

  const selectDataset = (d: DatasetMeta) => {
    onSelectDataset(d.id === activeDatasetId ? null : d)
    onSelectBacktest(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── Create dataset ── */}
        <div className="p-3 border-b border-border space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">New dataset</p>
          <form onSubmit={handleCreate} className="space-y-1.5">
            <input
              value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker"
              className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-gray-100 uppercase"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="date" value={start} onChange={e => setStart(e.target.value)}
                className="flex-1 min-w-0 bg-surface border border-border rounded px-1.5 py-1 text-[11px] text-gray-200"
              />
              <span className="text-gray-600 text-[10px]">to</span>
              <input
                type="date" value={end} onChange={e => setEnd(e.target.value)}
                className="flex-1 min-w-0 bg-surface border border-border rounded px-1.5 py-1 text-[11px] text-gray-200"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={interval} onChange={e => setInterval_(e.target.value as Interval)}
                className="flex-1 bg-surface border border-border rounded px-1.5 py-1 text-xs text-gray-200"
              >
                {INTERVALS.map(iv => <option key={iv} value={iv}>{iv}</option>)}
              </select>
              <button
                type="submit" disabled={creating}
                className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium flex-shrink-0"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        {/* ── Dataset list ── */}
        <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
          Datasets {datasets.length > 0 && <span className="text-gray-700">({datasets.length})</span>}
        </div>
        {datasets.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-gray-600">None yet — create one above</p>
        ) : (
          <ul>
            {datasets.map(d => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => d.status === 'ready' && selectDataset(d)}
                  disabled={d.status !== 'ready'}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${
                    d.id === activeDatasetId ? 'bg-blue-600/20' : d.status === 'ready' ? 'hover:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-xs font-semibold truncate ${d.id === activeDatasetId ? 'text-blue-300' : 'text-gray-300'}`}>
                      {d.ticker}
                    </span>
                    <StatusBadge status={d.status} progress={d.progress} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-600 truncate">{d.start} → {d.end} · {d.interval}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {d.row_count > 0 && <span className="text-[10px] text-gray-600">{d.row_count} rows</span>}
                      {(d.status === 'pending' || d.status === 'running') && (
                        <span
                          role="button" tabIndex={-1}
                          onClick={e => { e.stopPropagation(); cancelDataset(d.id).then(refreshDatasets) }}
                          className="text-[10px] text-amber-500 hover:text-amber-300"
                        >cancel</span>
                      )}
                      <span
                        role="button" tabIndex={-1}
                        onClick={e => {
                          e.stopPropagation()
                          if (window.confirm(`Delete dataset "${d.ticker} ${d.start}→${d.end}"?`)) {
                            if (d.id === activeDatasetId) onSelectDataset(null)
                            deleteDataset(d.id).then(refreshDatasets)
                          }
                        }}
                        className="text-[10px] text-gray-600 hover:text-red-400"
                      >delete</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* ── Backtest runner + history (for the active dataset) ── */}
        {activeDataset && (
          <div className="border-t border-border mt-2">
            <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
              Backtest — {activeDataset.ticker}
            </div>
            <div className="px-3 pb-2 flex items-center gap-1.5">
              <select
                value={strategySlug} onChange={e => setStrategySlug(e.target.value)}
                className="flex-1 bg-surface border border-border rounded px-1.5 py-1 text-xs text-gray-200"
              >
                <option value="">Select strategy…</option>
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={handleRunBacktest} disabled={!strategySlug}
                className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium flex-shrink-0"
              >
                Run
              </button>
            </div>
            {backtests.length === 0 ? (
              <p className="px-3 pb-2 text-[11px] text-gray-600">No runs yet</p>
            ) : (
              <ul className="pb-2">
                {backtests.map(b => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => b.status === 'completed' && onSelectBacktest(b.id === activeBacktestId ? null : b)}
                      disabled={b.status !== 'completed'}
                      className={`w-full flex items-center justify-between gap-1.5 text-left px-3 py-1.5 transition-colors ${
                        b.id === activeBacktestId ? 'bg-blue-600/20' : b.status === 'completed' ? 'hover:bg-gray-700' : ''
                      }`}
                    >
                      <span className={`text-xs truncate ${b.id === activeBacktestId ? 'text-blue-300' : 'text-gray-300'}`}>
                        {b.strategy_slug}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {b.result && (
                          <span className={`text-[11px] font-mono ${b.result.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {b.result.pnl >= 0 ? '+' : ''}${b.result.pnl.toFixed(2)}
                          </span>
                        )}
                        <StatusBadge status={b.status} />
                        {(b.status === 'pending' || b.status === 'running') && (
                          <span
                            role="button" tabIndex={-1}
                            onClick={e => { e.stopPropagation(); cancelBacktest(activeDataset.id, b.id).then(refreshBacktests) }}
                            className="text-[10px] text-amber-500 hover:text-amber-300"
                          >cancel</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] text-gray-600 border-t border-border flex-shrink-0">
        Idealized backtests: no fees/slippage. Per-share P&amp;L.
      </div>
    </div>
  )
}
