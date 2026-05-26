import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { StockDetails } from './StockDetails'
import { StrategyMetrics } from './StrategyMetrics'
import type { Strategy } from '../../types'

interface Props { ticker: string; selectedStrategy: Strategy | null }

export function BottomPanel({ ticker, selectedStrategy }: Props) {
  const { height, onDragHandleMouseDown } = useResizable(240)
  const { width: leftWidth, onDragHandleMouseDown: onHSplitDown } = useHResizable(280)

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
