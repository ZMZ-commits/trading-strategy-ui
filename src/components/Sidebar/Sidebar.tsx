import { useState, useEffect, useCallback } from 'react'
import { StrategySearch } from './StrategySearch'
import { StrategyList } from './StrategyList'
import { CreateStrategyModal } from './CreateStrategyModal'
import { getStrategies } from '../../api/strategies'
import type { Strategy } from '../../types'

interface Props {
  isOpen: boolean
  onToggle: () => void
  selectedStrategy: Strategy | null
  onSelectStrategy: (s: Strategy) => void
}

export function Sidebar({ isOpen, onToggle, selectedStrategy, onSelectStrategy }: Props) {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(() => { getStrategies().then(setStrategies).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const filtered = strategies.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <aside className={`flex flex-col bg-panel border-r border-border transition-all duration-200 flex-shrink-0 ${isOpen ? 'w-64' : 'w-12'}`}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          {isOpen && <span className="text-sm font-semibold text-gray-300">Strategies</span>}
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100 ml-auto"
            aria-label="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isOpen ? 'M11 19l-7-7 7-7' : 'M13 5l7 7-7 7'} />
            </svg>
          </button>
        </div>
        {isOpen && (
          <>
            <div className="p-2"><StrategySearch value={query} onChange={setQuery} /></div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <StrategyList strategies={filtered} selectedId={selectedStrategy?.id ?? null} onSelect={onSelectStrategy} />
            </div>
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-2 px-3 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                + Create Strategy
              </button>
            </div>
          </>
        )}
      </aside>
      {showModal && (
        <CreateStrategyModal onClose={() => setShowModal(false)} onCreated={() => { load(); setShowModal(false) }} />
      )}
    </>
  )
}
