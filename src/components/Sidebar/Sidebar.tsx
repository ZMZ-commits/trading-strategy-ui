import { useState, useEffect, useCallback } from 'react'
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

export function Sidebar({ isMobile, isOpen, onToggle, selectedStrategy, onSelectStrategy }: Props) {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(() => { getStrategies().then(setStrategies).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const filtered = strategies.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))

  // Shared inner content (search + list + create button).
  const body = (
    <>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-semibold text-gray-300">Strategies</span>
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
      <div className="p-2"><StrategySearch value={query} onChange={setQuery} /></div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <StrategyList strategies={filtered} selectedId={selectedStrategy?.id ?? null} onSelect={onSelectStrategy} />
      </div>
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2.5 px-3 text-sm rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium transition-colors"
        >
          + Create Strategy
        </button>
      </div>
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
