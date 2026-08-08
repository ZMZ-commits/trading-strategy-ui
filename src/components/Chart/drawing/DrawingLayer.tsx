import { useEffect, useRef, useState } from 'react'
import type { OHLCBar } from '../../../types'
import { drawShape, distToSegment, HANDLE_HIT, type Px } from './render'
import { ANCHOR_COUNT, DEFAULT_COLOR, type Shape, type Tool, type ToolKind } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  /** Live chart + price series, needed to convert between data and pixels. */
  api: { chart: any; series: any } | null
  bars: OHLCBar[]
  shapes: Shape[]
  onChange: (shapes: Shape[]) => void
  tool: Tool
  /** Called once a shape is finished, so the toolbar can drop back to Select. */
  onToolFinished: () => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Snap anchors to the nearest OHLC value of the bar under the cursor. */
  magnet: boolean
  color: string
}

type DragMode =
  | { kind: 'move'; id: string; grabT: number; grabP: number; orig: Shape }
  | { kind: 'handle'; id: string; index: number }
  | { kind: 'stop'; id: string }

/** Interactive drawing surface layered over the chart.
 *
 *  This is a plain canvas rather than a lightweight-charts primitive because
 *  primitives can only paint -- they get no pointer events, so selection,
 *  dragging and resize handles are impossible through them. Drawing here and
 *  converting coordinates through the chart's own scales keeps shapes locked
 *  to the data while giving full control of interaction. */
