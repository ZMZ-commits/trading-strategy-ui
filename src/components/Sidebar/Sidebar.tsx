import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { StrategySearch } from './StrategySearch'
import { LabDashboard } from './LabDashboard'
import { scaffold, listItems, deleteItem, type WorkspaceItems } from '../../api/workspace'
import type { Strategy, Range } from '../../types'

interface Props {
  isMobile: boolean
  isOpen: boolean
  onToggle: () => void
  selectedStrategy: Strategy | null
  onSelectStrategy: (s: Strategy) => void
  /** Open the left web-IDE panel (called after scaffolding so the new folder shows). */
  onOpenIde?: () => void
  /** Seeds the Lab Platform view's default ticker/range. */
  ticker: string
  range: Range
}

type SidebarView = 'trading' | 'lab'

// Built-in indicators, split by how they render: overlays draw on the price
// chart; oscillators draw in their own pane.
const INDICATOR_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Overlays', items: ['SMA 20', 'SMA 50', 'SMA 200', 'EMA 20', 'Bollinger Bands', 'VWAP'] },
  { label: 'Oscillators', items: ['RSI', 'MACD', 'TTM Squeeze', 'Stochastic'] },
]

// How often we re-poll the workspace so IDE-side changes (a folder added or
// deleted in VS Code) show up in the sidebar.
const POLL_MS = 5000

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

type Kind = 'strategy' | 'indicator'
interface Menu { x: number; y: number; kind: Kind; slug: string }

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
    </svg>
  )
}

function TradingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V10m6 9V4m6 15v-7" />
    </svg>
  )
}

function LabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 3h6M10 3v5.5L5.5 17a2 2 0 001.8 3h9.4a2 2 0 001.8-3L14 8.5V3" />
    </svg>
  )
}

