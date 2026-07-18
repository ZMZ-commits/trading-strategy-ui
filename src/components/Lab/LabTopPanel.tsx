import { useState, useEffect, useCallback } from 'react'
import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { ResizeHandle } from '../common/ResizeHandle'
import {
  createDataset, listDatasets, cancelDataset, deleteDataset,
  createBacktest, listBacktests, cancelBacktest, deleteBacktest,
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
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}{status === 'running' && pct != null ? ` ${pct}%` : ''}
    </span>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="px-2.5 py-1 border-b border-border/50 flex-shrink-0 bg-surface/30">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{text}</p>
    </div>
  )
}

interface Props {
  isMobile?: boolean
  defaultTicker: string
  activeDatasetId: string | null
  onSelectDataset: (d: DatasetMeta | null) => void
  activeBacktestId: string | null
  onSelectBacktest: (b: BacktestMeta | null) => void
}

/** Lab Platform's top expansion (mirrors TopPanel's collapsible/resizable
 *  column layout): create datasets, browse all of them, and manage the
 *  selected dataset's strategy runs -- all in one wide, dedicated area instead
 *  of the cramped right Navigator. */
export function LabTopPanel({
  isMobile = false, defaultTicker, activeDatasetId, onSelectDataset, activeBacktestId, onSelectBacktest,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const { height, onDragHandleMouseDown: onVResize } = useResizable(220, 52, 'down', () => setCollapsed(true))
  const { width: leftW, onDragHandleMouseDown: onLeftDrag } = useHResizable(220, 160)
  const { width: midW, onDragHandleMouseDown: onMidDrag } = useHResizable(340, 200)

  const [datasets, setDatasets] = useState<DatasetMeta[]>([])
  const [strategies, setStrategies] = useState<string[]>([])
  const [backtests, setBacktests] = useState<BacktestMeta[]>([])
  const [strategySlug, setStrategySlug] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
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
      await createDataset(ticker.trim().toUpperCase(), start, end, interval, name.trim())
      setName('')
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

  // ── New Dataset column ──
  const newDatasetColumn = (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionLabel text="New Dataset" />
      <form onSubmit={handleCreate} className="p-2 space-y-1.5 overflow-y-auto scrollbar-thin">
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)"
          className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-gray-100"
        />
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
        <select
          value={interval} onChange={e => setInterval_(e.target.value as Interval)}
          className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs text-gray-200"
        >
          {INTERVALS.map(iv => <option key={iv} value={iv}>{iv}</option>)}
        </select>
        <button
          type="submit" disabled={creating}
          className="w-full py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </form>
    </div>
  )

  // ── Datasets browse column ──
  const datasetsColumn = (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionLabel text={`Datasets${datasets.length ? ` (${datasets.length})` : ''}`} />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {datasets.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-gray-600">None yet — create one to the left</p>
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
                      {d.name || d.ticker}
                    </span>
                    <StatusBadge status={d.status} progress={d.progress} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-600 truncate">{d.ticker} · {d.start} → {d.end} · {d.interval}</span>
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
                          if (window.confirm(`Delete dataset "${d.name || d.ticker}"?`)) {
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
      </div>
    </div>
  )

  // ── Strategies column (for the active dataset) ──
  const strategiesColumn = (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionLabel text={activeDataset ? `Strategies — ${activeDataset.ticker}` : 'Strategies'} />
      {!activeDataset ? (
        <p className="px-3 py-2 text-[11px] text-gray-600">Select a ready dataset to run a strategy against it</p>
      ) : (
        <>
          <div className="p-2 flex items-center gap-1.5 border-b border-border/50 flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {backtests.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-gray-600">No runs yet</p>
            ) : (
              <ul>
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
                        <span
                          role="button" tabIndex={-1}
                          onClick={e => {
                            e.stopPropagation()
                            if (window.confirm(`Delete this ${b.strategy_slug} run?`)) {
                              if (b.id === activeBacktestId) onSelectBacktest(null)
                              deleteBacktest(activeDataset.id, b.id).then(refreshBacktests)
                            }
                          }}
                          className="text-[10px] text-gray-600 hover:text-red-400"
                        >delete</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )

  // ── Mobile: stack the three sections; no mouse-drag dividers ──
  if (isMobile) {
    return (
      <div className="flex flex-col flex-shrink-0 bg-panel border-b border-border">
        <div className="max-h-56 overflow-hidden border-b border-border/50">{newDatasetColumn}</div>
        <div className="max-h-56 overflow-hidden border-b border-border/50">{datasetsColumn}</div>
        <div className="max-h-56 overflow-hidden">{strategiesColumn}</div>
      </div>
    )
  }

  return (
    // Same pinned-toggle pattern as TopPanel: stays in the same spot whether
    // expanded or collapsed, only the chevron flips.
    <div
      style={collapsed ? undefined : { height }}
      className={`relative flex flex-col flex-shrink-0 bg-panel border-b border-border ${collapsed ? 'h-7' : ''}`}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand top panel' : 'Collapse top panel'}
        title={collapsed ? 'Expand' : 'Collapse'}
        className="absolute right-1.5 top-1 z-20 p-1 rounded hover:bg-gray-700/80 text-gray-500 hover:text-gray-200"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {collapsed ? (
        <div className="flex items-center h-7 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Datasets &amp; Strategies</span>
        </div>
      ) : (
      <>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: leftW }} className="flex-shrink-0 overflow-hidden border-r border-border">
          {newDatasetColumn}
        </div>
        <ResizeHandle orientation="vertical" onMouseDown={onLeftDrag} />
        <div style={{ width: midW }} className="flex-shrink-0 overflow-hidden border-r border-border">
          {datasetsColumn}
        </div>
        <ResizeHandle orientation="vertical" onMouseDown={onMidDrag} />
        <div className="flex-1 min-w-[180px] overflow-hidden">
          {strategiesColumn}
        </div>
      </div>
      <ResizeHandle orientation="horizontal" onMouseDown={onVResize} title="Drag to resize panel height" />
      </>
      )}
    </div>
  )
}
