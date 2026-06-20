import { useState } from 'react'
import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { StockDetails } from './StockDetails'
import { StrategyMetrics } from './StrategyMetrics'
import type { Strategy } from '../../types'

interface Props { isMobile?: boolean; ticker: string; selectedStrategy: Strategy | null }

export function BottomPanel({ isMobile = false, ticker, selectedStrategy }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const { height, onDragHandleMouseDown } = useResizable(240, 120, 'up', () => setCollapsed(true))
  const { width: leftWidth, onDragHandleMouseDown: onHSplitDown } = useHResizable(280)

  // ── Mobile/tablet: stack the two panels; no mouse-drag handles ──
  if (isMobile) {
    return (
      <div className="flex flex-col flex-shrink-0 bg-panel border-t border-border">
        <div className="border-b border-border" style={{ height: 250 }}>
          <StockDetails ticker={ticker} />
        </div>
        <div style={{ height: 280 }}>
          <StrategyMetrics strategy={selectedStrategy} />
        </div>
      </div>
    )
  }

  // ── Collapsed: thin bar with an expand control ──
  if (collapsed) {
    return (
      <div className="flex items-center justify-between h-7 px-3 bg-panel border-t border-border flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Details &amp; Metrics</span>
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand bottom panel"
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div style={{ height }} className="relative flex flex-col flex-shrink-0 bg-panel overflow-hidden">
      <div
        onMouseDown={onDragHandleMouseDown}
        className="h-1.5 w-full cursor-ns-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize"
      />
      <button
        onClick={() => setCollapsed(true)}
        aria-label="Collapse bottom panel"
        className="absolute right-1.5 top-2 z-10 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-200"
        title="Collapse"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: leftWidth, minWidth: 150 }} className="flex-shrink-0 overflow-hidden">
          <StockDetails ticker={ticker} />
        </div>
        <div
          onMouseDown={onHSplitDown}
          className="w-1.5 cursor-ew-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0 h-full"
          title="Drag to resize horizontally"
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <StrategyMetrics strategy={selectedStrategy} />
        </div>
      </div>
    </div>
  )
}
