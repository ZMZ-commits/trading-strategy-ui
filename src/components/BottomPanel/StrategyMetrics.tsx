import { useState } from 'react'
import { runStrategy } from '../../api/execution'
import { useStrategyStatus } from '../../hooks/useStrategyStatus'
import { useStrategyChart } from '../../hooks/useStrategyChart'
import type { Strategy, Range } from '../../types'

const BADGE: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-400',
  running: 'bg-yellow-900 text-yellow-400',
  completed: 'bg-green-900 text-green-400',
  error: 'bg-red-900 text-red-400',
}

interface Props {
  strategy: Strategy | null
  ticker: string
  range: Range
  /** During replay, only show trades up to this bar time (null = show all). */
  cutoff?: string | null
}

export function StrategyMetrics({ strategy, ticker, range, cutoff }: Props) {
  const isWorkspace = strategy?.source === 'workspace'
  // Workspace (IDE) strategies aren't in the run-store, so don't poll status for
  // them (that 404s as "Strategy not found"); instead we pull their buy/sell
  // signals from the strategy runner for the current ticker + range.
  const { status, refetch } = useStrategyStatus(isWorkspace ? null : strategy?.id ?? null)
  const chart = useStrategyChart(ticker, range, isWorkspace ? (strategy?.slug ?? null) : null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!strategy) return
    setRunning(true); setRunError(null)
    try { await runStrategy(strategy.id); refetch() }
    catch (e) { setRunError((e as Error).message) }
    finally { setRunning(false) }
  }

  if (!strategy) return (
    <div className="flex-1 p-4 flex items-center justify-center">
      <p className="text-xs text-gray-600">Select a strategy to view metrics</p>
    </div>
  )

  // IDE-authored strategy: show its buy/sell transactions + total P&L (per share).
  if (isWorkspace) {
    // During replay only count trades up to the playhead, so the list + total
    // build up live as the replay plays.
    const cutoffMs = cutoff ? new Date(cutoff).getTime() : Infinity
    const visible = chart.signals.filter(s => new Date(s.time).getTime() <= cutoffMs)
    let lastBuy: number | null = null
    let total = 0
    let trades = 0
    const rows = visible.map((s, i) => {
      let pnl: number | null = null
      if (s.type === 'buy') lastBuy = s.price
      else if (s.type === 'sell' && lastBuy != null) { pnl = s.price - lastBuy; total += pnl; trades++; lastBuy = null }
      return { key: i, time: s.time, type: s.type, price: s.price, pnl }
    })
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate mr-2">{strategy.name}</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-400 flex-shrink-0">observe-only</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {rows.length === 0 ? (
            <p className="text-xs text-gray-600">{cutoff ? 'No trades yet' : 'No trades in this window'}</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-gray-600">
                  <th className="text-left font-medium pb-1">Date</th>
                  <th className="text-left font-medium pb-1">Side</th>
                  <th className="text-right font-medium pb-1">Price</th>
                  <th className="text-right font-medium pb-1">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key} className="border-t border-border/40">
                    <td className="py-1 text-gray-500 whitespace-nowrap">{new Date(r.time).toLocaleDateString()}</td>
                    <td className="py-1">
                      <span className={`font-semibold ${r.type === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                        {r.type === 'buy' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="py-1 text-right font-mono text-gray-300">${r.price.toFixed(2)}</td>
                    <td className="py-1 text-right font-mono">
                      {r.pnl != null && (
                        <span className={r.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.pnl >= 0 ? '+' : ''}{r.pnl.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Total pinned at the bottom */}
        <div className="border-t border-border pt-2 mt-2 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            Total P&amp;L <span className="text-gray-600">· {trades} trade{trades === 1 ? '' : 's'} · per share</span>
          </span>
          <span className={`text-sm font-mono font-semibold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {total >= 0 ? '+' : ''}${total.toFixed(2)}
          </span>
        </div>
      </div>
    )
  }

  const state = status?.state ?? 'idle'

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate mr-2">{strategy.name}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${BADGE[state]}`}>{state}</span>
      </div>
      <button
        onClick={handleRun} disabled={running || state === 'running'}
        className="mb-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors"
      >
        {running ? 'Starting...' : 'Run Strategy'}
      </button>
      {runError && <p className="text-xs text-red-400 mb-2">{runError}</p>}
      <p className="text-xs text-gray-500 mb-2">Transactions</p>
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
        {(status?.transactions ?? []).length === 0
          ? <p className="text-xs text-gray-600">No transactions yet</p>
          : [...(status?.transactions ?? [])].reverse().map(t => (
              <div key={t.id} className="text-xs p-2 rounded bg-surface border border-border">
                <span className="text-gray-500 mr-2">{new Date(t.timestamp).toLocaleTimeString()}</span>
                <span className={t.type === 'error' ? 'text-red-400' : t.type === 'order' ? 'text-green-400' : 'text-blue-400'}>[{t.type}]</span>
                <span className="text-gray-300 ml-2">{t.message}</span>
              </div>
            ))
        }
      </div>
    </div>
  )
}
