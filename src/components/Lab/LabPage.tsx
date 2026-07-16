import { LabTopPanel } from './LabTopPanel'
import { StockChart } from '../Chart/StockChart'
import { BottomPanel } from '../BottomPanel/BottomPanel'
import type { DatasetMeta, BacktestMeta } from '../../api/datasets'
import type { Range } from '../../types'

interface Props {
  isMobile: boolean
  ticker: string
  dataset: DatasetMeta | null
  onSelectDataset: (d: DatasetMeta | null) => void
  backtest: BacktestMeta | null
  onSelectBacktest: (b: BacktestMeta | null) => void
  onReplayCutoff: (ts: string | null) => void
}

/** The Lab Platform's own page. Mirrors the Trading Platform's structure
 *  (Top expansion + chart + Bottom expansion) exactly -- just with Lab
 *  content instead of live-trading content -- rather than a one-off layout,
 *  so switching modes feels like navigating to a different page while the
 *  app's overall skeleton (and the IDE/Navigator around it) stays familiar. */
export function LabPage({ isMobile, ticker, dataset, onSelectDataset, backtest, onSelectBacktest, onReplayCutoff }: Props) {
  return (
    <>
      <LabTopPanel
        isMobile={isMobile}
        defaultTicker={ticker}
        activeDatasetId={dataset?.id ?? null}
        onSelectDataset={onSelectDataset}
        activeBacktestId={backtest?.id ?? null}
        onSelectBacktest={onSelectBacktest}
      />
      <StockChart
        isMobile={isMobile}
        ticker={dataset?.ticker ?? ticker}
        range={'1M' as Range}
        onRangeChange={() => {}}
        onReplayCutoff={onReplayCutoff}
        dataset={dataset}
        datasetBacktest={backtest}
      />
      <BottomPanel
        isMobile={isMobile}
        ticker={dataset?.ticker ?? ticker}
        range={'1M' as Range}
        selectedStrategy={null}
        dataset={dataset}
        datasetBacktest={backtest}
      />
    </>
  )
}
