import { useState } from 'react'
import { RangeTabs } from './RangeTabs'
import { LWChart } from './LWChart'
import { useStockData } from '../../hooks/useStockData'
import { useLiveTicks } from '../../hooks/useLiveTicks'
import type { Range, OHLCBar } from '../../types'

interface Props {
  ticker: string
  range: Range
  onRangeChange: (r: Range) => void
}

export function StockChart({ ticker, range, onRangeChange }: Props) {
  const isLive = range === 'NOW'
  const { data, loading, error } = useStockData(ticker, range)
  const { ticks, connected } = useLiveTicks(ticker, isLive)

  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [showVolume, setShowVolume] = useState(true)

  // Live ticks → single-price bars; rendered as a line (not real candles yet).
  const liveData: OHLCBar[] = ticks.map(t => ({
    timestamp: t.timestamp, open: t.price, high: t.price, low: t.price, close: t.price, volume: t.size,
  }))
  const chartData = isLive ? liveData : data
  const latest = chartData[chartData.length - 1]
  const effectiveType = isLive ? 'line' : chartType

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
      return <LWChart data={chartData} type={effectiveType} showVolume={false} />
    }
    if (loading) return status('Loading…')
    if (error) return status(error, 'error')
    if (chartData.length === 0) return status('Search for a ticker above to load data')
    return <LWChart data={chartData} type={effectiveType} showVolume={showVolume} />
  })()

  const toggleBtn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 bg-panel border-b border-border">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
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

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isLive && (
            <>
              <div className="flex rounded overflow-hidden border border-border">
                {toggleBtn(chartType === 'candlestick', () => setChartType('candlestick'), 'Candles', 'Candlestick')}
                {toggleBtn(chartType === 'line', () => setChartType('line'), 'Line', 'Line / area')}
              </div>
              <button
                onClick={() => setShowVolume(v => !v)}
                title="Toggle volume"
                className={`px-2 py-1 text-xs rounded border border-border transition-colors ${
                  showVolume ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:bg-gray-700'
                }`}
              >
                Vol
              </button>
            </>
          )}
          <RangeTabs active={range} onChange={onRangeChange} />
        </div>
      </div>

      <div className="flex-1 min-h-0">{body}</div>
    </div>
  )
}
