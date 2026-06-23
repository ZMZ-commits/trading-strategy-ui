import { useHResizable } from '../../hooks/useHResizable'
import { JUPYTER_BASE } from '../../api/artifacts'

interface Props {
  open: boolean
  onToggle: () => void
}

/** Left-side authoring panel: embeds JupyterLab (server IDE) via the SSH tunnel.
 *  Collapsible to a thin rail; resizable when open. Desktop only. */
export function JupyterPanel({ open, onToggle }: Props) {
  const { width, onDragHandleMouseDown } = useHResizable(520, 320)

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-2 w-10 flex-shrink-0 bg-panel border-r border-border pt-2">
        <button
          onClick={onToggle}
          title="Open Jupyter Notebook"
          aria-label="Open Jupyter Notebook"
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 [writing-mode:vertical-rl] rotate-180">
          Jupyter Notebook
        </span>
      </div>
    )
  }

  return (
    <div style={{ width }} className="flex flex-shrink-0">
      <div className="flex flex-col flex-1 min-w-0 bg-panel border-r border-border">
        <div className="flex items-center gap-2 h-9 px-2 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold text-gray-300">📓 Jupyter Notebook</span>
          <a
            href={JUPYTER_BASE} target="_blank" rel="noreferrer"
            className="ml-auto text-[11px] px-2 py-1 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            Open in tab ↗
          </a>
          <button
            onClick={onToggle}
            title="Collapse"
            aria-label="Collapse Jupyter Notebook"
            className="text-[11px] px-2 py-1 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <iframe src={JUPYTER_BASE} title="Jupyter Notebook" className="flex-1 w-full bg-white border-0" />
        <div className="text-[10px] text-gray-600 px-2 py-1 border-t border-border flex-shrink-0">
          Blank? Open your SSH tunnel (<code>localhost:8888</code>) and set <code>JUPYTER_TOKEN</code>, or “Open in tab”.
        </div>
      </div>
      {/* drag handle to resize the panel width */}
      <div
        onMouseDown={onDragHandleMouseDown}
        className="w-1.5 cursor-ew-resize bg-border hover:bg-blue-600 transition-colors flex-shrink-0"
        title="Drag to resize"
      />
    </div>
  )
}
