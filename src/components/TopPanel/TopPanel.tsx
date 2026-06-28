import { useState } from 'react'
import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { TickerInput } from '../Chart/TickerInput'

interface StockItem {
  ticker: string
  name: string
  price: number
  change: number
  qty?: number
}

interface Portfolio {
  name: string
  stocks: StockItem[]
}

const WATCHLIST_PORTFOLIOS: Portfolio[] = [
  {
    name: 'Tech',
    stocks: [
      { ticker: 'AMZN', name: 'Amazon', price: 178.25, change: +1.8 },
      { ticker: 'GOOGL', name: 'Alphabet', price: 165.30, change: -0.3 },
      { ticker: 'META', name: 'Meta', price: 490.80, change: +2.1 },
      { ticker: 'NFLX', name: 'Netflix', price: 631.50, change: -0.9 },
      { ticker: 'NVDA', name: 'NVIDIA', price: 875.40, change: +3.4 },
      { ticker: 'ADBE', name: 'Adobe', price: 432.10, change: +0.8 },
    ],
  },
  {
    name: 'Finance',
    stocks: [
      { ticker: 'JPM', name: 'JPMorgan', price: 198.50, change: +0.6 },
      { ticker: 'BAC', name: 'Bank of America', price: 38.20, change: -0.4 },
      { ticker: 'GS', name: 'Goldman Sachs', price: 467.80, change: +1.2 },
      { ticker: 'MS', name: 'Morgan Stanley', price: 102.30, change: +0.8 },
      { ticker: 'AXP', name: 'Amex', price: 220.50, change: -0.2 },
    ],
  },
  {
    name: 'Energy',
    stocks: [
      { ticker: 'XOM', name: 'Exxon', price: 108.40, change: +0.9 },
      { ticker: 'CVX', name: 'Chevron', price: 148.70, change: -0.5 },
      { ticker: 'COP', name: 'ConocoPhillips', price: 112.20, change: +1.4 },
      { ticker: 'BP', name: 'BP plc', price: 36.80, change: +0.7 },
    ],
  },
]

const MY_PORTFOLIOS: Portfolio[] = [
  {
    name: 'Index ETFs',
    stocks: [
      { ticker: 'SPY', name: 'S&P 500', price: 499.75, change: +0.4, qty: 10 },
      { ticker: 'QQQ', name: 'Nasdaq', price: 425.60, change: +0.7, qty: 5 },
      { ticker: 'VTI', name: 'Total Mkt', price: 218.40, change: +0.3, qty: 20 },
      { ticker: 'VOO', name: 'Vanguard', price: 460.20, change: +0.4, qty: 8 },
    ],
  },
  {
    name: 'Commodities',
    stocks: [
      { ticker: 'GLD', name: 'Gold ETF', price: 228.90, change: +1.1, qty: 3 },
      { ticker: 'SLV', name: 'Silver', price: 26.40, change: +0.8, qty: 5 },
      { ticker: 'TLT', name: 'Treasury', price: 91.20, change: -0.2, qty: 8 },
    ],
  },
  {
    name: 'Tech Plays',
    stocks: [
      { ticker: 'AAPL', name: 'Apple', price: 189.30, change: +1.2, qty: 15 },
      { ticker: 'MSFT', name: 'Microsoft', price: 412.20, change: +0.5, qty: 8 },
      { ticker: 'NVDA', name: 'NVIDIA', price: 875.40, change: +3.4, qty: 2 },
      { ticker: 'AMD', name: 'AMD', price: 168.90, change: +2.1, qty: 10 },
    ],
  },
]

