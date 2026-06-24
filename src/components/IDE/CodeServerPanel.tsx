import { useHResizable } from '../../hooks/useHResizable'

// Where code-server (VS Code in the browser) is reachable FROM THE BROWSER.
// Default is the SSH tunnel (localhost:8080). Override with VITE_CODE_SERVER_URL.
const CODE_SERVER_BASE =
  (import.meta.env.VITE_CODE_SERVER_URL as string | undefined) ?? 'http://localhost:8080'

interface Props {
  open: boolean
  onToggle: () => void
}

/** Left-side web IDE: embeds code-server (full VS Code) via the SSH tunnel.
 *  Collapsible to a thin rail; resizable when open. Desktop only. */
export function CodeServerPanel({ open, onToggle }: Props) {
  const { width, onDragHandleMouseDown } = useHResizable(560, 320)

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-2 w-10 flex-shrink-0 bg-panel border-r border-border pt-2">
        <button
          onClick={onToggle}
          title="Open IDE (VS Code)"
          aria-label="Open IDE"
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 [writing-mode:vertical-rl] rotate-180">
          VS Code
        </span>
      </div>
    )
  }

  return (
    <div style={{ width }} className="flex flex-shrink-0">
      <div className="flex flex-col flex-1 min-w-0 bg-panel border-r border-border">
        <div className="flex items-center gap-2 h-9 px-2 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold text-gray-300">{'</>'} VS Code</span>
          <a
            href={CODE_SERVER_BASE} target="_blank" rel="noreferrer"
            className="ml-auto text-[11px] px-2 py-1 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            Open in tab ↗
          </a>
          <button
            onClick={onToggle}
            title="Collapse"
            aria-label="Collapse IDE"
            className="text-[11px] px-2 py-1 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <iframe src={CODE_SERVER_BASE} title="VS Code (code-server)" className="flex-1 w-full bg-[#1e1e1e] border-0" />
        <div className="text-[10px] text-gray-600 px-2 py-1 border-t border-border flex-shrink-0">
          Blank? Open your SSH tunnel (<code>localhost:8080</code>) and set <code>CODE_SERVER_PASSWORD</code>, or “Open in tab”.
        </div>
      </div>
      <div
        onMouseDown={onDragHandleMouseDown}
        className="w-1.5 cursor-ew-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize"
      />
    </div>
  )
}
