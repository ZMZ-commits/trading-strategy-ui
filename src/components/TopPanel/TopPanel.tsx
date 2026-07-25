import { useState } from 'react'
import { useResizable } from '../../hooks/useResizable'
import { useHResizable } from '../../hooks/useHResizable'
import { TickerInput } from '../Chart/TickerInput'
import { ResizeHandle } from '../common/ResizeHandle'
import { AddToWatchlist } from './AddToWatchlist'
import { MY_PORTFOLIOS, type StockItem, type Portfolio } from '../../data/watchlist'

// ── compact chip ──────────────────────────────────────────────────────────────
function PortfolioChip({ ticker, name, price, change, qty, onClick, onRemove }: StockItem & {
  onClick: () => void
  /** When present, a hover "×" removes this ticker from its category. */
  onRemove?: () => void
}) {
  const up = change >= 0
  return (
    <div className="group relative flex-shrink-0">
      <button
        onClick={onClick}
        className="w-[98px] bg-surface border border-border/50 rounded px-1.5 py-1 text-left hover:border-blue-600/50 hover:bg-gray-800/60 transition-colors"
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
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          title={`Remove ${ticker} from watchlist`}
          aria-label={`Remove ${ticker} from watchlist`}
          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
                     h-4 w-4 rounded-full bg-panel border border-border text-gray-500 hover:text-red-400 hover:border-red-400/60
                     flex items-center justify-center text-[10px] leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── portfolio row ─────────────────────────────────────────────────────────────
function PortfolioRow({ portfolio, onTickerChange, onRemove }: {
  portfolio: Portfolio
  onTickerChange: (t: string) => void
  onRemove?: (category: string, ticker: string) => void
}) {
  return (
    <div className="flex items-stretch border-b border-border/30 last:border-b-0 min-h-[52px]">
      <div className="w-[60px] flex-shrink-0 flex items-center px-2 border-r border-border/30">
        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
          {portfolio.name}
        </span>
      </div>
      <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto scrollbar-thin flex-1 items-center">
        {portfolio.stocks.length === 0 ? (
          <span className="text-[9px] text-gray-700">Empty — add one from Recent</span>
        ) : portfolio.stocks.map(s => (
          <PortfolioChip
            key={s.ticker} {...s}
            onClick={() => onTickerChange(s.ticker)}
            onRemove={onRemove && (() => onRemove(portfolio.name, s.ticker))}
          />
        ))}
      </div>
    </div>
  )
}

// ── portfolio section — fills whatever container it's placed in ───────────────
function PortfolioSection({ title, portfolios, onTickerChange, onRemove }: {
  title: string
  portfolios: Portfolio[]
  onTickerChange: (t: string) => void
  onRemove?: (category: string, ticker: string) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2.5 py-1 border-b border-border/50 flex-shrink-0 bg-surface/30">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {portfolios.length === 0 ? (
          <p className="px-2.5 py-2 text-[10px] text-gray-700">
            No categories yet — add one from a Recent search
          </p>
        ) : portfolios.map(p => (
          <PortfolioRow key={p.name} portfolio={p} onTickerChange={onTickerChange} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

// ── vertical drag handle ──────────────────────────────────────────────────────
function VDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return <ResizeHandle orientation="vertical" onMouseDown={onMouseDown} />
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
  /** Recent-search history management (kept up to 100, persisted by App). */
  onRemoveRecent: (t: string) => void
  onClearRecents: () => void
  /** User-editable watchlist: categories are created/chosen by hand. */
  watchlist: Portfolio[]
  onAddToWatchlist: (ticker: string, category: string) => void
  onRemoveFromWatchlist: (category: string, ticker: string) => void
}

export function TopPanel({
  isMobile = false, activeTicker, recentTickers, onTickerChange,
  onRemoveRecent, onClearRecents, watchlist, onAddToWatchlist, onRemoveFromWatchlist,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const categories = watchlist.map(p => p.name)
  const categoriesFor = (ticker: string) =>
    watchlist.filter(p => p.stocks.some(s => s.ticker === ticker)).map(p => p.name)

  /** One Recent row: click the ticker to load it, "+" to file it into a
   *  watchlist category, "×" to drop it from history. Icons reveal on hover so
   *  the dense list stays scannable. */
  const recentRow = (t: string) => (
    <div
      key={t}
      className={`group flex items-center gap-0.5 pl-2.5 pr-1 transition-colors hover:bg-surface ${
        t === activeTicker ? 'bg-blue-600/10' : ''
      }`}
    >
      <button
        onClick={() => onTickerChange(t)}
        className={`flex-1 min-w-0 text-left py-[5px] text-[10px] font-mono font-bold truncate transition-colors ${
          t === activeTicker ? 'text-blue-300' : 'text-blue-500 group-hover:text-blue-300'
        }`}
      >
        {t}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <AddToWatchlist
          ticker={t}
          categories={categories}
          memberOf={categoriesFor(t)}
          onAdd={onAddToWatchlist}
          // AddToWatchlist reports (ticker, category); the watchlist API takes
          // (category, ticker). Both are strings, so TS can't catch a swap —
          // adapt explicitly rather than relying on the order lining up.
          onRemove={(tk, category) => onRemoveFromWatchlist(category, tk)}
        />
        <button
          onClick={() => onRemoveRecent(t)}
          title={`Remove ${t} from history`}
          aria-label={`Remove ${t} from history`}
          className="flex-shrink-0 p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-gray-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )

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
            <>
              <div className="flex items-center justify-between mt-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Recent <span className="text-gray-700">{recentTickers.length}</span>
                </span>
                <button onClick={onClearRecents} className="text-[10px] text-gray-500 active:text-red-400">
                  Clear all
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-0.5 px-0.5">
                {recentTickers.map(t => (
                  <span key={t} className="relative flex-shrink-0">
                    <button
                      onClick={() => onTickerChange(t)}
                      className={`pl-3 pr-6 py-1.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                        t === activeTicker
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-border text-blue-400 active:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                    <button
                      onClick={() => onRemoveRecent(t)}
                      aria-label={`Remove ${t} from history`}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center
                                 text-[11px] leading-none text-gray-500 active:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Watchlist + My Stocks — each a capped, scrollable section */}
        <div className="max-h-44 overflow-y-auto scrollbar-thin border-b border-border/50">
          <PortfolioSection
            title="Watchlist" portfolios={watchlist}
            onTickerChange={onTickerChange} onRemove={onRemoveFromWatchlist}
          />
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

          {/* Recent — bottom portion, fills remaining height. Header carries the
              count and a Clear all; each row has its own +/× on hover. */}
          <div className="px-2.5 py-1 border-b border-border/50 flex-shrink-0 bg-surface/30 flex items-center justify-between gap-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 truncate">
              Recent {recentTickers.length > 0 && <span className="text-gray-700">{recentTickers.length}</span>}
            </p>
            {recentTickers.length > 0 && (
              <button
                onClick={onClearRecents}
                title="Clear search history"
                className="text-[9px] uppercase tracking-wide text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-0.5">
            {recentTickers.length === 0 ? (
              <p className="text-[9px] text-gray-700 px-2 py-1">—</p>
            ) : (
              recentTickers.map(recentRow)
            )}
          </div>
        </div>

        {/* ── Drag: Search+Recent | Watchlist ── */}
        <VDivider onMouseDown={onLeftDrag} />

        {/* ── Watchlist (fixed width, draggable right edge) ── */}
        <div style={{ width: midW }} className="flex-shrink-0 overflow-hidden border-r border-border">
          <PortfolioSection
            title="Watchlist" portfolios={watchlist}
            onTickerChange={onTickerChange} onRemove={onRemoveFromWatchlist}
          />
        </div>

        {/* ── Drag: Watchlist | My Stocks ── */}
        <VDivider onMouseDown={onMidDrag} />

        {/* ── My Stocks (flex-1, takes remaining space) ── */}
        <div className="flex-1 min-w-[150px] overflow-hidden">
          <PortfolioSection title="My Stocks" portfolios={MY_PORTFOLIOS} onTickerChange={onTickerChange} />
        </div>

      </div>

      {/* ── Bottom drag handle (vertical resize) ── */}
      <ResizeHandle orientation="horizontal" onMouseDown={onVResize} title="Drag to resize panel height" />
      </>
      )}
    </div>
  )
}
