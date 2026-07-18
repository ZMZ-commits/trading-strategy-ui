import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import type { OHLCBar } from '../../types'

interface Props {
  /** Full native-granularity dataset bars (not resampled/windowed) -- the
   *  scrubber always spans the dataset's whole coverage, regardless of what
   *  the chart is currently zoomed to. */
  bars: OHLCBar[]
  /** Current window bounds (dataset timestamps), or null for the full range. */
  windowStart: string | null
  windowEnd: string | null
  /** Fired continuously while dragging with the new [start,end] timestamps. */
  onChange: (start: string, end: string) => void
  /** Fired on double-click to reset to the full dataset range. */
  onClear: () => void
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'create'
interface DragState { mode: DragMode; startIdx: number; endIdx: number; anchorIdx: number }

const fmt = (ts: string) => {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** A horizontal drag-to-select time window below the Lab chart: spans the
 *  dataset's full coverage with a faint price sparkline for context, and a
 *  highlighted region you can drag (move the whole window), resize (drag
 *  either edge), or draw fresh (click+drag empty track). Selecting always
 *  snaps to real bar timestamps -- index-based, not calendar-proportional --
 *  so a drag never lands between bars or inside a weekend/overnight gap. */
export function DatasetTimeScrubber({ bars, windowStart, windowEnd, onChange, onClear }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const n = bars.length

  const sparkline = useMemo(() => {
    if (n < 2) return ''
    const closes = bars.map(b => b.close)
    const lo = Math.min(...closes), hi = Math.max(...closes)
    const span = hi - lo || 1
    const pts = closes.map((c, i) => {
      const x = (i / (n - 1)) * 100
      const y = 32 - ((c - lo) / span) * 28 - 2
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    return pts.join(' ')
  }, [bars, n])

  const idxForTs = useCallback((ts: string | null, fallback: number) => {
    if (!ts || n === 0) return fallback
    // Bars are sorted ascending; find the first bar at/after ts.
    let lo = 0, hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (bars[mid].timestamp < ts) lo = mid + 1; else hi = mid
    }
    return lo
  }, [bars, n])

  const startIdx = drag ? drag.startIdx : idxForTs(windowStart, 0)
  const endIdx = drag ? drag.endIdx : idxForTs(windowEnd, n - 1)

  const idxFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el || n === 0) return 0
    const rect = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(frac * (n - 1))
  }, [n])

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const idx = idxFromClientX(e.clientX)
      setDrag(d => {
        if (!d) return d
        let next: DragState
        if (d.mode === 'resize-left') next = { ...d, startIdx: Math.min(idx, d.endIdx - 1) }
        else if (d.mode === 'resize-right') next = { ...d, endIdx: Math.max(idx, d.startIdx + 1) }
        else if (d.mode === 'create') next = idx >= d.anchorIdx
          ? { ...d, startIdx: d.anchorIdx, endIdx: Math.max(idx, d.anchorIdx + 1) }
          : { ...d, startIdx: Math.min(idx, d.anchorIdx - 1), endIdx: d.anchorIdx }
        else {
          const width = d.endIdx - d.startIdx
          const delta = idx - d.anchorIdx
          let s = d.startIdx + delta, e2 = d.endIdx + delta
          if (s < 0) { s = 0; e2 = width }
          if (e2 > n - 1) { e2 = n - 1; s = e2 - width }
          next = { ...d, startIdx: s, endIdx: e2, anchorIdx: idx }
        }
        onChange(bars[next.startIdx].timestamp, bars[next.endIdx].timestamp)
        return next
      })
    }
    const onUp = () => setDrag(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, idxFromClientX, bars, n])

  if (n < 2) return null

  const leftPct = (startIdx / (n - 1)) * 100
  const rightPct = (endIdx / (n - 1)) * 100

  const beginDrag = (mode: DragMode) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDrag({ mode, startIdx, endIdx, anchorIdx: idxFromClientX(e.clientX) })
  }

  const beginCreate = (e: React.MouseEvent) => {
    const idx = idxFromClientX(e.clientX)
    setDrag({ mode: 'create', startIdx: idx, endIdx: idx + 1, anchorIdx: idx })
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-1 text-[10px] text-gray-600 tabular-nums">
        <span>{fmt(bars[0].timestamp)}</span>
        <button
          type="button" onClick={onClear}
          className="text-gray-500 hover:text-gray-300"
          title="Reset to full dataset range"
        >
          {fmt(bars[startIdx].timestamp)} → {fmt(bars[endIdx].timestamp)} · reset
        </button>
        <span>{fmt(bars[n - 1].timestamp)}</span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={beginCreate}
        className="relative h-8 rounded bg-surface border border-border overflow-hidden cursor-crosshair select-none"
      >
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-gray-600">
          <polyline points={sparkline} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          onMouseDown={beginDrag('move')}
          onDoubleClick={onClear}
          className="absolute inset-y-0 bg-blue-500/25 border-x-2 border-blue-500 cursor-grab active:cursor-grabbing"
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0.5)}%` }}
          title="Drag to move · double-click to reset"
        />
        <div
          onMouseDown={beginDrag('resize-left')}
          className="absolute inset-y-0 w-2 -ml-1 cursor-ew-resize"
          style={{ left: `${leftPct}%` }}
        />
        <div
          onMouseDown={beginDrag('resize-right')}
          className="absolute inset-y-0 w-2 -ml-1 cursor-ew-resize"
          style={{ left: `${rightPct}%` }}
        />
      </div>
    </div>
  )
}
