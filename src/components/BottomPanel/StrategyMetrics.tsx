import { useState } from 'react'
import { runStrategy } from '../../api/execution'
import { useStrategyStatus } from '../../hooks/useStrategyStatus'
import type { Strategy } from '../../types'

const BADGE: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-400',
  running: 'bg-yellow-900 text-yellow-400',
  completed: 'bg-green-900 text-green-400',
  error: 'bg-red-900 text-red-400',
}

export function StrategyMetrics({ strategy }: { strategy: Strategy | null }) {
  const isWorkspace = strategy?.source === 'workspace'
  // Workspace (IDE) strategies aren't in the run-store, so don't poll status for
  // them (that 404s as "Strategy not found").
  const { status, refetch } = useStrategyStatus(isWorkspace ? null : strategy?.id ?? null)
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

  // IDE-authored strategy: observe-only for now (backtest/live charting WIP).
  if (isWorkspace) return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate mr-2">{strategy.name}</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-400 flex-shrink-0">observe-only</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        Authored in the IDE (<code className="text-gray-400">{strategy.dir_path}</code>).
        Backtest &amp; live charting are being wired up — open it in the IDE to edit the logic.
      </p>
    </div>
  )

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
