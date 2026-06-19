import { useState, useMemo } from 'react'
import { RangeTabs } from './RangeTabs'
import { LWChart } from './LWChart'
import { useStockData } from '../../hooks/useStockData'
import { useLiveTicks } from '../../hooks/useLiveTicks'
import { useIndicators } from '../../hooks/useIndicators'
import type { Range, Interval, OHLCBar } from '../../types'

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

export function StockChart({ isMobile = false, ticker, range, onRangeChange }: Props) {
  const isLive = range === 'NOW'
  const supportedIntervals = RANGE_INTERVALS[range] ?? []
  const [intervalOverride, setIntervalOverride] = useState<Interval | undefined>(undefined)
  const [intervalOpen, setIntervalOpen] = useState(false)

  // Reset interval when range changes if the current override isn't supported.
  const effectiveInterval = supportedIntervals.includes(intervalOverride as Interval)
    ? intervalOverride
    : undefined

  const handleRangeChange = (r: Range) => {
    setIntervalOverride(undefined)
    onRangeChange(r)
  }

  const { data, loading, error } = useStockData(ticker, range, effectiveInterval)
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

  const indicators = useIndicators(ticker, range, studies, effectiveInterval)

  // Live ticks → single-price bars; rendered as a line.
  const liveData: OHLCBar[] = ticks.map(t => ({
    timestamp: t.timestamp, open: t.price, high: t.price, low: t.price, close: t.price, volume: t.size,
  }))
  const chartData = isLive ? liveData : data
  const latest = chartData[chartData.length - 1]
  const effectiveType = isLive ? 'line' : chartType

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
      return <LWChart data={chartData} type={effectiveType} showVolume={false} indicators={{}} oscillators={[]} />
    }
    if (loading) return status('Loading…')
    if (error) return status(error, 'error')
    if (chartData.length === 0) return status('Search for a ticker above to load data')
    return <LWChart data={chartData} type={effectiveType} showVolume={showVolume} indicators={indicators} oscillators={oscillators} />
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
    <div className={`flex flex-col p-2 lg:p-4 bg-panel border-b border-border ${isMobile ? 'flex-shrink-0' : 'flex-1 min-h-0'}`}>
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
            </div>
          )}
          {/* Range tabs scroll horizontally on touch; inline on desktop */}
          <div className="overflow-x-auto scrollbar-thin -mx-0.5 px-0.5 lg:overflow-visible lg:mx-0 lg:px-0">
            <RangeTabs active={range} onChange={handleRangeChange} />
          </div>
        </div>
      </div>

      <div className={isMobile ? 'h-[62vh] min-h-[340px]' : 'flex-1 min-h-0'}>{body}</div>
    </div>
  )
}
