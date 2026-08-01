import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChartReadout } from './ChartReadout'
import { useChartReadout } from '../../state/chartReadout'

const WIDTH = 236
const SNAP_PX = 18   // how close to an edge counts as a snap
const MARGIN = 8     // resting gap from an edge once snapped

/** Free-floating crosshair readout that sits above everything.
 *
 *  Drag it anywhere on the page; release near the edge of a region and it
 *  snaps flush to it. Regions are read from the DOM at drag time (the panels
 *  are user-resizable, so their edges move) -- the page bounds plus the centre
 *  column, which is the box people actually want to pin against.
 *
 *  Deliberately NOT rendered over the VS Code panel: that's a cross-origin
 *  iframe, and while this window would paint above it, the iframe swallows the
 *  pointer events that make dragging work, so it would strand the window. */
export function FloatingLegend() {
  const { floating, setFloating } = useChartReadout()
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(MARGIN, window.innerWidth - WIDTH - 320),
    y: 96,
  }))
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [snapped, setSnapped] = useState<string | null>(null)

  useEffect(() => {
    if (!floating) return

    /** Candidate edges to snap against: the viewport, and the centre column. */
    const snapTargets = () => {
      const rects: { label: string; rect: DOMRect }[] = [
        { label: 'page', rect: new DOMRect(0, 0, window.innerWidth, window.innerHeight) },
      ]
      const main = document.querySelector('main')
      if (main) rects.push({ label: 'chart column', rect: main.getBoundingClientRect() })
      return rects
    }

    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const h = boxRef.current?.offsetHeight ?? 120
      let x = e.clientX - d.dx
      let y = e.clientY - d.dy
      let hit: string | null = null

      for (const { label, rect } of snapTargets()) {
        if (Math.abs(x - rect.left) < SNAP_PX) { x = rect.left + MARGIN; hit = `${label} ←` }
        else if (Math.abs(x + WIDTH - rect.right) < SNAP_PX) { x = rect.right - WIDTH - MARGIN; hit = `${label} →` }
        if (Math.abs(y - rect.top) < SNAP_PX) { y = rect.top + MARGIN; hit = `${label} ↑` }
        else if (Math.abs(y + h - rect.bottom) < SNAP_PX) { y = rect.bottom - h - MARGIN; hit = `${label} ↓` }
      }

      // Never let it leave the viewport entirely.
      x = Math.min(Math.max(x, 0), window.innerWidth - WIDTH)
      y = Math.min(Math.max(y, 0), window.innerHeight - 40)

      setSnapped(hit)
      setPos({ x, y })
    }
    const onUp = () => { drag.current = null; setSnapped(null) }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [floating])

  if (!floating) return null

  return createPortal(
    <div
      ref={boxRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, width: WIDTH, zIndex: 2147483647 }}
      className={`rounded-lg border shadow-2xl bg-panel/95 backdrop-blur-sm select-none ${
        snapped ? 'border-blue-500' : 'border-border'
      }`}
    >
      <div
        onMouseDown={e => {
          const r = boxRef.current!.getBoundingClientRect()
          drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
          e.preventDefault()
        }}
        className="flex items-center gap-1.5 px-2 py-1 border-b border-border/60 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 flex-1 truncate">
          {snapped ?? 'Legend'}
        </span>
        <button
          onClick={() => setFloating(false)}
          aria-label="Close floating legend"
          className="p-0.5 rounded text-gray-600 hover:text-gray-200 hover:bg-gray-700"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-2">
        <ChartReadout compact />
      </div>
    </div>,
    document.body,
  )
}
