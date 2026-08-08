// A lightweight-charts v5 series primitive that shades alternate trading days
// and names each one, so a multi-day intraday chart reads as a sequence of
// sessions instead of one undifferentiated ribbon of candles.
//
// Drawn at zOrder 'bottom' so it sits behind the candles rather than over them.
// Typed loosely for the same reason as vertLinePrimitive.ts.
import type { UTCTimestamp } from 'lightweight-charts'

export interface DayBand {
  /** First bar of the session. */
  from: UTCTimestamp
  /** Last bar of the session. */
  to: UTCTimestamp
  label: string
  /** Alternating flag -- only every other band is tinted. */
  shaded: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
class DayBandsRenderer {
  constructor(private source: DayBandsPrimitive) {}

  draw(target: any) {
    const chart = this.source.chart
    if (!chart) return
    const timeScale = chart.timeScale()
    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context as CanvasRenderingContext2D
      const hr = scope.horizontalPixelRatio
      const vr = scope.verticalPixelRatio
      const { width, height } = scope.bitmapSize

      ctx.save()
      ctx.font = `${Math.round(10 * vr)}px sans-serif`

      for (const b of this.source.bands) {
        const x1 = timeScale.timeToCoordinate(b.from)
        const x2 = timeScale.timeToCoordinate(b.to)
        if (x1 === null || x2 === null) continue

        // Clamp to the visible area: a session running off-screen still needs
        // its on-screen part shaded, and its label kept where it can be read.
        const left = Math.max(0, Math.round(x1 * hr))
        const right = Math.min(width, Math.round(x2 * hr))
        if (right <= 0 || left >= width) continue

        if (b.shaded) {
          ctx.fillStyle = this.source.tint
          ctx.fillRect(left, 0, right - left, height)
        }

        // Session boundary: the line people actually navigate by.
        ctx.beginPath()
        ctx.strokeStyle = this.source.divider
        ctx.lineWidth = Math.max(1, Math.floor(hr))
        ctx.moveTo(left, 0)
        ctx.lineTo(left, height)
        ctx.stroke()

        // Only label a band wide enough to hold the text, so zoomed-out views
        // don't turn into a smear of overlapping dates.
        const textW = ctx.measureText(b.label).width
        if (right - left > textW + 12 * hr) {
          ctx.fillStyle = this.source.labelColor
          ctx.fillText(b.label, left + 5 * hr, 12 * vr)
        }
      }
      ctx.restore()
    })
  }
}

class DayBandsPaneView {
  constructor(private source: DayBandsPrimitive) {}
  renderer() { return new DayBandsRenderer(this.source) }
  zOrder() { return 'bottom' as const }
}

export class DayBandsPrimitive {
  chart: any = null
  bands: DayBand[]
  tint: string
  divider: string
  labelColor: string
  private paneView: DayBandsPaneView

  constructor(bands: DayBand[], opts?: { tint?: string; divider?: string; labelColor?: string }) {
    this.bands = bands
    this.tint = opts?.tint ?? 'rgba(255,255,255,0.035)'
    this.divider = opts?.divider ?? 'rgba(148,163,184,0.22)'
    this.labelColor = opts?.labelColor ?? 'rgba(148,163,184,0.75)'
    this.paneView = new DayBandsPaneView(this)
  }

  attached(params: any) { this.chart = params.chart }
  detached() { this.chart = null }
  updateAllViews() { /* bands are static for a given data set */ }
  paneViews() { return [this.paneView] }
}

/** Group bars into one band per calendar day, alternating the tint.
 *
 *  Returns [] for single-day or daily-and-coarser data, where per-day shading
 *  would either do nothing or stripe every candle. */
export function buildDayBands(
  bars: { timestamp: string }[],
  toTime: (iso: string) => UTCTimestamp,
): DayBand[] {
  if (bars.length < 2) return []

  const bands: DayBand[] = []
  let dayKey = ''
  for (const bar of bars) {
    // Slice the local date out of the ISO string rather than going through
    // Date: the timestamps already carry the exchange's offset, and re-parsing
    // into the viewer's zone would split sessions at the wrong hour.
    const key = bar.timestamp.slice(0, 10)
    if (key !== dayKey) {
      dayKey = key
      bands.push({
        from: toTime(bar.timestamp),
        to: toTime(bar.timestamp),
        label: new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric',
        }),
        shaded: bands.length % 2 === 1,
      })
    } else {
      bands[bands.length - 1].to = toTime(bar.timestamp)
    }
  }

  // One band means one day: nothing to distinguish, so draw nothing.
  return bands.length > 1 ? bands : []
}
