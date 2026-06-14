import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { StockDetails } from './StockDetails'
import { StrategyMetrics } from './StrategyMetrics'
import type { Strategy } from '../../types'

interface Props { isMobile?: boolean; ticker: string; selectedStrategy: Strategy | null }

export function BottomPanel({ isMobile = false, ticker, selectedStrategy }: Props) {
  const { height, onDragHandleMouseDown } = useResizable(240)
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

  return (
    <div style={{ height }} className="flex flex-col flex-shrink-0 bg-panel overflow-hidden">
      <div
        onMouseDown={onDragHandleMouseDown}
        className="h-1.5 w-full cursor-ns-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize vertically"
      />
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
