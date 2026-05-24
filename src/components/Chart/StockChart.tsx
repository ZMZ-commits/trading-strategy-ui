import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TickerInput } from './TickerInput'
import { RangeTabs } from './RangeTabs'
import { useStockData } from '../../hooks/useStockData'
import type { Range } from '../../types'

interface Props {
  ticker: string
  range: Range
  onTickerChange: (t: string) => void
  onRangeChange: (r: Range) => void
}

const fmtDate = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function StockChart({ ticker, range, onTickerChange, onRangeChange }: Props) {
  const { data, loading, error } = useStockData(ticker, range)
  const latest = data[data.length - 1]

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 bg-panel border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <TickerInput current={ticker} onSubmit={onTickerChange} />
          <span className="text-xl font-bold text-gray-100">{ticker}</span>
          {latest && (
            <span className="text-lg text-gray-300">${latest.close.toFixed(2)}</span>
          )}
        </div>
        <RangeTabs active={range} onChange={onRangeChange} />
      </div>
      <div className="flex-1 min-h-0">
        {loading && <div className="h-full flex items-center justify-center text-gray-600 text-sm">Loading...</div>}
        {error && <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>}
        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="timestamp" tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false} axisLine={false} tickFormatter={v => `$${Number(v).toFixed(0)}`} width={55} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }}
                labelFormatter={fmtDate} formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Close']} />
              <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={1.5}
                fill="url(#priceGrad)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">Enter a ticker to load chart data</div>
        )}
      </div>
    </div>
  )
}
