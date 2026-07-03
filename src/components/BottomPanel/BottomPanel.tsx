import { useState } from 'react'
import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { StockDetails } from './StockDetails'
import { StrategyMetrics } from './StrategyMetrics'
import { ResizeHandle } from '../common/ResizeHandle'
import type { Strategy, Range } from '../../types'

interface Props { isMobile?: boolean; ticker: string; range: Range; selectedStrategy: Strategy | null; replayCutoff?: string | null }

export function BottomPanel({ isMobile = false, ticker, range, selectedStrategy, replayCutoff }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const { height, onDragHandleMouseDown } = useResizable(240, 120, 'up', () => setCollapsed(true))
  const { width: leftWidth, onDragHandleMouseDown: onHSplitDown } = useHResizable(280)

  // ── Mobile/tablet: stack the two panels; no mouse-drag handles ──
  if (isMobile) {
    return (
      <div className="flex flex-col flex-shrink-0 bg-surface border-t border-border">
        <div className="border-b border-border" style={{ height: 250 }}>
          <StockDetails ticker={ticker} />
        </div>
        <div className="flex flex-col" style={{ height: 280 }}>
          <StrategyMetrics strategy={selectedStrategy} ticker={ticker} range={range} cutoff={replayCutoff} />
        </div>
      </div>
    )
  }

  return (
    // The toggle is pinned to the bottom-right (a fixed edge), so it stays in
    // the same spot whether expanded or collapsed — only its chevron flips.
    <div
      style={collapsed ? undefined : { height }}
      className={`relative flex flex-col flex-shrink-0 bg-surface border-t border-border ${collapsed ? 'h-7' : ''}`}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand bottom panel' : 'Collapse bottom panel'}
        title={collapsed ? 'Expand' : 'Collapse'}
        className="absolute right-1.5 bottom-1 z-20 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-200"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {collapsed ? (
        <div className="flex items-center h-7 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Details &amp; Metrics</span>
        </div>
      ) : (
      <>
      <ResizeHandle orientation="horizontal" onMouseDown={onDragHandleMouseDown} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: leftWidth, minWidth: 150 }} className="flex-shrink-0 overflow-hidden">
          <StockDetails ticker={ticker} />
        </div>
        <ResizeHandle orientation="vertical" onMouseDown={onHSplitDown} title="Drag to resize horizontally" />
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <StrategyMetrics strategy={selectedStrategy} ticker={ticker} range={range} cutoff={replayCutoff} />
        </div>
      </div>
      </>
      )}
    </div>
  )
}
