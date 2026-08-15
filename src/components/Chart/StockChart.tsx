import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { RangeTabs } from './RangeTabs'
import { LWChart, toTime } from './LWChart'
import { ReplayTransport } from './ReplayTransport'
import { DateRangePicker } from './DateRangePicker'
import { DatasetTimeScrubber } from './DatasetTimeScrubber'
import { DrawingLayer } from './drawing/DrawingLayer'
import { DrawingToolbar } from './drawing/DrawingToolbar'
import type { Shape, Tool } from './drawing/types'
import { ChunkProgress } from './ChunkProgress'
import { useStockData } from '../../hooks/useStockData'
import { useHistoryJob } from '../../hooks/useHistoryJob'
import { isLongPull, chunkCount } from '../../utils/intervalCoverage'
import { useLiveTicks } from '../../hooks/useLiveTicks'
import { useIndicators } from '../../hooks/useIndicators'
import { useCustomList, useCustomSeries } from '../../hooks/useCustomIndicators'
import { useStrategyChart } from '../../hooks/useStrategyChart'
import { getDatasetBars, computeIndicators, backtestToChartData, type DatasetMeta, type BacktestMeta, type LabelMark } from '../../api/datasets'
import { resampleBars, windowBars, filterByDateRange, availableIntervals } from '../../utils/ohlc'
import { useChartReadout } from '../../state/chartReadout'
import type { StrategyChartData } from '../../api/strategyChart'
import type { Range, Interval, OHLCBar, Strategy } from '../../types'

const EMPTY_STRATEGY_DATA: StrategyChartData = { lines: [], signals: [], logs: [], requires: [], pnl: 0 }

const ALL_INTERVALS: Interval[] = ['1s', '1m', '1h', '1d', '1w', '1mo']

// Which intervals are offered for each range (first entry = that range's
// default). Fine intervals are offered on the long ranges too and are charted
// as picked -- never swapped for something coarser. Where that takes several
// sequential fetches it runs behind a progress ring, and where the data simply
// doesn't go back as far as the range asks, the header says where it stops.
const RANGE_INTERVALS: Record<string, Interval[]> = {
  '30M': ['1m'],
  '1H':  ['1m'],
  '5H':  ['1m'],
  '1D':  ['1m', '1h'],
  '5D':  ['1h', '1d', '1m'],
  '1M':  ['1d', '1h', '1m'],
  '3M':  ['1d', '1h', '1m'],
  '6M':  ['1d', '1h', '1m'],
  'YTD': ['1d', '1w', '1h', '1m'],
  '1Y':  ['1d', '1w', '1h', '1m'],
  '5Y':  ['1w', '1d', '1mo', '1h', '1m'],
  'MAX': ['1mo', '1w', '1d', '1h', '1m'],
}

interface Props {
  isMobile?: boolean
  ticker: string
  range: Range
  onRangeChange: (r: Range) => void
  /** Workspace strategy selected in the Navigator — rendered on the chart. */
  selectedStrategy?: Strategy | null
  /** Reports the last-revealed bar timestamp during replay (null when off) so
   *  the metrics panel can show trades live. */
  onReplayCutoff?: (ts: string | null) => void
  /** Lab Platform: when set, the chart shows this stored dataset's bars
   *  instead of live ticker data, windowed by the same range/custom-window
   *  controls as live mode (clamped to what the dataset actually has). */
  dataset?: DatasetMeta | null
  /** A completed backtest run against `dataset`, overlaid the same way a live
   *  strategy is (dashed line + Buy/Sell markers). */
  datasetBacktest?: BacktestMeta | null
  /** Lab Platform: reports the currently displayed window's [start,end]
   *  bounds (native-granularity dataset timestamps, not resample buckets) so
   *  sibling panels -- the raw row table, the backtest transactions list --
   *  can clamp to the exact same cutoff as the chart. Null/null outside dataset mode. */
  onWindowChange?: (start: string | null, end: string | null) => void
  /** Lab Platform: true whenever this chart is rendered on the Lab page, even
   *  with no dataset selected yet. Without this, "no dataset" looks identical
   *  to plain Trading mode and the chart falls back to fetching/showing
   *  whatever ticker was last active there -- stale dashboard data leaking
   *  into a blank Lab page. When set and `dataset` is null, the chart renders
   *  a clean empty state instead of ever fetching live data. */
  labMode?: boolean
  /** Lab Platform: the label set currently open for editing, if any. When set,
   *  the toolbar arms a Buy/Sell brush and clicking the chart adds/removes a
   *  mark. Marks are held here and flushed upward, so the chart stays the one
   *  place that knows how to turn a click into a bar. */
  labelMarks?: LabelMark[]
  onLabelMarksChange?: (marks: LabelMark[]) => void
  labelSetName?: string | null
  /** Reports which built-in indicator studies are currently ticked, so an
   *  export can include exactly the indicators you were looking at. Only the
   *  names travel -- the values are recomputed against the full dataset at
   *  export time rather than the view's windowed slice. */
  onStudiesChange?: (studies: string[]) => void
  /** Lab Platform: hand-drawn annotations for the active dataset, plus a way
   *  to add to them. Held by the page (which persists them) so the chart only
   *  has to turn clicks into shapes. */
  drawings?: Shape[]
  onDrawingsChange?: (d: Shape[]) => void
}

const OVERLAY_ITEMS = [
  { id: 'sma20', label: 'SMA 20', study: 'sma20' },
  { id: 'sma50', label: 'SMA 50', study: 'sma50' },
  { id: 'sma200', label: 'SMA 200', study: 'sma200' },
  { id: 'ema20', label: 'EMA 20', study: 'ema20' },
  { id: 'bbands', label: 'Bollinger Bands', study: 'bbands' },
  { id: 'donchian', label: 'Donchian 20/10', study: 'donchian' },
  { id: 'vwap', label: 'VWAP', study: 'vwap' },
]
const OSC_ITEMS = [
  { id: 'rsi', label: 'RSI', study: 'rsi' },
  { id: 'macd', label: 'MACD', study: 'macd' },
  { id: 'squeeze', label: 'TTM Squeeze', study: 'squeeze' },
  { id: 'stoch', label: 'Stochastic', study: 'stoch' },
]
const ALL_ITEMS = [...OVERLAY_ITEMS, ...OSC_ITEMS]

