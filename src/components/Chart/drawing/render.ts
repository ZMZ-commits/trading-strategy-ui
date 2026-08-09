import { FIB_LEVELS, DEFAULT_COLOR, type Shape } from './types'

/** A shape resolved to pixel space, ready to draw or hit-test. */
export interface Px { x: number; y: number }

const HANDLE_R = 4

/** Draw one shape. `pts` are already in pixel space so the same geometry is
 *  used for drawing and for hit-testing -- if they were computed separately
 *  the two would drift and shapes would become un-clickable where they render. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  s: Shape,
  pts: Px[],
  opts: { selected: boolean; width: number; height: number; priceAt: (y: number) => number },
) {
  const color = s.color || DEFAULT_COLOR
  const lw = s.width || 2
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = lw

  const [a, b] = pts

  switch (s.kind) {
    case 'hline': {
      ctx.beginPath()
      ctx.moveTo(0, a.y); ctx.lineTo(opts.width, a.y)
      ctx.stroke()
      label(ctx, s.text || fmt(s.points[0].p), 6, a.y - 5, color)
      break
    }
    case 'vline': {
      ctx.beginPath()
      ctx.moveTo(a.x, 0); ctx.lineTo(a.x, opts.height)
      ctx.stroke()
      if (s.text) label(ctx, s.text, a.x + 4, 14, color)
      break
    }
    case 'trendline': {
      if (!b) break
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      break
    }
    case 'ray': {
      if (!b) break
      // Extend past the second anchor to the edge of the canvas.
      const dx = b.x - a.x, dy = b.y - a.y
      const k = dx === 0 ? opts.height : (opts.width * 2) / Math.max(1e-6, Math.abs(dx))
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + dx * k, a.y + dy * k); ctx.stroke()
      break
    }
    case 'rect': {
      if (!b) break
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y)
      ctx.globalAlpha = 0.12; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1
      ctx.strokeRect(x, y, w, h)
      if (s.text) label(ctx, s.text, x + 4, y - 5, color)
      break
    }
    case 'fib': {
      if (!b) break
      const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x)
      const p1 = s.points[0].p, p2 = s.points[1].p
      for (const lv of FIB_LEVELS) {
        const price = p1 + (p2 - p1) * lv
        const y = yFor(price, a, b, s)
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.setLineDash(lv === 0 || lv === 1 ? [] : [4, 4])
        ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
        ctx.setLineDash([])
        label(ctx, `${(lv * 100).toFixed(1)}%  ${fmt(price)}`, x2 + 4, y - 3, color)
      }
      ctx.globalAlpha = 1
      break
    }
    case 'long':
    case 'short': {
      if (!b) break
      const isLong = s.kind === 'long'
      const entryY = a.y, targetY = b.y
      const stopY = s.stop != null ? yForPrice(s.stop, a, b, s) : entryY + (isLong ? 40 : -40)
      const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x)
      const w = Math.max(20, x2 - x1)
      // Reward zone (entry -> target) green, risk zone (entry -> stop) red --
      // the whole point of the tool is seeing the two areas against each other.
      ctx.globalAlpha = 0.15
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(x1, Math.min(entryY, targetY), w, Math.abs(targetY - entryY))
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x1, Math.min(entryY, stopY), w, Math.abs(stopY - entryY))
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      for (const [y, txt, c] of [
        [entryY, `Entry ${fmt(s.points[0].p)}`, '#e5e7eb'],
        [targetY, `Target ${fmt(s.points[1].p)}`, '#22c55e'],
        [stopY, `Stop ${s.stop != null ? fmt(s.stop) : '—'}`, '#ef4444'],
      ] as const) {
        ctx.strokeStyle = c as string
        ctx.beginPath(); ctx.moveTo(x1, y as number); ctx.lineTo(x1 + w, y as number); ctx.stroke()
        label(ctx, txt as string, x1 + 4, (y as number) - 4, c as string)
      }
      // R:R is the number you actually act on, so it gets its own chip.
      if (s.stop != null) {
        const risk = Math.abs(s.points[0].p - s.stop)
        const reward = Math.abs(s.points[1].p - s.points[0].p)
        if (risk > 0) {
          label(ctx, `R:R  1 : ${(reward / risk).toFixed(2)}`, x1 + w + 6, entryY, '#e5e7eb')
        }
      }
      break
    }
    case 'text': {
      label(ctx, s.text || '', a.x, a.y, color, true)
      break
    }
  }

  if (opts.selected) {
    ctx.setLineDash([])
    for (const p of pts) {
      ctx.beginPath()
      ctx.fillStyle = '#0d1117'
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
    }
  }
  ctx.restore()
}

// Fib/position levels interpolate in price space, so map a price back to y by
// using the two known anchor prices and their pixel positions.
function yForPrice(price: number, a: Px, b: Px, s: Shape): number {
  const p1 = s.points[0].p, p2 = s.points[1]?.p ?? p1
  if (p2 === p1) return a.y
  return a.y + ((price - p1) / (p2 - p1)) * (b.y - a.y)
}
const yFor = yForPrice

function fmt(n: number) { return n.toFixed(2) }

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, box = false) {
  if (!text) return
  ctx.save()
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif'
  const w = ctx.measureText(text).width
  ctx.fillStyle = box ? 'rgba(13,17,23,0.9)' : 'rgba(13,17,23,0.75)'
  ctx.fillRect(x - 3, y - 11, w + 6, 15)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** Distance from point to segment -- the basis of line hit-testing. */
export function distToSegment(px: number, py: number, a: Px, b: Px): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - a.x, py - a.y)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

export const HANDLE_HIT = 7
