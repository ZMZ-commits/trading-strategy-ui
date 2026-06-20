import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { StrategySearch } from './StrategySearch'
import { StrategyList } from './StrategyList'
import { CreateStrategyModal } from './CreateStrategyModal'
import { getStrategies } from '../../api/strategies'
import type { Strategy } from '../../types'

interface Props {
  isMobile: boolean
  isOpen: boolean
  onToggle: () => void
  selectedStrategy: Strategy | null
  onSelectStrategy: (s: Strategy) => void
}

// Built-in indicators catalog (searchable). Overlays draw on the price chart;
// oscillators draw in their own pane. Custom (user-authored) indicators get
// added via the section's "+" (coming soon). Wiring a click to toggle the
// indicator on the chart is a follow-up.
const INDICATORS = [
  'SMA 20', 'SMA 50', 'SMA 200', 'EMA 20', 'Bollinger Bands',
  'VWAP', 'RSI', 'MACD', 'TTM Squeeze', 'Stochastic',
]

// Collapsible accordion section. Optional `onAdd` renders a "+" in the header.
function Section({ title, defaultOpen = false, count, onAdd, addTitle, children }: {
  title: string
  defaultOpen?: boolean
  count?: number
  onAdd?: () => void
  addTitle?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border">
      <div className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-gray-700/40 transition-colors">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
          <svg className={`w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 truncate">{title}</span>
          {count != null && <span className="text-[10px] text-gray-600">{count}</span>}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            title={addTitle ?? `Add ${title}`}
            aria-label={addTitle ?? `Add ${title}`}
            className="p-0.5 rounded hover:bg-gray-600 text-gray-400 hover:text-gray-100 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

export function Sidebar({ isMobile, isOpen, onToggle, selectedStrategy, onSelectStrategy }: Props) {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [indicatorQuery, setIndicatorQuery] = useState('')
  const [strategyQuery, setStrategyQuery] = useState('')
  const [viewQuery, setViewQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(() => { getStrategies().then(setStrategies).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const filteredIndicators = INDICATORS.filter(s => s.toLowerCase().includes(indicatorQuery.toLowerCase()))
  const filteredStrategies = strategies.filter(s => s.name.toLowerCase().includes(strategyQuery.toLowerCase()))

  // Shared inner content: header + collapsible sections + transient toast.
  const body = (
    <>
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold text-gray-300">Navigator</span>
        <button
          onClick={onToggle}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100 -mr-1"
          aria-label={isMobile ? 'Close sidebar' : 'Toggle sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isMobile ? 'M6 18L18 6M6 6l12 12' : 'M11 19l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── Indicators (built-in catalog + custom via "+") ── */}
        <Section
          title="Indicators"
          defaultOpen
          count={INDICATORS.length}
          onAdd={() => showToast('Custom indicators — coming soon')}
          addTitle="Add custom indicator (coming soon)"
        >
          <div className="px-2 pb-2">
            <StrategySearch value={indicatorQuery} onChange={setIndicatorQuery} placeholder="Search indicators..." />
          </div>
          {filteredIndicators.length === 0 ? (
            <p className="px-3 py-1 text-xs text-gray-600">No indicators match</p>
          ) : (
            <ul>
              {filteredIndicators.map(s => (
                <li key={s}>
                  <button
                    type="button"
                    title="Add to chart (coming soon)"
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Strategies (create / run / select) ── */}
        <Section
          title="Strategies"
          defaultOpen
          count={strategies.length}
          onAdd={() => setShowModal(true)}
          addTitle="Create strategy"
        >
          <div className="px-2 pb-2">
            <StrategySearch value={strategyQuery} onChange={setStrategyQuery} placeholder="Search strategies..." />
          </div>
          <StrategyList
            strategies={filteredStrategies}
            selectedId={selectedStrategy?.id ?? null}
            onSelect={onSelectStrategy}
          />
        </Section>

        {/* ── Saved Dashboard Views (placeholder — not implemented yet) ── */}
        <Section
          title="Saved Dashboard Views"
          count={0}
          onAdd={() => showToast('Saved dashboard views — coming soon')}
          addTitle="Save current view (coming soon)"
        >
          <div className="px-2 pb-2">
            <StrategySearch value={viewQuery} onChange={setViewQuery} placeholder="Search views..." />
          </div>
          <p className="px-3 py-2 text-xs text-gray-600">Coming soon</p>
        </Section>
      </div>

      {toast && (
        <div className="px-3 py-1.5 text-[11px] text-amber-300 bg-amber-900/30 border-t border-border flex-shrink-0">
          {toast}
        </div>
      )}
    </>
  )

  const modal = showModal && (
    <CreateStrategyModal onClose={() => setShowModal(false)} onCreated={() => { load(); setShowModal(false) }} />
  )

  // ── Mobile: slide-in drawer over the content with a tap-to-close backdrop ──
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 z-40" onClick={onToggle} aria-hidden="true" />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] flex flex-col bg-panel border-r border-border shadow-2xl transition-transform duration-200 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {body}
        </aside>
        {modal}
      </>
    )
  }

  // ── Desktop: collapsible in-flow column ──
  return (
    <>
      <aside className={`flex flex-col bg-panel border-r border-border transition-all duration-200 flex-shrink-0 ${isOpen ? 'w-64' : 'w-12'}`}>
        {isOpen ? body : (
          <div className="flex items-center justify-center p-3 border-b border-border">
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
              aria-label="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </aside>
      {modal}
    </>
  )
}
