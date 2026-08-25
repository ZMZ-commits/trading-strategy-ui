import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Path of the blueprint, served as a static asset by our own origin.
 *
 *  It is NOT the published claude.ai artifact URL: that host refuses to be
 *  framed cross-origin, so embedding it would render an empty box. The build
 *  step copies the doc into public/ instead, which also means the viewer works
 *  offline and ships with the UI. */
const DOC_URL = '/design-doc.html'

interface Props {
  open: boolean
  onClose: () => void
}

/** Full-bleed-but-inset viewer for the design doc.
 *
 *  Deliberately not a route: the doc is reference material you glance at while
 *  keeping your place in the chart, so it floats over the app and leaves the
 *  page underneath untouched. Portalled to <body> so no ancestor's overflow or
 *  stacking context can clip it. */
export function DocViewerModal({ open, onClose }: Props) {
  // Escape closes, and the page behind must not scroll while this is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex bg-black/70"
      // mousedown rather than click: a click that STARTS inside the window and
      // ends on the backdrop (a drag past the edge) should not close it.
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trading Platform Blueprint"
        className="m-6 md:m-10 flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
      >
        {/* Title bar — the only chrome. No back, no forward, no address bar. */}
        <div className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Trading Platform Blueprint
          </span>
          <span className="text-[11px] text-gray-600">design doc &amp; principles</span>
          <button
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <iframe
          src={DOC_URL}
          title="Trading Platform Blueprint"
          className="w-full flex-1 border-0 bg-surface"
        />
      </div>
    </div>,
    document.body,
  )
}