export function DrawingLayer({
  api, bars, shapes, onChange, tool, onToolFinished, selectedId, onSelect, magnet, color,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<Shape | null>(null)
  const [cursor, setCursor] = useState<Px | null>(null)
  const drag = useRef<DragMode | null>(null)
  const [, force] = useState(0)

  /** Height of the PRICE pane only.
   *
   *  The chart container also holds the volume overlay, any oscillator panes
   *  and the time axis. priceToCoordinate/coordinateToPrice are relative to
   *  the price pane, so letting the layer span the full container made clicks
   *  below that pane extrapolate into nonsense prices -- a click visibly above
   *  another could come back as a LOWER price. Constraining the layer to the
   *  price pane keeps pixels and prices in the same space. */
  const paneHeight = (): number => {
    if (!api) return 0
    try {
      const panes = api.chart.panes()
      if (panes && panes.length) return panes[0].getHeight()
    } catch { /* fall through */ }
    return wrapRef.current?.clientHeight ?? 0
  }

  // ── coordinate helpers ──
  const toX = (iso: string): number | null => {
    if (!api) return null
    const d = new Date(iso)
    const t = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000)
    const x = api.chart.timeScale().timeToCoordinate(t as any)
    return x == null ? null : x
  }
  const toY = (price: number): number | null => {
    if (!api) return null
    const y = api.series.priceToCoordinate(price)
    return y == null ? null : y
  }
  const priceAt = (y: number): number => (api ? (api.series.coordinateToPrice(y) ?? 0) : 0)
  /** Nearest bar to a pixel x -- anchors always land on a real bar. */
  const barAt = (x: number): OHLCBar | null => {
    if (!api || bars.length === 0) return null
    const t = api.chart.timeScale().coordinateToTime(x)
    if (t == null) return bars[bars.length - 1]
    let best = bars[0], bd = Infinity
    for (const b of bars) {
      const d = new Date(b.timestamp)
      const bt = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000)
      const delta = Math.abs(bt - (t as number))
      if (delta < bd) { bd = delta; best = b }
    }
    return best
  }
  /** Snap a price to the nearest OHLC of its bar when magnet is on. */
  const snapPrice = (bar: OHLCBar | null, price: number): number => {
    if (!magnet || !bar) return price
    const cands = [bar.open, bar.high, bar.low, bar.close]
    return cands.reduce((best, c) => (Math.abs(c - price) < Math.abs(best - price) ? c : best), cands[0])
  }
  const anchorAt = (x: number, y: number) => {
    const bar = barAt(x)
    const raw = priceAt(y)
    return { t: bar?.timestamp ?? bars[bars.length - 1]?.timestamp ?? '', p: snapPrice(bar, raw) }
  }

  const pixelsFor = (s: Shape): Px[] => {
    const out: Px[] = []
    for (const a of s.points) {
      const x = toX(a.t), y = toY(a.p)
      if (x == null || y == null) return []
      out.push({ x, y })
    }
    return out
  }

  // ── render ──
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap || !api) return
    const dpr = window.devicePixelRatio || 1
    const w = wrap.clientWidth
    const h = paneHeight() || wrap.clientHeight
    cv.width = w * dpr; cv.height = h * dpr
    cv.style.width = `${w}px`; cv.style.height = `${h}px`
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const all = pending ? [...shapes, pending] : shapes
    for (const s of all) {
      const pts = pixelsFor(s)
      if (pts.length === 0) continue
      drawShape(ctx, s, pts, { selected: s.id === selectedId, width: w, height: h, priceAt })
    }

    // Crosshair-ish preview while placing the next anchor.
    if (tool !== 'cursor' && cursor) {
      ctx.save()
      ctx.strokeStyle = 'rgba(96,165,250,0.5)'
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cursor.x, 0); ctx.lineTo(cursor.x, h)
      ctx.moveTo(0, cursor.y); ctx.lineTo(w, cursor.y); ctx.stroke()
      ctx.restore()
    }
  })

  // Repaint on pan/zoom, since shape pixels are derived from the chart scales.
  useEffect(() => {
    if (!api) return
    const redraw = () => force(n => n + 1)
    api.chart.timeScale().subscribeVisibleLogicalRangeChange(redraw)
    return () => { try { api.chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw) } catch { /* noop */ } }
  }, [api])

  // ── hit testing ──
  const hitTest = (x: number, y: number): { id: string; handle?: number; stop?: boolean } | null => {
    // Topmost first, so the most recently drawn shape wins an overlap.
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i]
      const pts = pixelsFor(s)
      if (pts.length === 0) continue
      for (let h = 0; h < pts.length; h++) {
        if (Math.hypot(x - pts[h].x, y - pts[h].y) <= HANDLE_HIT) return { id: s.id, handle: h }
      }
      if ((s.kind === 'long' || s.kind === 'short') && s.stop != null) {
        const sy = toY(s.stop)
        if (sy != null && Math.abs(y - sy) <= HANDLE_HIT && x >= Math.min(pts[0].x, pts[1].x) - 10) {
          return { id: s.id, stop: true }
        }
      }
      const [a, b] = pts
      const near =
        s.kind === 'hline' ? Math.abs(y - a.y) <= 6
        : s.kind === 'vline' ? Math.abs(x - a.x) <= 6
        : s.kind === 'text' ? Math.hypot(x - a.x, y - a.y) <= 24
        : b && (s.kind === 'rect' || s.kind === 'fib' || s.kind === 'long' || s.kind === 'short')
          ? x >= Math.min(a.x, b.x) - 4 && x <= Math.max(a.x, b.x) + 4 &&
            y >= Math.min(a.y, b.y) - 4 && y <= Math.max(a.y, b.y) + 4
        : b ? distToSegment(x, y, a, b) <= 6
        : false
      if (near) return { id: s.id }
    }
    return null
  }

  // ── pointer handling ──
  const local = (e: React.PointerEvent | PointerEvent): Px => {
    const r = wrapRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!api) return
    const { x, y } = local(e)

    if (tool === 'cursor') {
      const hit = hitTest(x, y)
      onSelect(hit?.id ?? null)
      if (!hit) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const s = shapes.find(sh => sh.id === hit.id)!
      if (hit.stop) drag.current = { kind: 'stop', id: s.id }
      else if (hit.handle != null) drag.current = { kind: 'handle', id: s.id, index: hit.handle }
      else {
        const a = anchorAt(x, y)
        drag.current = { kind: 'move', id: s.id, grabT: new Date(a.t).getTime(), grabP: a.p, orig: s }
      }
      return
    }

    // Placing a new shape.
    const kind = tool as ToolKind
    const a = anchorAt(x, y)
    if (!pending) {
      const need = ANCHOR_COUNT[kind]
      const text = kind === 'text' ? (window.prompt('Text:') ?? '').trim() : undefined
      if (kind === 'text' && !text) { onToolFinished(); return }
      const shape: Shape = {
        id: Math.random().toString(36).slice(2, 10),
        kind, points: [a], color, width: 2, text,
      }
      if (need === 1) { onChange([...shapes, shape]); onToolFinished(); return }
      setPending({ ...shape, points: [a, a] })
    } else {
      const done: Shape = { ...pending, points: [pending.points[0], a] }
      // A position tool needs a stop; default it to the far side of entry so
      // the R:R chip means something immediately, then drag it.
      if (done.kind === 'long' || done.kind === 'short') {
        const entry = done.points[0].p, target = done.points[1].p
        done.stop = entry - (target - entry) / 2
      }
      onChange([...shapes, done])
      setPending(null)
      onToolFinished()
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!api) return
    const { x, y } = local(e)
    setCursor({ x, y })

    const d = drag.current
    if (d) {
      const a = anchorAt(x, y)
      const next = shapes.map(s => {
        if (s.id !== d.id) return s
        if (d.kind === 'handle') {
          const points = s.points.slice()
          points[d.index] = a
          return { ...s, points }
        }
        if (d.kind === 'stop') return { ...s, stop: a.p }
        // Move: shift every anchor by the same time/price delta.
        const dt = new Date(a.t).getTime() - d.grabT
        const dp = a.p - d.grabP
        return {
          ...s,
          points: d.orig.points.map(pt => ({
            t: nearestBarIso(new Date(pt.t).getTime() + dt),
            p: pt.p + dp,
          })),
          stop: d.orig.stop != null ? d.orig.stop + dp : undefined,
        }
      })
      onChange(next)
      return
    }

    if (pending) setPending({ ...pending, points: [pending.points[0], anchorAt(x, y)] })
  }

  const nearestBarIso = (ms: number): string => {
    if (bars.length === 0) return new Date(ms).toISOString()
    let best = bars[0], bd = Infinity
    for (const b of bars) {
      const delta = Math.abs(new Date(b.timestamp).getTime() - ms)
      if (delta < bd) { bd = delta; best = b }
    }
    return best.timestamp
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      drag.current = null
    }
  }

  // Delete / Escape, the two keys every drawing tool has.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        onChange(shapes.filter(s => s.id !== selectedId))
        onSelect(null)
      } else if (e.key === 'Escape') {
        setPending(null)
        onSelect(null)
        onToolFinished()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, shapes, onChange, onSelect, onToolFinished])

  // Only intercept pointers when there's drawing to do -- otherwise the chart
  // keeps its own pan/zoom/crosshair behaviour untouched.
  const interactive = tool !== 'cursor' || shapes.length > 0

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 right-0 top-0"
      style={{
        // Only as tall as the price pane -- see paneHeight().
        height: paneHeight() || undefined,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: tool === 'cursor' ? 'default' : 'crosshair',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setCursor(null)}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
