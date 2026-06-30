// A lightweight-charts v5 series primitive that draws dotted vertical lines at
// given times, each with a small label at the top. Used for strategy buy/sell
// markers (Buy = red, Sell = green).
//
// Typed loosely (the chart/series objects) to avoid pulling in the full v5
// primitive type surface; the runtime shape matches the ISeriesPrimitive API.
import type { UTCTimestamp } from 'lightweight-charts'

export interface VertMarker {
  time: UTCTimestamp
  color: string
  label: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
class VertLinesRenderer {
  constructor(private source: VertLinesPrimitive) {}

  draw(target: any) {
    const chart = this.source.chart
    if (!chart) return
    const timeScale = chart.timeScale()
    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context as CanvasRenderingContext2D
      const hr = scope.horizontalPixelRatio
      const vr = scope.verticalPixelRatio
      const height = scope.bitmapSize.height
      for (const m of this.source.markers) {
        const x = timeScale.timeToCoordinate(m.time)
        if (x === null) continue
        const px = Math.round(x * hr)

        ctx.save()
        // dotted vertical line
        ctx.beginPath()
        ctx.setLineDash([4 * vr, 4 * vr])
        ctx.strokeStyle = m.color
        ctx.lineWidth = Math.max(1, Math.floor(hr))
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()

        // label chip at the top
        ctx.setLineDash([])
        ctx.font = `${Math.round(10 * vr)}px sans-serif`
        const padding = 3 * hr
        const textW = ctx.measureText(m.label).width
        const boxH = 14 * vr
        ctx.fillStyle = m.color
        ctx.fillRect(px + 1 * hr, 1 * vr, textW + padding * 2, boxH)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(m.label, px + 1 * hr + padding, 11 * vr)
        ctx.restore()
      }
    })
  }
}

class VertLinesPaneView {
  constructor(private source: VertLinesPrimitive) {}
  renderer() { return new VertLinesRenderer(this.source) }
  zOrder() { return 'top' as const }
}

export class VertLinesPrimitive {
  chart: any = null
  markers: VertMarker[]
  private paneView: VertLinesPaneView

  constructor(markers: VertMarker[]) {
    this.markers = markers
    this.paneView = new VertLinesPaneView(this)
  }

  attached(params: any) { this.chart = params.chart }
  detached() { this.chart = null }
  updateAllViews() { /* markers are static; nothing to recompute */ }
  paneViews() { return [this.paneView] }
}
