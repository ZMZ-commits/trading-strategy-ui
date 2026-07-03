import { useHResizable } from '../../hooks/useHResizable'

// Where code-server (VS Code in the browser) is reachable FROM THE BROWSER.
// Default is the public HTTPS endpoint (Caddy). For local-only access via SSH
// tunnel, set VITE_CODE_SERVER_URL=http://localhost:8080.
const CODE_SERVER_BASE =
  (import.meta.env.VITE_CODE_SERVER_URL as string | undefined) ?? 'https://ide.zemingzhang.com'

// Open directly in the clean project workspace so the user never sees the home
// dotfiles (~/.cache, ~/.config, ~/.local). The folder holds strategies/ and
// indicators/.
const CODE_SERVER_URL = `${CODE_SERVER_BASE}/?folder=/home/coder/project`

interface Props {
  open: boolean
  onToggle: () => void
}

/** Left-side web IDE: embeds code-server (full VS Code). Desktop only.
 *
 *  The iframe is mounted ONCE on first render and never unmounted — collapsing
 *  just hides it (width → 0) so VS Code keeps its session and never reloads.
 *  When collapsed it shows a thin rail (like the Navigator); when open the right
 *  edge is a drag-to-resize divider with a hover tab to collapse. No top chrome. */
export function CodeServerPanel({ open, onToggle }: Props) {
  const { width, dragging, onDragHandleMouseDown } = useHResizable(560, 320)

  return (
    <>
      {/* Collapsed rail — kept exactly as the original thin rail. */}
      {!open && (
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
      )}

      {/* IDE column — ALWAYS in the DOM so the iframe loads once and persists.
          Collapsing sets width to 0 (clipped) instead of unmounting. */}
      <div
        style={{ width: open ? width : 0 }}
        className="relative flex flex-shrink-0 overflow-hidden bg-surface"
      >
        <iframe
          src={CODE_SERVER_URL}
          title="VS Code (code-server)"
          className="flex-1 w-full h-full bg-surface border-0"
        />

        {/* While dragging, this overlay sits over the iframe so the parent window
            keeps receiving mouse events — otherwise the iframe swallows them and
            the resize stutters. */}
        {dragging && <div className="absolute inset-0 z-10 cursor-ew-resize" />}

        {/* Drag-to-resize divider on the right edge (only when expanded).
            Subtle hairline at rest; blue line + 3-dot grip on hover/drag, to
            match the other panel dividers. */}
        {open && (
          <div
            onMouseDown={onDragHandleMouseDown}
            title="Drag to resize"
            className="group relative w-2 flex-shrink-0 flex items-center justify-center cursor-ew-resize"
          >
            <span className={`w-px h-full transition-colors ${dragging ? 'bg-blue-500' : 'bg-border/50 group-hover:bg-blue-500'}`} />
            <span className={`absolute flex flex-col gap-[3px] transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
              <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
              <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
            </span>
            {/* Hover tab to collapse the IDE back to the rail (stop the drag
                from starting when this is clicked). */}
            <button
              onClick={onToggle}
              onMouseDown={e => e.stopPropagation()}
              title="Collapse IDE"
              aria-label="Collapse IDE"
              className="absolute top-1/2 -translate-y-1/2 -left-3 w-3.5 h-12 rounded-l bg-panel border border-border border-r-0 text-gray-400 hover:text-gray-100 hover:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
