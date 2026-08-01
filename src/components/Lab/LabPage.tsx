import { useState, useCallback, useEffect, useRef } from 'react'
import { LabTopPanel } from './LabTopPanel'
import { StockChart } from '../Chart/StockChart'
import { BottomPanel } from '../BottomPanel/BottomPanel'
import { saveLabelMarks, type DatasetMeta, type BacktestMeta, type LabelSet, type LabelMark } from '../../api/datasets'
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
  const [range, setRange] = useState<Range>('MAX')
  // The chart's currently displayed window (native-granularity bounds) --
  // reported up so the dataset row table and backtest transactions list
  // clamp to the exact same range-tab/custom-window cutoff as the chart.
  const [windowBounds, setWindowBounds] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })

  // ── Labelling ──
  // The open set's marks live here while you work: the chart edits them, the
  // panel lists them, and they're flushed to the server on a short debounce so
  // marking several bars in a row is one write rather than one per click.
  const [labelSet, setLabelSet] = useState<LabelSet | null>(null)
  const [labelMarks, setLabelMarks] = useState<LabelMark[]>([])
  const saveTimer = useRef<number | null>(null)

  const openLabelSet = useCallback((set: LabelSet | null) => {
    setLabelSet(set)
    setLabelMarks(set?.marks ?? [])
  }, [])

  const handleMarksChange = useCallback((marks: LabelMark[]) => {
    setLabelMarks(marks)
    if (!labelSet) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveLabelMarks(labelSet.dataset_id, labelSet.id, marks).catch(() => {})
    }, 600)
  }, [labelSet])

  // Switching dataset closes whatever set was open -- a set belongs to one
  // dataset, so keeping it open would let you mark bars it doesn't contain.
  useEffect(() => { setLabelSet(null); setLabelMarks([]) }, [dataset?.id])
  const handleWindowChange = useCallback((start: string | null, end: string | null) => {
    setWindowBounds(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
  }, [])
  // Selecting a dataset (or switching to a different one) always starts from
  // its full start-to-end span, rather than carrying over whatever range tab
  // or custom window a previous dataset was left on.
  useEffect(() => { setRange('MAX'); setWindowBounds({ start: null, end: null }) }, [dataset?.id])
  return (
    <>
      <LabTopPanel
        isMobile={isMobile}
        defaultTicker={ticker}
        activeDatasetId={dataset?.id ?? null}
        onSelectDataset={onSelectDataset}
        activeBacktestId={backtest?.id ?? null}
        onSelectBacktest={onSelectBacktest}
        activeLabelSetId={labelSet?.id ?? null}
        onOpenLabelSet={openLabelSet}
        labelMarkCount={labelMarks.length}
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
        labMode
        labelMarks={labelSet ? labelMarks : undefined}
        onLabelMarksChange={labelSet ? handleMarksChange : undefined}
        labelSetName={labelSet?.name ?? null}
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
        labMode
      />
    </>
  )
}
