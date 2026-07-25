import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  ticker: string
  /** Existing watchlist category names, in display order. */
  categories: string[]
  /** Categories this ticker is ALREADY in — shown ticked, and clicking removes it. */
  memberOf: string[]
  onAdd: (ticker: string, category: string) => void
  onRemove: (ticker: string, category: string) => void
}

/** "+" button on a recent-search row that opens a small popover for picking
 *  which watchlist category the ticker goes into (or typing a brand-new one).
 *
 *  Rendered through a portal like TickerInput's autocomplete, because the
 *  Recent list is inside an `overflow-y-auto` column that would otherwise clip
 *  the popover. */
export function AddToWatchlist({ ticker, categories, memberOf, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState({ top: 0, left: 0 })

  // Close on outside click / Escape / scroll (the anchor moves when the list scrolls).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // Keep the 200px-wide popover on screen when the panel is near the edge.
      setRect({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 208) })
    }
    setNewCat('')
    setOpen(o => !o)
  }

  const createCategory = () => {
    const name = newCat.trim()
    if (!name) return
    onAdd(ticker, name)
    setNewCat('')
    setOpen(false)
  }

  const inAny = memberOf.length > 0

  return (
    <>
      <button
        ref={btnRef}
        onClick={e => { e.stopPropagation(); toggle() }}
        title={inAny ? `In watchlist: ${memberOf.join(', ')}` : `Add ${ticker} to watchlist`}
        aria-label={`Add ${ticker} to watchlist`}
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${
          inAny ? 'text-blue-400 hover:text-blue-300' : 'text-gray-600 hover:text-gray-200 hover:bg-gray-600'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {inAny
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: 200, zIndex: 9999 }}
          className="bg-panel border border-border rounded-lg shadow-2xl overflow-hidden text-xs"
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 bg-surface/40">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
              Watchlist · <span className="font-mono text-blue-400">{ticker}</span>
            </p>
          </div>

          <div className="max-h-44 overflow-y-auto scrollbar-thin py-0.5">
            {categories.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[11px] text-gray-600">No categories yet</p>
            ) : categories.map(c => {
              const on = memberOf.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => { on ? onRemove(ticker, c) : onAdd(ticker, c); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface transition-colors"
                >
                  <span className={`h-3 w-3 flex-shrink-0 rounded-sm border flex items-center justify-center text-[9px] ${
                    on ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600'
                  }`}>{on ? '✓' : ''}</span>
                  <span className={`truncate ${on ? 'text-gray-100' : 'text-gray-400'}`}>{c}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1 p-1.5 border-t border-border/60">
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCategory() }}
              placeholder="New category…"
              autoFocus
              className="flex-1 min-w-0 bg-surface border border-border rounded px-1.5 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={createCategory}
              disabled={!newCat.trim()}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[11px] font-medium flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
