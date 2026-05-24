import { useEffect, useState } from 'react'
import { getIndices } from '../../api/stocks'
import type { IndexQuote } from '../../types'

interface Props { onCollapse: () => void; onMouseDown: (e: React.MouseEvent) => void }

export function WidgetPanel({ onCollapse, onMouseDown }: Props) {
  const [indices, setIndices] = useState<IndexQuote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIndices().then(setIndices).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-56 bg-panel border border-border rounded-xl shadow-2xl overflow-hidden" onMouseDown={onMouseDown}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing">
        <span className="text-xs font-semibold text-gray-300">Market Overview</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onCollapse}
          className="text-gray-500 hover:text-gray-200 transition-colors"
          aria-label="Collapse widget"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div className="p-2 space-y-1">
        {loading
          ? <p className="text-xs text-gray-600 text-center py-2">Loading...</p>
          : indices.map(idx => (
              <div key={idx.symbol} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-700/50">
                <div>
                  <p className="text-xs font-medium text-gray-200">{idx.name}</p>
                  <p className="text-xs text-gray-500">{idx.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-gray-200">{idx.price.toLocaleString()}</p>
                  <p className={`text-xs font-mono ${idx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {idx.change >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}
