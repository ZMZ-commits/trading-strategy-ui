import { PALETTE, TOOL_LABELS, type Shape, type Tool } from './types'

interface Props {
  tool: Tool
  onTool: (t: Tool) => void
  magnet: boolean
  onMagnet: (v: boolean) => void
  color: string
  onColor: (c: string) => void
  selected: Shape | null
  onUpdateSelected: (patch: Partial<Shape>) => void
  onDeleteSelected: () => void
  count: number
  onClearAll: () => void
}

/** Tool icons as 24x24 paths -- kept inline so the rail has no asset deps. */
const ICONS: Record<Tool, string> = {
  cursor: 'M4 3l7 17 2.5-6.5L20 11z',
  trendline: 'M4 20L20 4',
  ray: 'M4 20L20 4M20 4h-5M20 4v5',
  hline: 'M3 12h18',
  vline: 'M12 3v18',
  rect: 'M4 6h16v12H4z',
  fib: 'M3 5h18M3 10h18M3 14h18M3 19h18',
  long: 'M4 16h16M4 10h16M8 20V4',
  short: 'M4 8h16M4 14h16M8 4v16',
  text: 'M5 6h14M12 6v12',
}

const ORDER: Tool[] = ['cursor', 'trendline', 'ray', 'hline', 'vline', 'rect', 'fib', 'long', 'short', 'text']

/** Vertical tool rail down the left edge of the chart, the way charting apps
 *  have done it for years: tools always in the same place, never competing
 *  with the horizontal toolbar for width. */
export function DrawingToolbar({
  tool, onTool, magnet, onMagnet, color, onColor,
  selected, onUpdateSelected, onDeleteSelected, count, onClearAll,
}: Props) {
  return (
    <div className="absolute left-0 top-0 bottom-0 z-10 flex flex-col items-center gap-0.5 py-1 px-0.5
                    bg-panel/80 backdrop-blur-sm border-r border-border/60 select-none">
      {ORDER.map(t => (
        <button
          key={t}
          onClick={() => onTool(t)}
          title={TOOL_LABELS[t]}
          aria-label={TOOL_LABELS[t]}
          className={`p-1.5 rounded transition-colors ${
            tool === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={ICONS[t]} />
          </svg>
        </button>
      ))}

      <div className="w-5 border-t border-border/60 my-1" />

      <button
        onClick={() => onMagnet(!magnet)}
        title={magnet ? 'Magnet on — anchors snap to OHLC' : 'Magnet off'}
        aria-label="Magnet"
        className={`p-1.5 rounded transition-colors ${
          magnet ? 'bg-amber-500 text-gray-900' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-700'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={1.8} d="M6 4v7a6 6 0 0012 0V4M6 4h4M14 4h4" />
        </svg>
      </button>

      {/* Colour applies to the selection if there is one, otherwise to the
          next shape drawn -- the same either/or every editor uses. */}
      <div className="relative group">
        <button
          title="Colour"
          aria-label="Colour"
          className="p-1.5 rounded text-gray-500 hover:bg-gray-700"
        >
          <span className="block w-4 h-4 rounded-sm border border-border" style={{ background: selected?.color || color }} />
        </button>
        <div className="absolute left-full top-0 ml-1 hidden group-hover:flex flex-col gap-0.5 p-1
                        bg-panel border border-border rounded shadow-xl">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => (selected ? onUpdateSelected({ color: c }) : onColor(c))}
              className="w-4 h-4 rounded-sm border border-border/60"
              style={{ background: c }}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>
      </div>

      {selected && (
        <button
          onClick={onDeleteSelected}
          title="Delete selected (Del)"
          aria-label="Delete selected"
          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={1.8} d="M6 7h12M9 7V5h6v2m-7 0v12h8V7" />
          </svg>
        </button>
      )}

      {count > 0 && (
        <button
          onClick={onClearAll}
          title={`Clear all ${count} drawings`}
          aria-label="Clear all drawings"
          className="mt-auto text-[9px] text-gray-600 hover:text-red-400 px-1 py-0.5"
        >
          {count}
        </button>
      )}
    </div>
  )
}