// A workspace item row (one IDE folder): click to act, right-click for the menu,
// or use the hover trash. Hoisted to module scope so the polled re-render of the
// sidebar doesn't remount the whole list.
function ItemRow({ slug, selected, onClick, onContextMenu, onDelete }: {
  slug: string
  selected?: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDelete: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onContextMenu={onContextMenu}
        title="Click to open in IDE · right-click to delete"
        className={`group w-full flex items-center gap-1.5 text-left px-3 py-1.5 text-xs transition-colors ${
          selected ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
        <span className="truncate flex-1">{slug}</span>
        <span
          role="button"
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Delete"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-900/40 text-gray-500 hover:text-red-400 flex-shrink-0"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </span>
      </button>
    </li>
  )
}

export function Sidebar({ isMobile, isOpen, onToggle, selectedStrategy, onSelectStrategy, onOpenIde, ticker, range }: Props) {
  const [items, setItems] = useState<WorkspaceItems>({ strategies: [], indicators: [] })
  const [indicatorQuery, setIndicatorQuery] = useState('')
  const [strategyQuery, setStrategyQuery] = useState('')
  const [viewQuery, setViewQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [sidebarView, setSidebarView] = useState<SidebarView>('trading')

  // Switch view, and expand the panel if it's currently collapsed.
  const openView = useCallback((v: SidebarView) => {
    setSidebarView(v)
    if (!isOpen) onToggle()
  }, [isOpen, onToggle])

  // Reflect the IDE workspace folders, and keep it live (poll so deletions/adds
  // done inside VS Code show up here too).
  const refresh = useCallback(() => { listItems().then(setItems).catch(() => {}) }, [])
  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }, [])

  // Close the right-click menu on any outside click / scroll / Escape.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  // "+" → scaffold a starter folder in the IDE workspace, open the IDE, refresh.
  const makeItem = useCallback(async (kind: Kind) => {
    const name = window.prompt(`New ${kind} name:`)?.trim()
    if (!name) return
    try {
      const r = await scaffold(kind, name)
      showToast(`Created ${kind} “${r.slug}” — opening IDE…`)
      onOpenIde?.()
      refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : `Failed to create ${kind}`)
    }
  }, [showToast, onOpenIde, refresh])

  // Right-click → Delete: removes the folder from the IDE workspace too.
  const removeItem = useCallback(async (kind: Kind, slug: string) => {
    if (!window.confirm(`Delete ${kind} “${slug}”?\nThis removes the folder from the IDE.`)) return
    try {
      await deleteItem(kind, slug)
      showToast(`Deleted ${kind} “${slug}”`)
      refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : `Failed to delete ${kind}`)
    }
  }, [showToast, refresh])

  const openMenu = (e: React.MouseEvent, kind: Kind, slug: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, kind, slug })
  }

  // ── Indicators: built-ins + the custom (IDE) folders ──
  const iq = indicatorQuery.toLowerCase()
  const indicatorGroups = INDICATOR_GROUPS
    .map(g => ({ label: g.label, items: g.items.filter(i => i.toLowerCase().includes(iq)) }))
    .filter(g => g.items.length > 0)
  const customIndicators = items.indicators.filter(s => s.toLowerCase().includes(iq))
  const totalIndicators =
    INDICATOR_GROUPS.reduce((n, g) => n + g.items.length, 0) + items.indicators.length

  // ── Strategies: the IDE folders ──
  const filteredStrategies = items.strategies.filter(s => s.toLowerCase().includes(strategyQuery.toLowerCase()))

  // Shared header: Trading Platform / Lab Platform tab switcher, plus the
  // mobile close (X). Rendered once, above whichever view is active.
  const header = (
    <div className="flex items-center gap-1 p-2 border-b border-border flex-shrink-0">
      <button
        onClick={() => openView('trading')}
        title="Trading Platform"
        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-semibold truncate transition-colors ${
          sidebarView === 'trading' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
        }`}
      >
        <TradingIcon className="w-3.5 h-3.5 flex-shrink-0" />
        Trading
      </button>
      <button
        onClick={() => openView('lab')}
        title="Lab Platform"
        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-semibold truncate transition-colors ${
          sidebarView === 'lab' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
        }`}
      >
        <LabIcon className="w-3.5 h-3.5 flex-shrink-0" />
        Lab
      </button>
      {/* Mobile uses an in-header close (X); desktop uses the pinned toggle below. */}
      {isMobile && (
        <button
          onClick={onToggle}
          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100 -mr-1 flex-shrink-0"
          aria-label="Close navigator"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )

  // Trading Platform view: the existing Indicators/Strategies/Saved Views
  // content (unchanged), plus its toast + context menu.
  const tradingBody = (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── Indicators ── */}
        <Section title="Indicators" defaultOpen count={totalIndicators} onAdd={() => makeItem('indicator')} addTitle="New indicator">
          <div className="px-2 pb-2">
            <StrategySearch value={indicatorQuery} onChange={setIndicatorQuery} placeholder="Search indicators..." />
          </div>
          {indicatorGroups.map(g => (
            <div key={g.label}>
              <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">{g.label}</p>
              <ul>
                {g.items.map(s => (
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
            </div>
          ))}
          {/* Custom (IDE) indicators — mirror the workspace folders. */}
          <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">Custom (IDE)</p>
          {customIndicators.length === 0 ? (
            <p className="px-3 py-1 text-[11px] text-gray-600">None yet — “+” to create one</p>
          ) : (
            <ul>
              {customIndicators.map(slug => (
                <ItemRow
                  key={slug}
                  slug={slug}
                  onClick={() => onOpenIde?.()}
                  onContextMenu={e => openMenu(e, 'indicator', slug)}
                  onDelete={() => removeItem('indicator', slug)}
                />
              ))}
            </ul>
          )}
        </Section>

        {/* ── Strategies (mirror the IDE folders) ── */}
        <Section title="Strategies" defaultOpen count={items.strategies.length} onAdd={() => makeItem('strategy')} addTitle="New strategy">
          <div className="px-2 pb-2">
            <StrategySearch value={strategyQuery} onChange={setStrategyQuery} placeholder="Search strategies..." />
          </div>
          {filteredStrategies.length === 0 ? (
            <p className="px-3 py-1 text-[11px] text-gray-600">
              {items.strategies.length === 0 ? 'None yet — “+” to create one' : 'No strategies match'}
            </p>
          ) : (
            <ul>
              {filteredStrategies.map(slug => (
                <ItemRow
                  key={slug}
                  slug={slug}
                  selected={selectedStrategy?.slug === slug}
                  onClick={() => onSelectStrategy({ id: slug, name: slug, slug, created_at: '', dir_path: `strategies/${slug}`, source: 'workspace' })}
                  onContextMenu={e => openMenu(e, 'strategy', slug)}
                  onDelete={() => removeItem('strategy', slug)}
                />
              ))}
            </ul>
          )}
        </Section>

        {/* ── Saved Dashboard Views ── */}
        <Section title="Saved Dashboard Views" count={0} onAdd={() => showToast('Coming soon — save dashboard views')} addTitle="Save current view">
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

      {/* Right-click context menu */}
      {menu && (
        <div
          className="fixed z-50 min-w-[130px] rounded border border-border bg-panel shadow-xl py-1"
          style={{ top: menu.y, left: menu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { const m = menu; setMenu(null); removeItem(m.kind, m.slug) }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Delete {menu.kind}
          </button>
        </div>
      )}
    </>
  )

  // ── Mobile: slide-in drawer from the RIGHT with a tap-to-close backdrop ──
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 z-40" onClick={onToggle} aria-hidden="true" />
        )}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[82vw] flex flex-col bg-panel border-l border-border shadow-2xl transition-transform duration-200 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {header}
          {sidebarView === 'trading' ? tradingBody : <LabDashboard ticker={ticker} range={range} />}
        </aside>
      </>
    )
  }

  // ── Desktop: collapsible in-flow column on the RIGHT ──
  // The toggle is pinned to the top-right (a fixed edge), so it stays put
  // whether expanded or collapsed — only its chevron flips.
  return (
    <aside className={`relative flex flex-col bg-panel border-l border-border transition-all duration-200 flex-shrink-0 ${isOpen ? 'w-64' : 'w-12'}`}>
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse navigator' : 'Open navigator'}
        title={isOpen ? 'Collapse' : 'Expand'}
        className="absolute right-1.5 top-2 z-20 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
        </svg>
      </button>

      {/* Collapsed: Trading Platform / Lab Platform tabs, below the expand
          arrow. Clicking one selects that view AND expands the panel. */}
      {!isOpen && (
        <div className="flex flex-col items-center gap-1 mt-11 px-1">
          <button
            onClick={() => openView('trading')}
            title="Trading Platform"
            className={`w-full flex items-center justify-center py-2 rounded transition-colors ${
              sidebarView === 'trading' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            <TradingIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => openView('lab')}
            title="Lab Platform"
            className={`w-full flex items-center justify-center py-2 rounded transition-colors ${
              sidebarView === 'lab' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            <LabIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {isOpen && (
        <>
          {header}
          {sidebarView === 'trading' ? tradingBody : <LabDashboard ticker={ticker} range={range} />}
        </>
      )}
    </aside>
  )
}