// ── compact chip ──────────────────────────────────────────────────────────────
function PortfolioChip({ ticker, name, price, change, qty, onClick }: StockItem & { onClick: () => void }) {
  const up = change >= 0
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[98px] bg-surface border border-border/50 rounded px-1.5 py-1 text-left hover:border-blue-600/50 hover:bg-gray-800/60 transition-colors"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-mono font-bold text-blue-400 leading-none">{ticker}</span>
        <span className={`text-[9px] font-semibold leading-none ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <p className="text-[9px] text-gray-600 truncate leading-none mb-0.5">{name}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-gray-200">${price.toFixed(2)}</span>
        {qty != null && <span className="text-[9px] text-gray-700">×{qty}</span>}
      </div>
    </button>
  )
}

// ── portfolio row ─────────────────────────────────────────────────────────────
function PortfolioRow({ portfolio, onTickerChange }: { portfolio: Portfolio; onTickerChange: (t: string) => void }) {
  return (
    <div className="flex items-stretch border-b border-border/30 last:border-b-0 min-h-[52px]">
      <div className="w-[60px] flex-shrink-0 flex items-center px-2 border-r border-border/30">
        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
          {portfolio.name}
        </span>
      </div>
      <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto scrollbar-thin flex-1 items-center">
        {portfolio.stocks.map(s => (
          <PortfolioChip key={s.ticker} {...s} onClick={() => onTickerChange(s.ticker)} />
        ))}
      </div>
    </div>
  )
}

// ── portfolio section — fills whatever container it's placed in ───────────────
function PortfolioSection({ title, portfolios, onTickerChange }: {
  title: string
  portfolios: Portfolio[]
  onTickerChange: (t: string) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2.5 py-1 border-b border-border/50 flex-shrink-0 bg-surface/30">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {portfolios.map(p => (
          <PortfolioRow key={p.name} portfolio={p} onTickerChange={onTickerChange} />
        ))}
      </div>
    </div>
  )
}

// ── vertical drag handle ──────────────────────────────────────────────────────
function VDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1.5 flex-shrink-0 cursor-ew-resize bg-border hover:bg-blue-600 transition-colors self-stretch"
      title="Drag to resize"
    />
  )
}

// ── section label row shared style ───────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="px-2.5 py-1 border-b border-border/50 flex-shrink-0 bg-surface/30">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{text}</p>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
interface Props {
  isMobile?: boolean
  activeTicker: string
  recentTickers: string[]
  onTickerChange: (t: string) => void
}

export function TopPanel({ isMobile = false, activeTicker, recentTickers, onTickerChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  // Vertical resize (bottom drag handle); dragging past the minimum collapses it.
  const { height, onDragHandleMouseDown: onVResize } = useResizable(166, 52, 'down', () => setCollapsed(true))

  // Horizontal splits
  // left = Search+Recent column width
  const { width: leftW, onDragHandleMouseDown: onLeftDrag } = useHResizable(180, 110)
  // mid = Watchlist column width
  const { width: midW, onDragHandleMouseDown: onMidDrag } = useHResizable(290, 150)

  // ── Mobile/tablet: stack the sections; no mouse-drag dividers ──
  if (isMobile) {
    return (
      <div className="flex flex-col flex-shrink-0 bg-panel border-b border-border">
        {/* Search + recent (recent as a horizontal chip strip) */}
        <div className="p-2 overflow-visible border-b border-border/50">
          <TickerInput current={activeTicker} onSubmit={onTickerChange} />
          {recentTickers.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin mt-2 -mx-0.5 px-0.5">
              {recentTickers.map(t => (
                <button
                  key={t}
                  onClick={() => onTickerChange(t)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                    t === activeTicker
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-border text-blue-400 active:bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist + My Stocks — each a capped, scrollable section */}
        <div className="max-h-44 overflow-y-auto scrollbar-thin border-b border-border/50">
          <PortfolioSection title="Watchlist" portfolios={WATCHLIST_PORTFOLIOS} onTickerChange={onTickerChange} />
        </div>
        <div className="max-h-44 overflow-y-auto scrollbar-thin">
          <PortfolioSection title="My Stocks" portfolios={MY_PORTFOLIOS} onTickerChange={onTickerChange} />
        </div>
      </div>
    )
  }

  return (
    // Root has no overflow-hidden so the autocomplete portal isn't affected.
    // The toggle is pinned to the top-right (a fixed edge), so it stays in the
    // same spot whether the panel is expanded or collapsed — only its chevron
    // flips. The body below it shrinks/grows.
    <div
      style={collapsed ? undefined : { height }}
      className={`relative flex flex-col flex-shrink-0 bg-panel border-b border-border ${collapsed ? 'h-7' : ''}`}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand top panel' : 'Collapse top panel'}
        title={collapsed ? 'Expand' : 'Collapse'}
        className="absolute right-1.5 top-1 z-20 p-1 rounded hover:bg-gray-700/80 text-gray-500 hover:text-gray-200"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {collapsed ? (
        <div className="flex items-center h-7 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Search &amp; Watchlist</span>
        </div>
      ) : (
      <>
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Search + Recent (single column, stacked) ── */}
        <div style={{ width: leftW }} className="flex flex-col flex-shrink-0 overflow-hidden border-r border-border">

          {/* Search — top portion */}
          <SectionLabel text="Search" />
          {/* overflow-visible so the autocomplete portal can escape the panel */}
          <div className="p-2 flex-shrink-0 overflow-visible border-b border-border/50">
            <TickerInput current={activeTicker} onSubmit={onTickerChange} />
          </div>

          {/* Recent — bottom portion, fills remaining height */}
          <SectionLabel text="Recent" />
          <div className="flex-1 overflow-y-auto scrollbar-thin py-0.5">
            {recentTickers.length === 0 ? (
              <p className="text-[9px] text-gray-700 px-2 py-1">—</p>
            ) : (
              recentTickers.map(t => (
                <button
                  key={t}
                  onClick={() => onTickerChange(t)}
                  className={`w-full text-left px-2.5 py-[5px] text-[10px] font-mono font-bold transition-colors hover:bg-surface truncate block ${
                    t === activeTicker ? 'text-blue-300' : 'text-blue-500 hover:text-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Drag: Search+Recent | Watchlist ── */}
        <VDivider onMouseDown={onLeftDrag} />

        {/* ── Watchlist (fixed width, draggable right edge) ── */}
        <div style={{ width: midW }} className="flex-shrink-0 overflow-hidden border-r border-border">
          <PortfolioSection title="Watchlist" portfolios={WATCHLIST_PORTFOLIOS} onTickerChange={onTickerChange} />
        </div>

        {/* ── Drag: Watchlist | My Stocks ── */}
        <VDivider onMouseDown={onMidDrag} />

        {/* ── My Stocks (flex-1, takes remaining space) ── */}
        <div className="flex-1 min-w-[150px] overflow-hidden">
          <PortfolioSection title="My Stocks" portfolios={MY_PORTFOLIOS} onTickerChange={onTickerChange} />
        </div>

      </div>

      {/* ── Bottom drag handle (vertical resize) ── */}
      <div
        onMouseDown={onVResize}
        className="h-1.5 w-full cursor-ns-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize panel height"
      />
      </>
      )}
    </div>
  )
}
