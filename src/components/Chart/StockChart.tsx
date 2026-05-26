import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts'
import { RangeTabs } from './RangeTabs'
import { useStockData } from '../../hooks/useStockData'
import type { Range, OHLCBar } from '../../types'

interface Props {
  ticker: string
  range: Range
  onRangeChange: (r: Range) => void
}

const fmtDate = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function StockChart({ ticker, range, onRangeChange }: Props) {
  const { data, loading, error } = useStockData(ticker, range)

  const [refLeft, setRefLeft] = useState<string | null>(null)
  const [refRight, setRefRight] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [zoomedData, setZoomedData] = useState<OHLCBar[] | null>(null)

  const chartData = zoomedData ?? data
  const latest = chartData[chartData.length - 1]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = (e: any) => {
    if (!e?.activeLabel) return
    setSelecting(true)
    setRefLeft(String(e.activeLabel))
    setRefRight(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (e: any) => {
    if (!selecting || !e?.activeLabel) return
    setRefRight(String(e.activeLabel))
  }

  const handleMouseUp = () => {
    if (!selecting) return
    setSelecting(false)
    if (refLeft && refRight && refLeft !== refRight) {
      const src = zoomedData ?? data
      const i1 = src.findIndex(d => d.timestamp === refLeft)
      const i2 = src.findIndex(d => d.timestamp === refRight)
      if (i1 >= 0 && i2 >= 0 && Math.abs(i2 - i1) > 1) {
        const [l, r] = [Math.min(i1, i2), Math.max(i1, i2)]
        setZoomedData(src.slice(l, r + 1))
      }
    }
    setRefLeft(null)
    setRefRight(null)
  }

  const resetZoom = () => {
    setZoomedData(null)
    setRefLeft(null)
    setRefRight(null)
    setSelecting(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 bg-panel border-b border-border">
      <div className="flex items-center justify-between mb-3">
        {/* Ticker + price */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-100">{ticker}</span>
          {latest && (
            <span className="text-lg text-gray-300">${latest.close.toFixed(2)}</span>
          )}
          {zoomedData && (
            <button
              onClick={resetZoom}
              className="px-2.5 py-1 text-xs rounded bg-gray-800 border border-border hover:border-blue-600/60 hover:bg-gray-700 text-gray-400 hover:text-gray-100 transition-colors"
            >
              ↩ Reset Zoom
            </button>
          )}
        </div>

        {/* Range controls */}
        <div className="flex items-center gap-3">
          {!zoomedData && !loading && chartData.length > 0 && (
            <span className="text-[10px] text-gray-700 hidden sm:block">drag to zoom</span>
          )}
          <RangeTabs active={range} onChange={r => { resetZoom(); onRangeChange(r) }} />
        </div>
      </div>

      <div
        className="flex-1 min-h-0 select-none"
        style={{ cursor: selecting ? 'col-resize' : 'default' }}
      >
        {loading && (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">Loading…</div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${Number(v).toFixed(0)}`}
                width={55}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }}
                labelFormatter={fmtDate}
                formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Close']}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              {refLeft && refRight && (
                <ReferenceArea
                  x1={refLeft}
                  x2={refRight}
                  fill="#3b82f6"
                  fillOpacity={0.12}
                  stroke="#3b82f6"
                  strokeOpacity={0.4}
                  strokeDasharray="4 2"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!loading && !error && chartData.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">
            Search for a ticker above to load data
          </div>
        )}
      </div>
    </div>
  )
}
