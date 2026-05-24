import { useState } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { StockChart } from './components/Chart/StockChart'
import { BottomPanel } from './components/BottomPanel/BottomPanel'
import { FloatingWidget } from './components/FloatingWidget/FloatingWidget'
import type { Strategy, Range } from './types'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTicker, setActiveTicker] = useState('AAPL')
  const [activeRange, setActiveRange] = useState<Range>('1M')
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        selectedStrategy={selectedStrategy}
        onSelectStrategy={setSelectedStrategy}
      />
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <StockChart
          ticker={activeTicker}
          range={activeRange}
          onTickerChange={setActiveTicker}
          onRangeChange={setActiveRange}
        />
        <BottomPanel ticker={activeTicker} selectedStrategy={selectedStrategy} />
      </main>
      <FloatingWidget />
    </div>
  )
}
