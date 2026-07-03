import { useState, useMemo, useEffect } from 'react'
import { RangeTabs } from './RangeTabs'
import { LWChart } from './LWChart'
import { ReplayTransport } from './ReplayTransport'
import { DateRangePicker } from './DateRangePicker'
import { useStockData } from '../../hooks/useStockData'
import { useLiveTicks } from '../../hooks/useLiveTicks'
import { useIndicators } from '../../hooks/useIndicators'
import { useCustomList, useCustomSeries } from '../../hooks/useCustomIndicators'
import { useStrategyChart } from '../../hooks/useStrategyChart'
import type { Range, Interval, OHLCBar, Strategy } from '../../types'

const ALL_INTERVALS: Interval[] = ['1s', '1m', '1h', '1d', '1w', '1mo']

// Which intervals are supported for each range (first entry = default).
const RANGE_INTERVALS: Record<string, Interval[]> = {
  '30M': ['1m'],
  '1H':  ['1m'],
  '5H':  ['1m'],
  '1D':  ['1m', '1h'],
  '5D':  ['1h', '1d'],
  '1M':  ['1d', '1h'],
  '3M':  ['1d', '1h'],
  '6M':  ['1d', '1h'],
  'YTD': ['1d', '1w'],
  '1Y':  ['1d', '1w'],
  '5Y':  ['1w', '1d', '1mo'],
  'MAX': ['1mo', '1w'],
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
}

