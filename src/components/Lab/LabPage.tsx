import { StockChart } from '../Chart/StockChart'
import { DatasetTable } from '../BottomPanel/DatasetTable'
import { DatasetBacktestPanel } from '../BottomPanel/DatasetBacktestPanel'
import type { DatasetMeta, BacktestMeta } from '../../api/datasets'
import type { Range } from '../../types'

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 3h6M10 3v5.5L5.5 17a2 2 0 001.8 3h9.4a2 2 0 001.8-3L14 8.5V3" />
    </svg>
  )
}

interface Props {
  isMobile: boolean
  dataset: DatasetMeta | null
  backtest: BacktestMeta | null
  onReplayCutoff: (ts: string | null) => void
}

/** The Lab Platform's own page. Replaces the Trading Platform's TopPanel +
 *  StockChart + BottomPanel stack entirely (rather than repurposing pieces of
 *  it in place) -- a distinct violet-accented header, a bigger chart area, and
 *  a dedicated data/backtest row below it, so switching into Lab mode reads
 *  as navigating to a different page, not a reskinned trading view. */
export function LabPage({ isMobile, dataset, backtest, onReplayCutoff }: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Distinct header -- violet accent marks this as a different mode than
          the Trading Platform's blue. */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-violet-600/60 bg-panel flex-shrink-0">
        <FlaskIcon className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-bold text-violet-300 tracking-wide">Lab Platform</span>
        {dataset && (
          <span className="text-xs text-gray-500 ml-2 truncate">
            {dataset.ticker} · {dataset.start} → {dataset.end} · {dataset.interval}
            {backtest && <span className="text-violet-400"> · {backtest.strategy_slug}</span>}
          </span>
        )}
      </div>

      {!dataset ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs px-4">
            <FlaskIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No dataset selected</p>
            <p className="text-xs text-gray-600 mt-1">Create or pick a ready dataset in the Navigator to get started</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col flex-1 min-h-0">
            <StockChart
              isMobile={isMobile}
              ticker={dataset.ticker}
              range={'1M' as Range}
              onRangeChange={() => {}}
              onReplayCutoff={onReplayCutoff}
              dataset={dataset}
              datasetBacktest={backtest}
            />
          </div>
          <div className="h-72 flex-shrink-0 border-t border-border flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 min-h-0 lg:border-r border-border overflow-hidden">
              <DatasetTable dataset={dataset} />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <DatasetBacktestPanel backtest={backtest} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
