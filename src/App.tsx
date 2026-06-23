import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TopPanel } from './components/TopPanel/TopPanel'
import { StockChart } from './components/Chart/StockChart'
import { BottomPanel } from './components/BottomPanel/BottomPanel'
import { JupyterPanel } from './components/Jupyter/JupyterPanel'
import { useIsMobile } from './hooks/useMediaQuery'
import type { Strategy, Range } from './types'

export default function App() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [jupyterOpen, setJupyterOpen] = useState(false) // left IDE panel (desktop)
  const [activeTicker, setActiveTicker] = useState('AAPL')
  const [activeRange, setActiveRange] = useState<Range>('1M')
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [recentTickers, setRecentTickers] = useState<string[]>(['AAPL'])

  // Navigator starts open on desktop, closed (drawer) on phones/tablets.
  useEffect(() => { setSidebarOpen(!isMobile) }, [isMobile])

  const handleTickerChange = (t: string) => {
    setActiveTicker(t)
    setRecentTickers(prev => [t, ...prev.filter(p => p !== t)].slice(0, 12))
    if (isMobile) setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* LEFT — Jupyter Notebook IDE (desktop only) */}
      {!isMobile && <JupyterPanel open={jupyterOpen} onToggle={() => setJupyterOpen(o => !o)} />}

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
            <span className="text-base font-bold text-gray-100">{activeTicker}</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-widest text-gray-600">Trading</span>
          </header>
        )}
        <TopPanel
          isMobile={isMobile}
          activeTicker={activeTicker}
          recentTickers={recentTickers}
          onTickerChange={handleTickerChange}
        />
        <StockChart
          isMobile={isMobile}
          ticker={activeTicker}
          range={activeRange}
          onRangeChange={setActiveRange}
        />
        <BottomPanel isMobile={isMobile} ticker={activeTicker} selectedStrategy={selectedStrategy} />
      </main>

      {/* RIGHT — Navigator */}
      <Sidebar
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        selectedStrategy={selectedStrategy}
        onSelectStrategy={s => { setSelectedStrategy(s); if (isMobile) setSidebarOpen(false) }}
      />
    </div>
  )
}