const OVERLAY_ITEMS = [
  { id: 'sma20', label: 'SMA 20', study: 'sma20' },
  { id: 'sma50', label: 'SMA 50', study: 'sma50' },
  { id: 'sma200', label: 'SMA 200', study: 'sma200' },
  { id: 'ema20', label: 'EMA 20', study: 'ema20' },
  { id: 'bbands', label: 'Bollinger Bands', study: 'bbands' },
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

export function StockChart({ isMobile = false, ticker, range, onRangeChange, selectedStrategy, onReplayCutoff }: Props) {
  const isLive = range === 'NOW'
  const supportedIntervals = RANGE_INTERVALS[range] ?? []
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

  const applyCustom = () => {
    if (!cFrom || !cTo) return
    setCwin({ start: cFrom, end: cTo, interval: cIv })
    setCustomOpen(false)
  }

  const handleRangeChange = (r: Range) => {
    setIntervalOverride(undefined)
    setCwin(null)
    onRangeChange(r)
  }

  const { data, loading, error } = useStockData(ticker, range, dataInterval, winStart, winEnd)
  const { ticks, connected } = useLiveTicks(ticker, isLive)

  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [showVolume, setShowVolume] = useState(true)
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

  const oscillators = useMemo(
    () => OSC_ITEMS.filter(o => selectedIds.includes(o.id)).map(o => o.id),
    [selectedIds],
  )

  const indicators = useIndicators(ticker, range, studies, dataInterval, winStart, winEnd)

  // Custom (user-published) indicators: picker entries use id `custom:<slug>`.
  const customList = useCustomList()
  const customSlugs = useMemo(
    () => selectedIds.filter(id => id.startsWith('custom:')).map(id => id.slice('custom:'.length)),
    [selectedIds],
  )
  const customSeries = useCustomSeries(ticker, range, customSlugs, dataInterval, winStart, winEnd)

  // The strategy shown on the chart follows the Navigator selection (a workspace
  // strategy), so it stays in sync with the metrics panel.
  const strategySlug = selectedStrategy?.source === 'workspace' ? selectedStrategy.slug : null
  const strategyData = useStrategyChart(ticker, range, strategySlug, dataInterval, winStart, winEnd)

  // A strategy can declare the built-in indicators it uses (REQUIRES); tick them
  // on automatically when it's selected (like a mod bringing its dependencies).
  const reqKey = strategyData.requires.join(',')
  useEffect(() => {
    if (!reqKey) return
    const req = reqKey.split(',')
    setSelectedIds(prev => {
      const add = req.filter(r => r && !prev.includes(r))
      return add.length ? [...prev, ...add] : prev
    })
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
  const chartData = isLive ? liveData : data
  const latest = chartData[chartData.length - 1]
  const effectiveType = isLive ? 'line' : chartType
  const fullLen = chartData.length

  // Identifies the actual viewing window; the chart re-fits (end-to-end) only
  // when this changes -- switching ticker/range/interval/custom dates -- and
  // preserves zoom for everything else (indicator/strategy toggles, replay).
  const fitKey = `${ticker}:${range}:${dataInterval ?? ''}:${winStart ?? ''}:${winEnd ?? ''}`

  // (Re)start replay when the window changes or replay is toggled on.
  useEffect(() => {
    if (replayOn && !isLive) { setReplayIdx(1); setPlaying(true) }
    else setPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayOn, ticker, range, effectiveInterval])

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
  const cutoffMs = replaySlicing && chartData[revealN - 1]
    ? new Date(chartData[revealN - 1].timestamp).getTime()
    : Infinity
  const displayData = replaySlicing ? chartData.slice(0, revealN) : chartData
  const displayIndicators = replaySlicing ? sliceIndicators(indicators, revealN) : indicators
  const displayCustom = replaySlicing ? customSeries.map(s => sliceSeries(s, revealN)) : customSeries
  const displayStrategy = useMemo(() => {
    if (!replaySlicing || !strategyData) return strategyData
    return {
      ...strategyData,
      lines: strategyData.lines.map(ln => sliceSeries(ln, revealN)),
      signals: strategyData.signals.filter(s => new Date(s.time).getTime() <= cutoffMs),
    }
  }, [replaySlicing, revealN, cutoffMs, strategyData])

  // Report the replay playhead time so the metrics panel can show trades live.
  const replayCutoffTs = replaySlicing && displayData.length ? displayData[displayData.length - 1].timestamp : null
  useEffect(() => { onReplayCutoff?.(replayCutoffTs) }, [replayCutoffTs, onReplayCutoff])

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
    if (isLive) {
      if (!connected && chartData.length === 0) return status('Connecting to live feed…')
      if (chartData.length === 0) return status('● LIVE — waiting for trades (market may be closed)', 'live')
      return <LWChart data={chartData} type={effectiveType} showVolume={false} indicators={{}} oscillators={[]} fitKey={fitKey} />
    }
    if (loading) return status('Loading…')
    if (error) return status(error, 'error')
    if (chartData.length === 0) return status('Search for a ticker above to load data')
    return <LWChart data={displayData} type={effectiveType} showVolume={showVolume} indicators={displayIndicators} oscillators={oscillators} custom={displayCustom} strategy={displayStrategy} fitKey={fitKey} />
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
    <div className={`flex flex-col p-2 lg:p-4 bg-surface border-b border-border ${isMobile ? 'flex-shrink-0' : 'flex-1 min-h-0'}`}>
      <div className="flex flex-col gap-2 mb-2 lg:flex-row lg:items-center lg:justify-between lg:gap-2 lg:mb-3">
        {/* Ticker + price */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-100">{ticker}</span>
          {latest && <span className="text-lg text-gray-300">${latest.close.toFixed(2)}</span>}
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className={connected ? 'text-green-400' : 'text-gray-500'}>{connected ? 'LIVE' : 'connecting'}</span>
            </span>
          )}
        </div>

        {/* Controls + range tabs */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
          {!isLive && (
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

              {/* Indicator picker */}
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
                      {customList.length > 0 && (
                        <>
                          <div className="px-2 py-1 mt-1 text-gray-500 uppercase text-[10px] tracking-wide">Custom</div>
                          {customList.map(c => pickRow({ id: `custom:${c.slug}`, label: c.name }))}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Interval picker — shown on every non-live range; intervals the
                  range doesn't support are rendered greyed-out ("n/a"). */}
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
                      <div className="absolute left-0 mt-1 z-20 w-20 bg-surface border border-border rounded-md shadow-xl p-1 text-xs lg:left-auto lg:right-0">
                        {ALL_INTERVALS.map(iv => {
                          const supported = supportedIntervals.includes(iv)
                          const active = (effectiveInterval ?? supportedIntervals[0]) === iv
                          return (
                            <button
                              key={iv}
                              disabled={!supported}
                              onClick={() => { setIntervalOverride(iv); setIntervalOpen(false) }}
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
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Custom date window */}
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
                      <DateRangePicker start={cFrom} end={cTo} onChange={(s, e) => { setCFrom(s); setCTo(e) }} />
                      <div className="text-[11px] text-gray-500 tabular-nums">
                        {cFrom && cTo ? `${cFrom} → ${cTo}` : cFrom ? `${cFrom} → …` : 'Pick a start & end date'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Interval</span>
                        <select value={cIv} onChange={e => setCIv(e.target.value as Interval)}
                          className="flex-1 bg-panel border border-border rounded px-1.5 py-1 text-gray-200">
                          {(['1d', '1h', '1w', '1mo'] as Interval[]).map(iv => <option key={iv} value={iv}>{iv}</option>)}
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
          {/* Range tabs scroll horizontally on touch; inline on desktop */}
          <div className="overflow-x-auto scrollbar-thin -mx-0.5 px-0.5 lg:overflow-visible lg:mx-0 lg:px-0">
            <RangeTabs active={range} onChange={handleRangeChange} />
          </div>
        </div>
      </div>

      {/* Replay transport — a normal row ABOVE the chart (not an overlay on top
          of it), so it never fights the chart for clicks and stays reachable
          the whole time replay is on. */}
      {replayOn && !isLive && (
        <div className="mb-2 flex-shrink-0">
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
      )}

      <div className={`relative ${isMobile ? 'h-[62vh] min-h-[340px]' : 'flex-1 min-h-0'}`}>
        {body}
      </div>
    </div>
  )
}
