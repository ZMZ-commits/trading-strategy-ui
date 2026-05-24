import { useResizable } from '../../hooks/useResizable'
import { StockDetails } from './StockDetails'
import { StrategyMetrics } from './StrategyMetrics'
import type { Strategy } from '../../types'

interface Props { ticker: string; selectedStrategy: Strategy | null }

export function BottomPanel({ ticker, selectedStrategy }: Props) {
  const { height, onDragHandleMouseDown } = useResizable(240)

  return (
    <div style={{ height }} className="flex flex-col flex-shrink-0 bg-panel overflow-hidden">
      <div
        onMouseDown={onDragHandleMouseDown}
        className="h-1.5 w-full cursor-ns-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize"
      />
      <div className="flex flex-1 min-h-0 divide-x divide-border overflow-hidden">
        <StockDetails ticker={ticker} />
        <StrategyMetrics strategy={selectedStrategy} />
      </div>
    </div>
  )
}
