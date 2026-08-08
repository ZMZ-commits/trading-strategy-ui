// A lightweight-charts v5 series primitive that draws hand-made annotations --
// boxes, horizontal levels, arrows and text tags -- anchored to time/price so
// they track the chart when it's zoomed or panned.
//
// Typed loosely (chart/series objects) to avoid pulling in the full v5
// primitive type surface; the runtime shape matches the ISeriesPrimitive API.
import type { UTCTimestamp } from 'lightweight-charts'

export type DrawingKind = 'box' | 'hline' | 'arrow-up' | 'arrow-down' | 'text'

export interface DrawingShape {
  id: string
  kind: DrawingKind
  t1: UTCTimestamp
  p1: number
  t2?: UTCTimestamp
  p2?: number
  text?: string
  color?: string
}

const DEFAULT_COLOR = '#f59e0b'
const UP_COLOR = '#22c55e'
const DOWN_COLOR = '#ef4444'

/* eslint-disable @typescript-eslint/no-explicit-any */
class DrawingsRenderer {
  constructor(private source: DrawingsPrimitive) {}

  draw(target: any) {
    const chart = this.source.chart
    const series = this.source.series
    if (!chart || !series) return
    const timeScale = chart.timeScale()

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context as CanvasRenderingContext2D
      const hr = scope.horizontalPixelRatio
      const vr = scope.verticalPixelRatio
      const width = scope.bitmapSize.width

      for (const d of this.source.shapes) {
        const x1 = timeScale.timeToCoordinate(d.t1)
        const y1 = series.priceToCoordinate(d.p1)
        if (x1 === null || y1 === null) continue
        const px1 = x1 * hr
        const py1 = y1 * vr
        const color = d.color || (d.kind === 'arrow-up' ? UP_COLOR : d.kind === 'arrow-down' ? DOWN_COLOR : DEFAULT_COLOR)

        ctx.save()
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = Math.max(1, Math.floor(1.5 * hr))

        if (d.kind === 'hline') {
          // Spans the full width: a level is about the price, not the bar it
          // was clicked on.
          ctx.beginPath()
          ctx.setLineDash([6 * hr, 4 * hr])
          ctx.moveTo(0, py1)
          ctx.lineTo(width, py1)
          ctx.stroke()
          ctx.setLineDash([])
          if (d.text) this.tag(ctx, d.text, 6 * hr, py1 - 4 * vr, color, hr)
        } else if (d.kind === 'box' && d.t2 != null && d.p2 != null) {
          const x2 = timeScale.timeToCoordinate(d.t2)
          const y2 = series.priceToCoordinate(d.p2)
          if (x2 === null || y2 === null) { ctx.restore(); continue }
          const px2 = x2 * hr
          const py2 = y2 * vr
          const left = Math.min(px1, px2)
          const top = Math.min(py1, py2)
          const w = Math.abs(px2 - px1)
          const h = Math.abs(py2 - py1)
          ctx.globalAlpha = 0.12
          ctx.fillRect(left, top, w, h)
          ctx.globalAlpha = 1
          ctx.strokeRect(left, top, w, h)
          if (d.text) this.tag(ctx, d.text, left + 4 * hr, top - 4 * vr, color, hr)
        } else if (d.kind === 'arrow-up' || d.kind === 'arrow-down') {
          const up = d.kind === 'arrow-up'
          const size = 7 * hr
          // Point the tip AT the anchored price, body hanging away from it, so
          // the arrow marks the level rather than floating near it.
          const tipY = py1
          const baseY = up ? py1 + size * 2 : py1 - size * 2
          ctx.beginPath()
          ctx.moveTo(px1, tipY)
          ctx.lineTo(px1 - size, baseY)
          ctx.lineTo(px1 + size, baseY)
          ctx.closePath()
          ctx.fill()
          if (d.text) this.tag(ctx, d.text, px1 + size + 3 * hr, baseY, color, hr)
        } else if (d.kind === 'text') {
          this.tag(ctx, d.text || '', px1, py1, color, hr)
        }
        ctx.restore()
      }
    })
  }

  private tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, hr: number) {
    if (!text) return
    ctx.save()
    ctx.font = `${Math.round(11 * hr)}px ui-sans-serif, system-ui, sans-serif`
    const w = ctx.measureText(text).width
    const padX = 4 * hr
    const h = 15 * hr
    ctx.fillStyle = 'rgba(13,17,23,0.85)'
    ctx.fillRect(x - padX, y - h + 3 * hr, w + padX * 2, h)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    ctx.restore()
  }
}

class DrawingsPaneView {
  constructor(private source: DrawingsPrimitive) {}
  renderer() { return new DrawingsRenderer(this.source) }
  zOrder() { return 'top' as const }
}

export class DrawingsPrimitive {
  chart: any = null
  series: any = null
  shapes: DrawingShape[]
  private paneView: DrawingsPaneView

  constructor(shapes: DrawingShape[]) {
    this.shapes = shapes
    this.paneView = new DrawingsPaneView(this)
  }

  attached(params: any) {
    this.chart = params.chart
    // Shapes are anchored to price as well as time, so unlike the vertical
    // markers this needs the series to convert prices to coordinates.
    this.series = params.series
  }

  detached() {
    this.chart = null
    this.series = null
  }

  updateAllViews() { /* shapes are static between rebuilds */ }
  paneViews() { return [this.paneView] }
}