const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8]

// Slice a {time, values} series to the first n points (for replay reveal).
function sliceSeries<T extends { time: string[]; values: (number | null)[] }>(s: T, n: number): T {
  return { ...s, time: s.time.slice(0, n), values: s.values.slice(0, n) }
}
function sliceIndicators<T extends Record<string, { time: string[]; values: (number | null)[] }>>(ind: T, n: number): T {
  const out = {} as T
  for (const k of Object.keys(ind) as (keyof T)[]) out[k] = sliceSeries(ind[k], n)
  return out
}

export function StockChart({
  isMobile = false, ticker, range, onRangeChange, selectedStrategy, onReplayCutoff, dataset, datasetBacktest,
  onWindowChange, labMode = false, labelMarks, onLabelMarksChange, labelSetName, onStudiesChange,
  drawings, onDrawingsChange,
}: Props) {
  const { setIdentity, setValues, floating, setFloating } = useChartReadout()
  const isDatasetMode = !!dataset
  const noDatasetSelected = labMode && !isDatasetMode
  const isLive = !isDatasetMode && !labMode && range === 'NOW'

  // Lab Platform: load the stored dataset's bars once when it's selected.
  // Live-data hooks below are fed an empty ticker in this mode so they skip
  // fetching (they already no-op on falsy ticker) -- the dataset's bars stand
  // in for chartData everywhere else (replay, header, LWChart).
  const [datasetBars, setDatasetBars] = useState<OHLCBar[]>([])
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  useEffect(() => {
    if (!dataset) { setDatasetBars([]); return }
    let cancelled = false
    setDatasetLoading(true); setDatasetError(null)
    getDatasetBars(dataset.id)
      .then(bars => { if (!cancelled) setDatasetBars(bars) })
      .catch(e => { if (!cancelled) setDatasetError(e instanceof Error ? e.message : 'Failed to load dataset') })
      .finally(() => { if (!cancelled) setDatasetLoading(false) })
    return () => { cancelled = true }
  }, [dataset])
  const liveTicker = (isDatasetMode || labMode) ? '' : ticker
  // In dataset mode you can only view at the dataset's own stored granularity
  // or something coarser (aggregated up) -- there's no live-range concept.
  const supportedIntervals = isDatasetMode ? availableIntervals(dataset!.interval) : (RANGE_INTERVALS[range] ?? [])
  const [intervalOverride, setIntervalOverride] = useState<Interval | undefined>(undefined)
  const [intervalOpen, setIntervalOpen] = useState(false)

  // Reset interval when range changes if the current override isn't supported.
  const effectiveInterval = supportedIntervals.includes(intervalOverride as Interval)
    ? intervalOverride
    : undefined

  // Custom date window: when set, data is fetched for [start,end] at cwin.interval
  // instead of the preset range.
  const [cwin, setCwin] = useState<{ start: string; end: string; interval: Interval } | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const [cIv, setCIv] = useState<Interval>('1d')
  const winStart = cwin?.start
  const winEnd = cwin?.end
  const dataInterval = cwin ? cwin.interval : effectiveInterval
  // Scrubber selection: a FOCUS window layered on top of whatever range/custom
  // window the candlesticks are showing. Deliberately kept separate from cwin
  // -- dragging the scrubber narrows which indicator/strategy data is shown
  // without ever re-windowing (or re-fitting) the candlesticks/volume
  // themselves, unlike range tabs / the calendar picker, which do move them.
  const [scrubWindow, setScrubWindow] = useState<{ start: string; end: string } | null>(null)
  // Selecting a different dataset always starts from its full span -- clear
  // any custom window/interval override left over from a previous dataset
  // (LabPage resets its own range state the same way for the same reason).
  useEffect(() => { setCwin(null); setIntervalOverride(undefined); setScrubWindow(null) }, [dataset?.id])
  // Custom window's own interval choices: in dataset mode, only the dataset's
  // native interval or coarser is actually viewable (mirrors supportedIntervals).
  const customIntervalOptions: Interval[] = isDatasetMode
    ? supportedIntervals
    : (['1d', '1h', '1w', '1mo'] as Interval[])

  const applyCustom = () => {
    if (!cFrom || !cTo) return
    setCwin({ start: cFrom, end: cTo, interval: cIv })
    setScrubWindow(null)
    setCustomOpen(false)
  }

  const handleRangeChange = (r: Range) => {
    setIntervalOverride(undefined)
    setCwin(null)
    setScrubWindow(null)
    onRangeChange(r)
  }

  // The requested interval is charted as-is -- never swapped for a coarser one.
  // Picking 1m on MAX charts 1m over however far back that data exists; the
  // fetch reports where it had to stop and the header says so.
  //
  // Fetches needing several sequential upstream requests run as a tracked job
  // with a progress ring; everything else stays on the plain single-request
  // path. A custom date window keeps its own existing fetch path.
  const longPull = !isDatasetMode && !isLive && !cwin && isLongPull(dataInterval, range)
  const job = useHistoryJob(liveTicker, range, dataInterval, longPull)

  const { data, loading, error } = useStockData(
    longPull ? '' : liveTicker, range, dataInterval, winStart, winEnd,
  )
  const { ticks, connected } = useLiveTicks(liveTicker, isLive && !isDatasetMode)

  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [showVolume, setShowVolume] = useState(true)
  const [showDayBands, setShowDayBands] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const studies = useMemo(() => {
    const set = new Set<string>()
    for (const id of selectedIds) {
      const it = ALL_ITEMS.find(i => i.id === id)
      if (it) set.add(it.study)
    }
    return [...set]
  }, [selectedIds])

  const studiesKey = studies.join(',')
  useEffect(() => {
    onStudiesChange?.(studiesKey ? studiesKey.split(',') : [])
    // Keyed on the joined string so an unchanged selection doesn't re-fire on
    // every render (the array identity changes, its contents don't).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studiesKey, onStudiesChange])

  const oscillators = useMemo(
    () => OSC_ITEMS.filter(o => selectedIds.includes(o.id)).map(o => o.id),
    [selectedIds],
  )

  // During a long pull the indicator endpoint would run its own separate fetch
  // and could disagree with the chunked bars we actually charted, so indicators
  // are computed from those exact bars instead (same approach as Lab datasets).
  const liveIndicators = useIndicators(
    longPull ? '' : liveTicker, range, studies, dataInterval, winStart, winEnd,
  )
  const [jobIndicators, setJobIndicators] = useState<Record<string, { time: string[]; values: (number | null)[] }>>({})
  useEffect(() => {
    if (!longPull || studies.length === 0 || job.bars.length === 0) { setJobIndicators({}); return }
    let cancelled = false
    computeIndicators(job.bars, studies)
      .then(ind => { if (!cancelled) setJobIndicators(ind) })
      .catch(() => { if (!cancelled) setJobIndicators({}) })
    return () => { cancelled = true }
  }, [longPull, job.bars, studies])

  // Custom (user-published) indicators: picker entries use id `custom:<slug>`.
  // Not offered in dataset mode yet (they run via the live sandbox path);
  // useCustomSeries already no-ops on the blank liveTicker there.
  const customList = useCustomList()
  const customSlugs = useMemo(
    () => selectedIds.filter(id => id.startsWith('custom:')).map(id => id.slice('custom:'.length)),
    [selectedIds],
  )
  const customSeries = useCustomSeries(liveTicker, range, customSlugs, dataInterval, winStart, winEnd)

  // Lab Platform: resample the dataset's FULL stored bars to the current
  // display interval (native or coarser), compute indicators over that FULL
  // resampled history (real warmup for long-lookback averages), then window
  // both bars and indicators together for display -- same warmup-then-trim
  // principle as live indicators, just applied to the dataset's own history
  // instead of a live yfinance fetch.
  const datasetResampled = useMemo(
    () => (isDatasetMode ? resampleBars(datasetBars, (dataInterval ?? dataset!.interval) as Interval) : []),
    [isDatasetMode, datasetBars, dataInterval, dataset],
  )
  const [datasetIndicatorsFull, setDatasetIndicatorsFull] =
    useState<Record<string, { time: string[]; values: (number | null)[] }>>({})
  useEffect(() => {
    if (!isDatasetMode || studies.length === 0 || datasetResampled.length === 0) { setDatasetIndicatorsFull({}); return }
    let cancelled = false
    computeIndicators(datasetResampled, studies)
      .then(ind => { if (!cancelled) setDatasetIndicatorsFull(ind) })
      .catch(() => { if (!cancelled) setDatasetIndicatorsFull({}) })
    return () => { cancelled = true }
  }, [isDatasetMode, datasetResampled, studies])
  // The selected window (range tab, custom dates, or the scrubber). This no
  // longer decides which bars EXIST -- the chart is handed the whole dataset --
  // it only decides where the view is placed. That is what makes 1D as freely
  // zoomable and pannable as MAX: previously the chart received ~390 bars and
  // had nothing to scroll to.
  const datasetDisplayBars = useMemo(() => {
    if (!isDatasetMode) return []
    if (winStart && winEnd) return filterByDateRange(datasetResampled, winStart, winEnd)
    return windowBars(datasetResampled, range)
  }, [isDatasetMode, datasetResampled, winStart, winEnd, range])
  const datasetRawWindow = useMemo(() => {
    if (!isDatasetMode) return []
    if (winStart && winEnd) return filterByDateRange(datasetBars, winStart, winEnd)
    return windowBars(datasetBars, range)
  }, [isDatasetMode, datasetBars, winStart, winEnd, range])

  // Bars of the selected window. Still needed by replay, which reveals a
  // window rather than the entire dataset.
  const focusWindowBars = useMemo(
    () => (scrubWindow ? filterByDateRange(datasetResampled, scrubWindow.start, scrubWindow.end) : datasetDisplayBars),
    [scrubWindow, datasetResampled, datasetDisplayBars],
  )

  // Where the chart should place its view when the window changes.
  const viewRange = useMemo(() => {
    if (!isDatasetMode) return null
    if (scrubWindow) return { from: scrubWindow.start, to: scrubWindow.end }
    const w = datasetDisplayBars
    if (w.length === 0) return null
    return { from: w[0].timestamp, to: w[w.length - 1].timestamp }
  }, [isDatasetMode, scrubWindow, datasetDisplayBars])

  // What the chart is ACTUALLY showing after any zoom/pan, reported back by
  // LWChart as real bar timestamps. Everything downstream follows this rather
  // than the tab that was clicked, so panning moves the tables with the view.
  const [visibleWindow, setVisibleWindow] = useState<{ start: string; end: string } | null>(null)
  const handleVisibleRange = useCallback((from: string | null, to: string | null) => {
    // Panning fully into the blank padding reports no bars. Hold the last real
    // window rather than snapping the scrubber back to the range tab.
    if (!from || !to) return
    setVisibleWindow({ start: from, end: to })
  }, [])
  useEffect(() => { setVisibleWindow(null) }, [dataset?.id])

  // Fall back to the selected window until the chart has reported one (first
  // paint), so nothing downstream sees a null window mid-mount.
  const effectiveWindow = useMemo(() => {
    if (!isDatasetMode) return null
    if (visibleWindow) return visibleWindow
    if (viewRange) return { start: viewRange.from, end: viewRange.to }
    return null
  }, [isDatasetMode, visibleWindow, viewRange])

  const focusRawWindow = useMemo(
    () => (effectiveWindow ? filterByDateRange(datasetBars, effectiveWindow.start, effectiveWindow.end) : datasetRawWindow),
    [effectiveWindow, datasetBars, datasetRawWindow],
  )
  useEffect(() => {
    if (!isDatasetMode) { onWindowChange?.(null, null); return }
    onWindowChange?.(
      focusRawWindow[0]?.timestamp ?? null,
      focusRawWindow[focusRawWindow.length - 1]?.timestamp ?? null,
    )
  }, [isDatasetMode, focusRawWindow, onWindowChange])
  const datasetDisplayIndicators = useMemo(() => {
    const out: Record<string, { time: string[]; values: (number | null)[] }> = {}
    if (!isDatasetMode) return out
    // Unwindowed on purpose: panning left past the range tab's window must not
    // run off the end of an indicator. They are computed over the full series
    // anyway, so there is nothing to trim to.
    for (const [k, s] of Object.entries(datasetIndicatorsFull)) out[k] = s
    return out
  }, [isDatasetMode, datasetIndicatorsFull])
  const indicators = isDatasetMode ? datasetDisplayIndicators : (longPull ? jobIndicators : liveIndicators)

  // The strategy shown on the chart follows the Navigator selection (a workspace
  // strategy), so it stays in sync with the metrics panel. In dataset mode the
  // overlay instead comes from the selected backtest run (converted below).
  const strategySlug = selectedStrategy?.source === 'workspace' ? selectedStrategy.slug : null
  const liveStrategyData = useStrategyChart(liveTicker, range, strategySlug, dataInterval, winStart, winEnd)
  const strategyData = isDatasetMode
    ? (datasetBacktest ? backtestToChartData(datasetBacktest) : EMPTY_STRATEGY_DATA)
    : liveStrategyData

  // A strategy's own ctx.plot() lines (e.g. an ATR reference a strategy
  // computes for itself) are listed in the Indicators picker's "Strategy"
  // section so they can be individually hidden while inspecting/authoring a
  // strategy, instead of being an opaque always-on overlay. Resets whenever
  // the active strategy/backtest itself changes, so a toggle doesn't
  // silently carry over to a different strategy's same-named line.
  const activeStrategyKey = isDatasetMode ? (datasetBacktest?.id ?? null) : strategySlug
  const [hiddenStrategyLines, setHiddenStrategyLines] = useState<Set<string>>(new Set())
  useEffect(() => { setHiddenStrategyLines(new Set()) }, [activeStrategyKey])
  const toggleStrategyLine = (name: string) =>
    setHiddenStrategyLines(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  // Clamp the strategy overlay (lines + buy/sell markers) to the same focus
  // window driving indicators, so both move together when the range/custom
  // window changes -- or when the scrubber narrows the focus without moving
  // the candlesticks. Live mode already gets pre-windowed data from the API
  // (winStart/winEnd query params), so this only applies in dataset mode.
  const visibleStrategyData = useMemo(() => {
    // Lines and markers are no longer clamped to the window. The chart holds
    // the whole dataset, so clamping would blank the strategy out the moment
    // you panned past the range tab's edge.
    const lines = strategyData.lines.filter(ln => !hiddenStrategyLines.has(ln.name))
    return { ...strategyData, lines }
  }, [strategyData, hiddenStrategyLines])

  // A strategy can declare the built-in indicators it uses (REQUIRES); tick them
  // on automatically when it's selected (like a mod bringing its dependencies),
  // and untick exactly those same ones again when the strategy is deselected (or
  // swapped for one with different requirements) -- otherwise the chart is left
  // showing extra indicators the user never asked for, and never returns to its
  // original look. Only ids we ourselves auto-added are ever removed; anything
  // the user ticked on manually is left alone.
  const reqKey = strategyData.requires.join(',')
  const prevReqRef = useRef<string[]>([])
  useEffect(() => {
    const req = reqKey ? reqKey.split(',').filter(Boolean) : []
    const prevReq = prevReqRef.current
    const noLongerRequired = prevReq.filter(r => !req.includes(r))
    const newlyRequired = req.filter(r => !prevReq.includes(r))
    if (newlyRequired.length || noLongerRequired.length) {
      setSelectedIds(prev => {
        const kept = prev.filter(id => !noLongerRequired.includes(id))
        const add = newlyRequired.filter(r => !kept.includes(r))
        return add.length ? [...kept, ...add] : kept
      })
    }
    prevReqRef.current = req
  }, [reqKey])

  // ── Replay: reveal bars from the left, with play/pause + speed. ──
  const [replayOn, setReplayOn] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [replayIdx, setReplayIdx] = useState(1)
  const [speed, setSpeed] = useState(2)

  // Live ticks → single-price bars; rendered as a line.
  const liveData: OHLCBar[] = ticks.map(t => ({
    timestamp: t.timestamp, open: t.price, high: t.price, low: t.price, close: t.price, volume: t.size,
  }))
  // Dataset mode charts the shared window, so the candles always sit under the
  // indicators/strategy drawn on top of them.
  const chartData = isDatasetMode ? datasetResampled : (isLive ? liveData : (longPull ? job.bars : data))
  const latest = chartData[chartData.length - 1]
  const effectiveType = isLive ? 'line' : chartType
  // Replay walks the SELECTED window, not the whole dataset -- replaying a day
  // you picked is the point of it.
  // Blank scroll room either side of the data, scaled to the dataset so it is
  // meaningful both zoomed in and at MAX.
  const blankPadBars = isDatasetMode
    ? Math.min(2000, Math.max(200, Math.round(chartData.length * 0.15)))
    : 0
  const replayBars = isDatasetMode ? focusWindowBars : chartData
  const fullLen = replayBars.length

  // Identifies the viewing window; the chart REPOSITIONS (not refits, since it
  // now holds the whole dataset) only when this changes -- switching ticker/
  // range/interval/custom dates, switching datasets, or sliding the scrubber.
  // Zoom is preserved for everything else (indicator/strategy toggles, replay).
  const fitKey = isDatasetMode
    ? `dataset:${dataset!.id}:${range}:${dataInterval ?? ''}:${winStart ?? ''}:${winEnd ?? ''}:${scrubWindow?.start ?? ''}:${scrubWindow?.end ?? ''}`
    : `${ticker}:${range}:${dataInterval ?? ''}:${winStart ?? ''}:${winEnd ?? ''}`

  // (Re)start replay when the window changes (including switching datasets)
  // or replay is toggled on.
  useEffect(() => {
    if (replayOn && !isLive) { setReplayIdx(1); setPlaying(true) }
    else setPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayOn, ticker, range, effectiveInterval, dataset?.id])

  // Advance the playhead at the chosen speed.
  useEffect(() => {
    if (!replayOn || !playing || isLive) return
    const id = window.setInterval(() => {
      setReplayIdx(i => (i >= fullLen ? i : i + 1))
    }, Math.max(30, 500 / speed))
    return () => window.clearInterval(id)
  }, [replayOn, playing, speed, fullLen, isLive])

  // Stop at the end.
  useEffect(() => {
    if (playing && replayIdx >= fullLen && fullLen > 0) setPlaying(false)
  }, [playing, replayIdx, fullLen])

  const revealN = replayOn && !isLive ? Math.min(replayIdx, fullLen) : fullLen
  const replaySlicing = replayOn && !isLive && revealN < fullLen
  const cutoffMs = replaySlicing && replayBars[revealN - 1]
    ? new Date(replayBars[revealN - 1].timestamp).getTime()
    : Infinity
  const displayData = replaySlicing ? replayBars.slice(0, revealN) : chartData
  const displayIndicators = replaySlicing ? sliceIndicators(indicators, revealN) : indicators
  const displayCustom = replaySlicing ? customSeries.map(s => sliceSeries(s, revealN)) : customSeries
  const displayStrategy = useMemo(() => {
    if (!replaySlicing || !visibleStrategyData) return visibleStrategyData
    return {
      ...visibleStrategyData,
      lines: visibleStrategyData.lines.map(ln => sliceSeries(ln, revealN)),
      signals: visibleStrategyData.signals.filter(s => new Date(s.time).getTime() <= cutoffMs),
    }
  }, [replaySlicing, revealN, cutoffMs, visibleStrategyData])

  // Report the replay playhead time so the metrics panel can show trades live.
  const replayCutoffTs = replaySlicing && displayData.length ? displayData[displayData.length - 1].timestamp : null
  useEffect(() => { onReplayCutoff?.(replayCutoffTs) }, [replayCutoffTs, onReplayCutoff])

  // Publish chart identity for the readout consumers (Market Insight panel and
  // the floating legend). Values come separately from LWChart's crosshair.
  const readoutTicker = isDatasetMode ? dataset!.ticker : noDatasetSelected ? '' : ticker
  const readoutMeta = isDatasetMode
    ? `${dataset!.start} → ${dataset!.end} · ${dataset!.interval}${datasetBacktest ? ` · ${datasetBacktest.strategy_slug}` : ''}`
    : (isLive ? 'live' : `${range}${dataInterval ? ` · ${dataInterval}` : ''}`)
  useEffect(() => {
    setIdentity({ ticker: readoutTicker, meta: readoutMeta, lastClose: latest ? latest.close : null })
  }, [readoutTicker, readoutMeta, latest, setIdentity])

  // ── Labelling: arm a side, then click bars to mark them. ──
  const [labelArmed, setLabelArmed] = useState(false)
  const [labelSide, setLabelSide] = useState<'buy' | 'sell'>('buy')
  const canLabel = isDatasetMode && !!onLabelMarksChange && !!labelSetName
  // Leaving the label set (or the dataset) disarms, so clicks can't silently
  // keep editing something no longer on screen.
  useEffect(() => { if (!canLabel) setLabelArmed(false) }, [canLabel])

  const handleBarClick = (bar: { timestamp: string; close: number }) => {
    if (!labelArmed || !onLabelMarksChange) return
    const current = labelMarks ?? []
    const existing = current.findIndex(m => m.time === bar.timestamp)
    if (existing >= 0) {
      // Clicking a marked bar clears it -- same click, so it's undoable
      // without hunting for a separate delete affordance.
      onLabelMarksChange(current.filter((_, i) => i !== existing))
      return
    }
    onLabelMarksChange(
      [...current, { time: bar.timestamp, type: labelSide, price: bar.close }]
        .sort((a, b) => a.time.localeCompare(b.time)),
    )
  }

  // ── Drawing: a full interaction layer over the chart (select, drag,
  //    handles, magnet), not just click-to-place. ──
  const [drawTool, setDrawTool] = useState<Tool>('cursor')
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [magnet, setMagnet] = useState(true)
  const [drawColor, setDrawColor] = useState('#f59e0b')
  const [chartApi, setChartApi] = useState<{ chart: any; series: any } | null>(null)
  const canDraw = isDatasetMode && !!onDrawingsChange
  useEffect(() => { if (!canDraw) { setDrawTool('cursor'); setSelectedShapeId(null) } }, [canDraw])
  // A click can only mean one thing, so arming one mode disarms the other.
  useEffect(() => { if (drawTool !== 'cursor') setLabelArmed(false) }, [drawTool])
  useEffect(() => { if (labelArmed) setDrawTool('cursor') }, [labelArmed])

  const selectedShape = (drawings ?? []).find(sh => sh.id === selectedShapeId) ?? null
  const updateSelected = (patch: Partial<Shape>) => {
    if (!onDrawingsChange || !selectedShapeId) return
    onDrawingsChange((drawings ?? []).map(sh => (sh.id === selectedShapeId ? { ...sh, ...patch } : sh)))
  }
  const deleteSelected = () => {
    if (!onDrawingsChange || !selectedShapeId) return
    onDrawingsChange((drawings ?? []).filter(sh => sh.id !== selectedShapeId))
    setSelectedShapeId(null)
  }
  const clearAllDrawings = () => {
    if (!onDrawingsChange || !drawings?.length) return
    if (window.confirm(`Remove all ${drawings.length} drawings from this dataset?`)) {
      onDrawingsChange([]); setSelectedShapeId(null)
    }
  }

  const toggleId = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const status = (msg: string, tone: 'muted' | 'live' | 'error' = 'muted') => (
    <div className={`h-full flex items-center justify-center text-sm ${
      tone === 'error' ? 'text-red-400' : tone === 'live' ? 'text-green-400' : 'text-gray-600'
    }`}>
      {msg}
    </div>
  )

  const body = (() => {
    if (noDatasetSelected) return status('Select a dataset above to view its chart')
    if (isDatasetMode) {
      if (datasetLoading) return status('Loading dataset…')
      if (datasetError) return status(datasetError, 'error')
      if (chartData.length === 0) return status('Dataset has no bars')
      return <LWChart data={displayData} type={chartType} showVolume={showVolume} indicators={displayIndicators} oscillators={oscillators} custom={displayCustom} strategy={displayStrategy} fitKey={fitKey} onReadout={setValues} labels={labelMarks} onBarClick={handleBarClick} onApiReady={setChartApi} viewRange={viewRange} onVisibleRangeChange={handleVisibleRange} padBars={blankPadBars} showDayBands={showDayBands} />
    }
    if (isLive) {
      if (!connected && chartData.length === 0) return status('Connecting to live feed…')
      if (chartData.length === 0) return status('● LIVE — waiting for trades (market may be closed)', 'live')
      return <LWChart data={chartData} type={effectiveType} showVolume={false} indicators={{}} oscillators={[]} fitKey={fitKey} onReadout={setValues} showDayBands={showDayBands} />
    }
    // Long pulls take several sequential upstream requests, so they get a
    // determinate ring rather than an indefinite "Loading…".
    if (longPull && job.loading) {
      return (
        <ChunkProgress
          progress={job.progress} done={job.done} total={job.total}
          label={`Fetching ${dataInterval} bars for ${range}…`}
          onCancel={job.cancel}
        />
      )
    }
    if (longPull && job.error) return status(job.error, 'error')
    if (loading) return status('Loading…')
    if (error) return status(error, 'error')
    if (chartData.length === 0) return status('Search for a ticker above to load data')
    return <LWChart data={displayData} type={effectiveType} showVolume={showVolume} indicators={displayIndicators} oscillators={oscillators} custom={displayCustom} strategy={displayStrategy} fitKey={fitKey} onReadout={setValues} showDayBands={showDayBands} />
  })()

  const toggleBtn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 active:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )

  const pickRow = (it: { id: string; label: string }) => {
    const on = selectedIds.includes(it.id)
    return (
      <button
        key={it.id}
        onClick={() => toggleId(it.id)}
        className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-700 text-left"
      >
        <span className={`h-3 w-3 rounded-sm border flex items-center justify-center text-[9px] ${
          on ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600'
        }`}>{on ? '✓' : ''}</span>
        <span className={on ? 'text-gray-100' : 'text-gray-400'}>{it.label}</span>
      </button>
    )
  }

  return (
    // Edge-to-edge: no padding on the root, so the plot area gets the whole
    // box. Identity/price/OHLC now live in the Market Insight panel and the
    // floating legend instead of a header row above the chart.
    <div className={`flex flex-col bg-surface border-b border-border ${isMobile ? 'flex-shrink-0' : 'flex-1 min-h-0'}`}>
      {/* ── Toolbar: every chart tool, in one thin strip under the top panel ── */}
      <div className="flex-shrink-0 border-b border-border/60 bg-panel/40 px-2 py-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Live status / data-reach notice keeps a home here, since the
              header row that used to carry it is gone. */}
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-medium mr-1">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className={connected ? 'text-green-400' : 'text-gray-500'}>{connected ? 'LIVE' : 'connecting'}</span>
            </span>
          )}
          {!isLive && job.effectiveStart && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500 mr-1" title="Upstream data-retention limit">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M12 8h.01M11 12h1v4h1" />
              </svg>
              {`${dataInterval} only reaches ${new Date(job.effectiveStart).toLocaleDateString()}`}
            </span>
          )}

          {/* Floating legend toggle -- always available, since the readout
              exists in every mode. */}
          <button
            onClick={() => setFloating(!floating)}
            title={floating ? 'Hide floating legend' : 'Pop the legend out as a floating window'}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border border-border transition-colors ${
              floating ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="5" width="13" height="10" rx="1.5" strokeWidth={2} />
              <path strokeWidth={2} d="M8 19h13V9" />
            </svg>
            Legend
          </button>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
          {!isLive && !noDatasetSelected && (
            <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap lg:gap-2">
              <div className="flex rounded overflow-hidden border border-border">
                {toggleBtn(chartType === 'candlestick', () => setChartType('candlestick'), 'Candles', 'Candlestick')}
                {toggleBtn(chartType === 'line', () => setChartType('line'), 'Line', 'Line / area')}
              </div>
              <button
                onClick={() => setShowVolume(v => !v)}
                title="Toggle volume"
                className={`px-2.5 py-1.5 text-xs rounded border border-border transition-colors ${
                  showVolume ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:bg-gray-700 active:bg-gray-700'
                }`}
              >
                Vol
              </button>
              <button
                onClick={() => setShowDayBands(v => !v)}
                title="Toggle trading-day shading and date labels"
                className={`px-2.5 py-1.5 text-xs rounded border border-border transition-colors ${
                  showDayBands ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:bg-gray-700 active:bg-gray-700'
                }`}
              >
                Days
              </button>

              <button
                onClick={() => setReplayOn(v => !v)}
                title={replayOn ? (playing ? 'Playing — click to exit replay' : 'Paused — click to exit replay') : 'Bar replay'}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-border transition-colors ${
                  replayOn ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 hover:bg-gray-700 active:bg-gray-700'
                }`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={replayOn && playing ? 'M6 5h3.5v14H6zm8.5 0H18v14h-3.5z' : 'M8 5v14l11-7z'} />
                </svg>
                Replay
              </button>

              {/* Indicator picker — built-ins work in Lab dataset mode too
                  (computed from the dataset's own bars); Custom (published)
                  indicators still need a live ticker, so that section is
                  hidden there. */}
              <div className="relative">
                <button
                  onClick={() => setPickerOpen(o => !o)}
                  className={`px-2.5 py-1.5 text-xs rounded border border-border transition-colors ${
                    selectedIds.length ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:bg-gray-700 active:bg-gray-700'
                  }`}
                >
                  Indicators{selectedIds.length ? ` (${selectedIds.length})` : ''} ▾
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                    <div className="absolute left-0 mt-1 z-20 w-48 bg-surface border border-border rounded-md shadow-xl p-1 text-xs lg:left-auto lg:right-0">
                      <div className="px-2 py-1 text-gray-500 uppercase text-[10px] tracking-wide">Overlays</div>
                      {OVERLAY_ITEMS.map(pickRow)}
                      <div className="px-2 py-1 mt-1 text-gray-500 uppercase text-[10px] tracking-wide">Oscillators (panes)</div>
                      {OSC_ITEMS.map(pickRow)}
                      {!isDatasetMode && customList.length > 0 && (
                        <>
                          <div className="px-2 py-1 mt-1 text-gray-500 uppercase text-[10px] tracking-wide">Custom</div>
                          {customList.map(c => pickRow({ id: `custom:${c.slug}`, label: c.name }))}
                        </>
                      )}
                      {/* The active strategy's own ctx.plot() lines -- e.g. an
                          ATR reference it computes for itself -- listed so
                          they can be hidden individually while inspecting or
                          authoring a strategy, instead of an opaque overlay
                          that only comes and goes with the whole strategy. */}
                      {strategyData.lines.length > 0 && (
                        <>
                          <div className="px-2 py-1 mt-1 text-gray-500 uppercase text-[10px] tracking-wide">Strategy</div>
                          {strategyData.lines.map(ln => {
                            const on = !hiddenStrategyLines.has(ln.name)
                            return (
                              <button
                                key={ln.name}
                                onClick={() => toggleStrategyLine(ln.name)}
                                className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-700 text-left"
                              >
                                <span className={`h-3 w-3 rounded-sm border flex items-center justify-center text-[9px] ${
                                  on ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600'
                                }`}>{on ? '✓' : ''}</span>
                                <span className={on ? 'text-gray-100' : 'text-gray-400'}>{ln.name}</span>
                              </button>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Interval picker — shown on every non-live range; intervals the
                  range doesn't support are rendered greyed-out ("n/a"). In Lab
                  dataset mode, options are the dataset's own granularity or
                  coarser (supportedIntervals is already computed that way). */}
              {supportedIntervals.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setIntervalOpen(o => !o)}
                    className="px-2.5 py-1.5 text-xs rounded border border-border text-gray-400 hover:bg-gray-700 active:bg-gray-700 transition-colors"
                  >
                    {effectiveInterval ?? supportedIntervals[0]} ▾
                  </button>
                  {intervalOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIntervalOpen(false)} />
                      <div className="absolute left-0 mt-1 z-20 w-24 bg-surface border border-border rounded-md shadow-xl p-1 text-xs lg:left-auto lg:right-0">
                        {ALL_INTERVALS.map(iv => {
                          const supported = supportedIntervals.includes(iv)
                          const active = (effectiveInterval ?? supportedIntervals[0]) === iv
                          // Options needing several sequential fetches get a
                          // clock, so it's clear which ones run behind a
                          // progress ring before you pick them.
                          const slow = supported && !isDatasetMode && isLongPull(iv, range)
                          return (
                            <button
                              key={iv}
                              disabled={!supported}
                              onClick={() => { setIntervalOverride(iv); setIntervalOpen(false) }}
                              title={slow ? `${iv} over ${range} is fetched in ${chunkCount(iv, range)} parts` : undefined}
                              className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-left transition-colors ${
                                !supported
                                  ? 'text-gray-600 cursor-not-allowed'
                                  : active
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              {iv}
                              {!supported && <span className="text-[9px] text-gray-600 ml-auto">n/a</span>}
                              {slow && (
                                <svg className={`w-3 h-3 ml-auto ${active ? 'text-blue-200' : 'text-gray-500'}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                                  <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 2" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Custom date window — in Lab dataset mode, bounded to the
                  dataset's own stored start/end (you can't pick outside it). */}
              <div className="relative">
                <button
                  onClick={() => { if (cwin) { setCwin(null) } else { setCustomOpen(o => !o) } }}
                  title={cwin ? 'Clear custom window' : 'Custom date range'}
                  className={`px-2.5 py-1.5 text-xs rounded border border-border transition-colors whitespace-nowrap ${
                    cwin ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 hover:bg-gray-700 active:bg-gray-700'
                  }`}
                >
                  {cwin ? `${cwin.start} → ${cwin.end} ✕` : 'Custom ▾'}
                </button>
                {customOpen && !cwin && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCustomOpen(false)} />
                    <div className="absolute left-0 mt-1 z-20 w-64 bg-surface border border-border rounded-md shadow-xl p-2 text-xs lg:left-auto lg:right-0 space-y-2">
                      <DateRangePicker
                        start={cFrom} end={cTo} onChange={(s, e) => { setCFrom(s); setCTo(e) }}
                        minDate={isDatasetMode ? dataset!.start : undefined}
                        maxDate={isDatasetMode ? dataset!.end : undefined}
                      />
                      <div className="text-[11px] text-gray-500 tabular-nums">
                        {cFrom && cTo ? `${cFrom} → ${cTo}` : cFrom ? `${cFrom} → …` : 'Pick a start & end date'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Interval</span>
                        <select
                          value={customIntervalOptions.includes(cIv) ? cIv : customIntervalOptions[0]}
                          onChange={e => setCIv(e.target.value as Interval)}
                          className="flex-1 bg-panel border border-border rounded px-1.5 py-1 text-gray-200"
                        >
                          {customIntervalOptions.map(iv => <option key={iv} value={iv}>{iv}</option>)}
                        </select>
                      </div>
                      <button onClick={applyCustom} disabled={!cFrom || !cTo}
                        className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium">
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Range tabs — in Lab dataset mode these act as a clamped window over
              the dataset's own stored bars (windowBars/handleRangeChange already
              cap to what's actually available); scroll horizontally on touch,
              inline on desktop. */}
          <div className="overflow-x-auto scrollbar-thin -mx-0.5 px-0.5 lg:overflow-visible lg:mx-0 lg:px-0">
            <RangeTabs active={range} onChange={handleRangeChange} excludeNow={labMode} />
          </div>
        </div>

          {/* Labelling lives in a fixed-width slot at the END of the row, and
              is reserved for the whole time a set is open -- not just while
              armed. Anything inserted mid-row pushes every control after it,
              and arming/disarming mid-session is exactly when a jump is most
              disruptive. Reserving on open instead means the only layout change
              happens at a deliberate mode switch, and never while you work. */}
          {canLabel && (
            <div className="flex items-center gap-1 w-[178px] flex-shrink-0 overflow-hidden">
              <button
                onClick={() => setLabelArmed(a => !a)}
                title={labelArmed ? 'Stop marking' : `Mark buy/sell points on "${labelSetName}"`}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors flex-shrink-0 ${
                  labelArmed
                    ? 'bg-amber-500 text-gray-900 border-amber-500 font-medium'
                    : 'border-border text-gray-400 hover:bg-gray-700'
                }`}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.2 3.8l5 5L8.5 20.5 3 21l.5-5.5z" />
                </svg>
                {labelArmed ? 'Marking' : 'Label'}
              </button>
              {labelArmed ? (
                <>
                  <div className="flex rounded overflow-hidden border border-border flex-shrink-0">
                    <button
                      onClick={() => setLabelSide('buy')}
                      title="Mark buys"
                      className={`px-2 py-1 text-xs ${labelSide === 'buy' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >Buy</button>
                    <button
                      onClick={() => setLabelSide('sell')}
                      title="Mark sells"
                      className={`px-2 py-1 text-xs ${labelSide === 'sell' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >Sell</button>
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0">
                    {(labelMarks ?? []).length}
                  </span>
                </>
              ) : (
                // Idle: name only, hard-capped so a long one clips instead of
                // stretching the slot and shoving the toolbar around.
                <span className="text-[10px] text-gray-600 truncate min-w-0" title={labelSetName ?? undefined}>
                  {labelSetName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart fills everything left over. The drawing rail and interaction
          layer sit on top of it, not inside it, so the chart keeps its own
          pan/zoom while shapes get real pointer handling. */}
      <div className={`relative ${isMobile ? 'h-[62vh] min-h-[340px]' : 'flex-1 min-h-0'}`}>
        {body}
        {canDraw && chartData.length > 0 && (
          <>
            <DrawingLayer
              api={chartApi}
              bars={chartData}
              shapes={drawings ?? []}
              onChange={onDrawingsChange!}
              tool={drawTool}
              onToolFinished={() => setDrawTool('cursor')}
              selectedId={selectedShapeId}
              onSelect={setSelectedShapeId}
              magnet={magnet}
              color={drawColor}
            />
            <DrawingToolbar
              tool={drawTool}
              onTool={setDrawTool}
              magnet={magnet}
              onMagnet={setMagnet}
              color={drawColor}
              onColor={setDrawColor}
              selected={selectedShape}
              onUpdateSelected={updateSelected}
              onDeleteSelected={deleteSelected}
              count={drawings?.length ?? 0}
              onClearAll={clearAllDrawings}
            />
          </>
        )}
      </div>

      {/* Dataset time scrubber — the selection is the range tab's window, and
          dragging it slides that window over the dataset. Everything moves
          together: candlesticks, volume, indicators, strategy, the row table
          and the transactions list. Drag the body to keep the window's size
          (so "1D" stays a day wide) or an edge to widen/narrow it. */}
      {/* focusRawWindow follows the chart's visible range, so zooming or
          dragging the candles resizes and slides this handle too -- and
          dragging the handle still drives the chart, as before. */}
      {isDatasetMode && !noDatasetSelected && datasetBars.length > 1 && (
        <DatasetTimeScrubber
          bars={datasetBars}
          windowStart={focusRawWindow[0]?.timestamp ?? null}
          windowEnd={focusRawWindow[focusRawWindow.length - 1]?.timestamp ?? null}
          onChange={(s, e) => setScrubWindow({ start: s, end: e })}
          onClear={() => setScrubWindow(null)}
        />
      )}

      {/* Replay transport — a real row BELOW the chart, never an overlay on top
          of it, so it can never steal clicks/scroll/drag from the chart's own
          controls (crosshair, zoom, pan). This strip is always reserved so
          layout doesn't jump; ReplayTransport itself is the styled glass pill,
          this wrapper only handles the hover-to-reveal fade/scale. */}
      {replayOn && !isLive && (
        <div className="group relative flex-shrink-0 h-9 flex items-center justify-center">
          <div
            className="w-full max-w-2xl opacity-0 scale-95 pointer-events-none
                       group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto
                       transition-all duration-150"
          >
            <ReplayTransport
              playing={playing}
              onPlayPause={() => setPlaying(p => !p)}
              onRestart={() => { setReplayIdx(1); setPlaying(true) }}
              index={revealN}
              total={fullLen}
              onSeek={n => { setPlaying(false); setReplayIdx(n) }}
              speed={speed}
              onSpeedChange={setSpeed}
              speeds={REPLAY_SPEEDS}
              currentDate={displayData.length ? new Date(displayData[displayData.length - 1].timestamp).toLocaleDateString() : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
