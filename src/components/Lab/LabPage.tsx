import { useState, useCallback } from 'react'
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
  // Range tabs act as a clamped window over the active dataset's own stored
  // bars (StockChart/windowBars already cap to whatever's actually available),
  // so this just needs to be real state -- not a Lab-wide concern beyond this page.
  const [range, setRange] = useState<Range>('1M')
  // The chart's currently displayed window (native-granularity bounds) --
  // reported up so the dataset row table and backtest transactions list
  // clamp to the exact same range-tab/custom-window cutoff as the chart.
  const [windowBounds, setWindowBounds] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const handleWindowChange = useCallback((start: string | null, end: string | null) => {
    setWindowBounds(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
  }, [])
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
        range={range}
        onRangeChange={setRange}
        onReplayCutoff={onReplayCutoff}
        dataset={dataset}
        datasetBacktest={backtest}
        onWindowChange={handleWindowChange}
      />
      <BottomPanel
        isMobile={isMobile}
        ticker={dataset?.ticker ?? ticker}
        range={range}
        selectedStrategy={null}
        dataset={dataset}
        datasetBacktest={backtest}
        windowStart={windowBounds.start}
        windowEnd={windowBounds.end}
      />
    </>
  )
}
