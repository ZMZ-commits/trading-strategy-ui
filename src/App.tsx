import { useState, useEffect, useCallback } from 'react'
import { Sidebar, type SidebarView } from './components/Sidebar/Sidebar'
import { TopPanel } from './components/TopPanel/TopPanel'
import { StockChart } from './components/Chart/StockChart'
import { BottomPanel } from './components/BottomPanel/BottomPanel'
import { LabPage } from './components/Lab/LabPage'
import { CodeServerPanel } from './components/IDE/CodeServerPanel'
import { useIsMobile } from './hooks/useMediaQuery'
import { usePersistentState } from './hooks/usePersistentState'
import { getSnapshot } from './api/stocks'
import { DEFAULT_WATCHLIST, type Portfolio } from './data/watchlist'
import type { DatasetMeta, BacktestMeta } from './api/datasets'
import type { Strategy, Range } from './types'

/** How much search history we keep. */
const MAX_RECENTS = 100

export default function App() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [ideOpen, setIdeOpen] = useState(false) // left IDE panel (desktop)
  const [activeTicker, setActiveTicker] = useState('AAPL')
  const [activeRange, setActiveRange] = useState<Range>('1M')
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  // Search history + watchlist persist across reloads (localStorage).
  const [recentTickers, setRecentTickers] = usePersistentState<string[]>('tsp.recentTickers', ['AAPL'])
  const [watchlist, setWatchlist] = usePersistentState<Portfolio[]>('tsp.watchlist', DEFAULT_WATCHLIST)
  const [replayCutoff, setReplayCutoff] = useState<string | null>(null) // replay playhead time

  // Lab Platform: which sidebar view is active, and (in Lab mode) the stored
  // dataset + backtest run currently driving the main chart + bottom panel.
  const [sidebarView, setSidebarView] = useState<SidebarView>('trading')
  const [activeDataset, setActiveDataset] = useState<DatasetMeta | null>(null)
  const [activeBacktest, setActiveBacktest] = useState<BacktestMeta | null>(null)

  // Navigator starts open on desktop, closed (drawer) on phones/tablets.
  useEffect(() => { setSidebarOpen(!isMobile) }, [isMobile])

  const handleTickerChange = (t: string) => {
    setActiveTicker(t)
    // Most-recent-first, de-duped, capped.
    setRecentTickers(prev => [t, ...prev.filter(p => p !== t)].slice(0, MAX_RECENTS))
    if (isMobile) setSidebarOpen(false)
  }

  const removeRecent = useCallback((t: string) => {
    setRecentTickers(prev => prev.filter(p => p !== t))
  }, [setRecentTickers])

  const clearRecents = useCallback(() => setRecentTickers([]), [setRecentTickers])

  /** File a ticker into a watchlist category (creating the category if it's
   *  new). The row goes in immediately with placeholder figures so the UI stays
   *  responsive, then gets backfilled with the real name/price once the
   *  snapshot lands -- a failed fetch just leaves the placeholder rather than
   *  losing the entry. */
  const addToWatchlist = useCallback((ticker: string, category: string) => {
    setWatchlist(prev => {
      const withCategory = prev.some(p => p.name === category)
        ? prev
        : [...prev, { name: category, stocks: [] }]
      return withCategory.map(p =>
        p.name !== category || p.stocks.some(s => s.ticker === ticker)
          ? p
          : { ...p, stocks: [...p.stocks, { ticker, name: ticker, price: 0, change: 0 }] },
      )
    })
    getSnapshot(ticker)
      .then(snap => setWatchlist(prev => prev.map(p =>
        p.name !== category ? p : {
          ...p,
          stocks: p.stocks.map(s => s.ticker !== ticker ? s : {
            ...s,
            name: snap.name || ticker,
            price: snap.price,
            // The snapshot has no change field; day change = open → last.
            change: snap.open ? ((snap.price - snap.open) / snap.open) * 100 : 0,
          }),
        },
      )))
      .catch(() => { /* keep the placeholder row */ })
  }, [setWatchlist])

  const removeFromWatchlist = useCallback((category: string, ticker: string) => {
    setWatchlist(prev => prev.map(p =>
      p.name !== category ? p : { ...p, stocks: p.stocks.filter(s => s.ticker !== ticker) },
    ))
  }, [setWatchlist])

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* LEFT — Web IDE (code-server, desktop only) */}
      {!isMobile && <CodeServerPanel open={ideOpen} onToggle={() => setIdeOpen(o => !o)} />}

      {/* CENTER — chart + panels */}
      <main className={`flex flex-col flex-1 min-w-0 ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {isMobile && (
          <header className="sticky top-0 z-30 flex items-center gap-2 h-12 px-2 bg-panel border-b border-border flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="p-2 rounded-lg text-gray-300 hover:bg-gray-700 active:bg-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-bold text-gray-100">{sidebarView === 'lab' ? 'Lab' : activeTicker}</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-widest text-gray-600">
              {sidebarView === 'lab' ? 'Lab Platform' : 'Trading'}
            </span>
          </header>
        )}
        {sidebarView === 'lab' ? (
          <LabPage
            isMobile={isMobile}
            ticker={activeTicker}
            dataset={activeDataset}
            onSelectDataset={setActiveDataset}
            backtest={activeBacktest}
            onSelectBacktest={setActiveBacktest}
            onReplayCutoff={setReplayCutoff}
          />
        ) : (
          <>
            <TopPanel
              isMobile={isMobile}
              activeTicker={activeTicker}
              recentTickers={recentTickers}
              onTickerChange={handleTickerChange}
              onRemoveRecent={removeRecent}
              onClearRecents={clearRecents}
              watchlist={watchlist}
              onAddToWatchlist={addToWatchlist}
              onRemoveFromWatchlist={removeFromWatchlist}
            />
            <StockChart
              isMobile={isMobile}
              ticker={activeTicker}
              range={activeRange}
              onRangeChange={setActiveRange}
              selectedStrategy={selectedStrategy}
              onReplayCutoff={setReplayCutoff}
            />
            <BottomPanel
              isMobile={isMobile}
              ticker={activeTicker}
              range={activeRange}
              selectedStrategy={selectedStrategy}
              replayCutoff={replayCutoff}
            />
          </>
        )}
      </main>

      {/* RIGHT — Navigator */}
      <Sidebar
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        selectedStrategy={selectedStrategy}
        onSelectStrategy={s => { setSelectedStrategy(s); if (isMobile) setSidebarOpen(false) }}
        onOpenIde={() => setIdeOpen(true)}
        sidebarView={sidebarView}
        onSidebarViewChange={setSidebarView}
      />
    </div>
  )
}
