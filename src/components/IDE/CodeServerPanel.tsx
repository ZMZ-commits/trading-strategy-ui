import { useState } from 'react'

import { useHResizable } from '../../hooks/useHResizable'
import { DocViewerModal } from './DocViewerModal'

// Where code-server (VS Code in the browser) is reachable FROM THE BROWSER.
// Default is the public HTTPS endpoint (Caddy). For local-only access via SSH
// tunnel, set VITE_CODE_SERVER_URL=http://localhost:8080.
const CODE_SERVER_BASE =
  (import.meta.env.VITE_CODE_SERVER_URL as string | undefined) ?? 'https://ide.zemingzhang.com'

// Open directly in the clean project workspace so the user never sees the home
// dotfiles (~/.cache, ~/.config, ~/.local). The folder holds strategies/ and
// indicators/.
const CODE_SERVER_URL = `${CODE_SERVER_BASE}/?folder=/home/coder/project`

const GITHUB_URL = 'https://github.com/zmz-commits/trading-strategy-platform'

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
  const [docOpen, setDocOpen] = useState(false)

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

          {/* Everything below the divider leaves the app rather than changing
              it: one link out to the source, one window onto the design doc. */}
          <span className="my-2 h-px w-5 flex-shrink-0 bg-border" />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the repository on GitHub"
            aria-label="Open the repository on GitHub"
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
            </svg>
          </a>

          <button
            onClick={() => setDocOpen(true)}
            title="Open the design doc"
            aria-label="Open the design doc"
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 [writing-mode:vertical-rl] rotate-180">
            Docs
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

      {/* Outside the collapsed-rail block on purpose, so the doc stays
          open while the IDE is expanded. */}
      <DocViewerModal open={docOpen} onClose={() => setDocOpen(false)} />
    </>
  )
}
