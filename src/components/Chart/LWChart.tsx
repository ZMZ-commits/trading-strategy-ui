import { useEffect, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, AreaSeries, LineSeries, HistogramSeries,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import type { OHLCBar } from '../../types'
import type { Indicators } from '../../hooks/useIndicators'
import type { CustomSeries } from '../../api/custom'
import type { StrategyChartData } from '../../api/strategyChart'
import { VertLinesPrimitive, type VertMarker } from './vertLinePrimitive'
import { DayBandsPrimitive, buildDayBands } from './dayBandsPrimitive'

type ChartType = 'candlestick' | 'line'

interface Props {
  data: OHLCBar[]
  type: ChartType
  showVolume: boolean
  indicators: Indicators
  oscillators: string[]
  custom?: CustomSeries[]
  strategy?: StrategyChartData
  /** Identifies the viewing window (ticker+range+interval+custom dates). The
   *  chart re-fits (shows end-to-end) whenever this changes; it otherwise
   *  preserves the user's zoom/pan (e.g. toggling an indicator or strategy). */
  fitKey: string
  /** Reports crosshair values upward. The readout used to be an overlay drawn
   *  inside this component; it is now rendered outside (Market Insight panel
   *  and the floating window), so the chart area stays clear. */
  onReadout?: (v: {
    ohlc: { open: number; high: number; low: number; close: number } | null
    lineValue: number | null
    series: { label: string; color: string; value: number | null }[]
  }) => void
  /** Hand-placed buy/sell marks, drawn like strategy signals but in their own
   *  layer so they can be toggled and edited independently. */
  labels?: { time: string; type: 'buy' | 'sell' }[]
  /** Fired when the chart is clicked while labelling is armed. Reports the bar
   *  the click landed on, so a mark always snaps to a real bar. */
  onBarClick?: (bar: { timestamp: string; close: number }) => void
  /** Hands out the chart + price series once they exist, so the drawing layer
   *  can convert between data and pixels. Fires again after every rebuild,
   *  because the series object is recreated each time. */
  onApiReady?: (api: { chart: any; series: any } | null) => void
  /** Where to put the view when fitKey changes. The chart is always handed the
   *  FULL series; this only positions the window, so zooming and panning out of
   *  it stays possible. Omit to fall back to fitContent(). */
  viewRange?: { from: string; to: string } | null
  /** Reports the visible window as real bar timestamps whenever the user zooms
   *  or pans, so the scrubber and the row/transaction tables can follow. */
  onVisibleRangeChange?: (from: string | null, to: string | null) => void
  /** Empty time slots to append before and after the data.
   *
   *  fixLeftEdge/fixRightEdge only PERMIT scrolling past the data -- the chart
   *  still will not scroll into time that has no slots at all, so blank space
   *  has to exist as real whitespace points. 0 disables the padding. */
  padBars?: number
}

/** ISO timestamp -> the chart's time coordinate. Exported so anything placing
 *  shapes uses the SAME conversion the series data used -- two copies of this
 *  drifting apart would misplace every annotation by a timezone offset. */
export const toTime = (ts: string): UTCTimestamp => {
  const d = new Date(ts)
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000) as UTCTimestamp
}

function lineData(ind: Indicators, key: string) {
  const s = ind[key]
  if (!s) return null
  const out: { time: UTCTimestamp; value: number }[] = []
  for (let i = 0; i < s.time.length; i++) {
    const v = s.values[i]
    if (v != null) out.push({ time: toTime(s.time[i]), value: v })
  }
  return out
}

function histData(ind: Indicators, key: string, pos: string, neg: string) {
  const s = ind[key]
  if (!s) return null
  const out: { time: UTCTimestamp; value: number; color: string }[] = []
  for (let i = 0; i < s.time.length; i++) {
    const v = s.values[i]
    if (v != null) out.push({ time: toTime(s.time[i]), value: v, color: v >= 0 ? pos : neg })
  }
  return out
}

const OVERLAYS: { key: string; color: string; label: string; dashed?: boolean }[] = [
  { key: 'sma20', color: '#f59e0b', label: 'SMA 20' },
  { key: 'sma50', color: '#a855f7', label: 'SMA 50' },
  { key: 'sma200', color: '#ec4899', label: 'SMA 200' },
  { key: 'ema20', color: '#14b8a6', label: 'EMA 20' },
  { key: 'bb_upper', color: 'rgba(96,165,250,0.45)', label: '' },
  { key: 'bb_mid', color: '#60a5fa', label: 'Bollinger', dashed: true },
  { key: 'bb_lower', color: 'rgba(96,165,250,0.45)', label: '' },
  // Donchian: only the upper band carries the legend label, so the pair reads
  // as one channel rather than two unrelated lines.
  { key: 'donchian_upper', color: '#22d3ee', label: 'Donchian' },
  { key: 'donchian_lower', color: '#22d3ee', label: '' },
  { key: 'vwap', color: '#eab308', label: 'VWAP' },
]

export function LWChart({ data, type, showVolume, indicators, oscillators, custom = [], strategy, fitKey, onReadout, labels, onBarClick, onApiReady, viewRange, onVisibleRangeChange, padBars = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<ISeriesApi<any>[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceRef = useRef<ISeriesApi<any> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labeled = useRef<{ s: ISeriesApi<any>; label: string; color: string }[]>([])
  const dataSig = useRef('')

  // Keep the latest callback in a ref so the crosshair subscription (bound
  // once at mount) always calls the current one.
  const readoutRef = useRef(onReadout)
  readoutRef.current = onReadout
  // Same trick for the click handler and the bar list: the subscription is
  // bound once at mount, so it reads both through refs.
  const clickRef = useRef(onBarClick)
  clickRef.current = onBarClick

  const barsRef = useRef<OHLCBar[]>(data)
  barsRef.current = data
  const rangeCbRef = useRef(onVisibleRangeChange)
  rangeCbRef.current = onVisibleRangeChange

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emitReadout(param?: any) {
    const cb = readoutRef.current
    if (!cb) return
    const pd = priceRef.current ? param?.seriesData?.get(priceRef.current) : undefined
    cb({
      ohlc: pd && pd.close != null
        ? { open: pd.open, high: pd.high, low: pd.low, close: pd.close }
        : null,
      lineValue: pd && pd.close == null && pd.value != null ? pd.value : null,
      series: labeled.current.map(it => {
        const d = param?.seriesData?.get(it.s)
        return { label: it.label, color: it.color, value: d && d.value != null ? d.value : null }
      }),
    })
  }

  // Create the chart once.
  useEffect(() => {
    if (!container.current) return
    const c = createChart(container.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280', fontSize: 11, attributionLogo: false,
      },
      grid: { vertLines: { color: '#1c2128' }, horzLines: { color: '#1c2128' } },
      rightPriceScale: { borderColor: '#21262d' },
      // minBarSpacing defaults to 0.5px, which caps how far fitContent() can
      // zoom out -- with a large dataset (e.g. thousands of 1m bars) MAX
      // couldn't compress far enough to show the whole thing end-to-end.
      timeScale: {
        borderColor: '#21262d', timeVisible: true, secondsVisible: false,
        minBarSpacing: 0.001,
        // The view must never be trapped against the data. Leaving both edges
        // unfixed (and keeping a right offset) means you can zoom out past the
        // whole dataset and drag beyond either end into empty chart, with the
        // time axis still drawn.
        fixLeftEdge: false, fixRightEdge: false, rightOffset: 12,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      crosshair: { mode: CrosshairMode.Normal },
    })
    chart.current = c
    c.subscribeCrosshairMove(p => emitReadout(p))

    // Report the visible window as REAL bar timestamps rather than inverting
    // toTime() -- the inverse drifts across a DST boundary, and the consumers
    // (scrubber, row table, transactions) all want bar timestamps anyway.
    // rAF-throttled because dragging fires this continuously.
    let rangeRaf = 0
    c.timeScale().subscribeVisibleTimeRangeChange(() => {
      if (rangeRaf) return
      rangeRaf = requestAnimationFrame(() => {
        rangeRaf = 0
        const cb = rangeCbRef.current
        if (!cb) return
        const r = c.timeScale().getVisibleRange()
        if (!r) { cb(null, null); return }
        const from = r.from as number
        const to = r.to as number
        let first: string | null = null
        let last: string | null = null
        for (const b of barsRef.current) {
          const t = toTime(b.timestamp)
          if (t >= from && t <= to) {
            if (first === null) first = b.timestamp
            last = b.timestamp
          }
        }
        cb(first, last)
      })
    })
    // Clicking reports the nearest bar rather than a raw coordinate, so a mark
    // can never land between bars.
    c.subscribeClick((p: any) => {
      const cb = clickRef.current
      if (!cb || p?.time == null) return
      const bars = barsRef.current
      let best: OHLCBar | null = null
      let bestDelta = Infinity
      for (const b of bars) {
        const d = Math.abs(toTime(b.timestamp) - (p.time as number))
        if (d < bestDelta) { bestDelta = d; best = b }
      }
      if (best) cb({ timestamp: best.timestamp, close: best.close })
    })
    return () => {
      if (rangeRaf) cancelAnimationFrame(rangeRaf)
      c.remove(); chart.current = null
      seriesRefs.current = []; priceRef.current = null; labeled.current = []; dataSig.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Single render pass — price + volume + overlays + oscillators built together so
  // the time scale and panes stay consistent across range switches.
  useEffect(() => {
    const c = chart.current
    if (!c) return
    // Every series gets torn down and rebuilt on any dependency change (not
    // just fitKey), including indicator/strategy-only updates. Lightweight
    // Charts doesn't reliably keep the prior visible range across a full
    // rebuild -- if a just-added series (e.g. an indicator windowed to a
    // wider focus than the candlesticks, via the dataset time scrubber) spans
    // more time than what was visible, the chart silently widens to show it.
    // Capture the range now and explicitly restore it below (unless this is
    // a real refit) so indicator/strategy-only changes never move the view.
    const savedRange = c.timeScale().getVisibleRange()
    for (const s of seriesRefs.current) { try { c.removeSeries(s) } catch { /* noop */ } }
    seriesRefs.current = []
    labeled.current = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const add = (def: any, opts: any, pane = 0) => { const s = c.addSeries(def, opts, pane); seriesRefs.current.push(s); return s }

    // Whitespace either side of the real bars, so there is somewhere to scroll
    // to. The step is the SMALLEST gap between bars -- using an average would
    // be skewed by overnight gaps and produce pad slots days apart.
    const pads = (() => {
      if (padBars <= 0 || data.length < 2) return { lead: [], trail: [] }
      let step = Infinity
      for (let i = 1; i < data.length; i++) {
        const d = toTime(data[i].timestamp) - toTime(data[i - 1].timestamp)
        if (d > 0 && d < step) step = d
      }
      if (!Number.isFinite(step)) return { lead: [], trail: [] }
      const first = toTime(data[0].timestamp)
      const last = toTime(data[data.length - 1].timestamp)
      const lead: { time: UTCTimestamp }[] = []
      const trail: { time: UTCTimestamp }[] = []
      for (let i = padBars; i >= 1; i--) lead.push({ time: (first - i * step) as UTCTimestamp })
      for (let i = 1; i <= padBars; i++) trail.push({ time: (last + i * step) as UTCTimestamp })
      return { lead, trail }
    })()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withPad = (rows: any[]) => (pads.lead.length ? [...pads.lead, ...rows, ...pads.trail] : rows)

    // Price (pane 0)
    if (type === 'candlestick') {
      const ps = add(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      })
      ps.setData(withPad(data.map(b => ({ time: toTime(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close }))))
      priceRef.current = ps
    } else {
      const ps = add(AreaSeries, { lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2 })
      ps.setData(withPad(data.map(b => ({ time: toTime(b.timestamp), value: b.close }))))
      priceRef.current = ps
    }

    // Volume (pane 0 overlay)
    if (showVolume) {
      const v = add(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' })
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
      v.setData(data.map(b => ({ time: toTime(b.timestamp), value: b.volume, color: b.close >= b.open ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)' })))
    }

    // Overlays (pane 0)
    for (const od of OVERLAYS) {
      const ld = lineData(indicators, od.key)
      if (ld && ld.length) {
        const s = add(LineSeries, {
          color: od.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
          lineStyle: od.dashed ? LineStyle.Dashed : LineStyle.Solid,
        })
        s.setData(ld)
        if (od.label) labeled.current.push({ s, label: od.label, color: od.color })
      }
    }

    // Oscillator panes
    let pane = 1
    for (const osc of oscillators) {
      if (osc === 'rsi') {
        const ld = lineData(indicators, 'rsi')
        if (ld) {
          const s = add(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'RSI' }, pane)
          s.setData(ld)
          s.createPriceLine({ price: 70, color: '#475569', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' })
          s.createPriceLine({ price: 30, color: '#475569', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' })
          pane++
        }
      } else if (osc === 'macd') {
        const m = lineData(indicators, 'macd')
        if (m) {
          add(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'MACD' }, pane).setData(m)
          const sig = lineData(indicators, 'macd_signal')
          if (sig) add(LineSeries, { color: '#f59e0b', lineWidth: 1 }, pane).setData(sig)
          const hist = histData(indicators, 'macd_hist', 'rgba(34,197,94,0.5)', 'rgba(239,68,68,0.5)')
          if (hist) add(HistogramSeries, { priceLineVisible: false }, pane).setData(hist)
          pane++
        }
      } else if (osc === 'squeeze') {
        const mom = histData(indicators, 'squeeze_mom', 'rgba(34,197,94,0.6)', 'rgba(239,68,68,0.6)')
        if (mom) {
          add(HistogramSeries, { priceLineVisible: false, title: 'Squeeze' }, pane).setData(mom)
          const on = indicators['squeeze_on']
          if (on) {
            const onPts: { time: UTCTimestamp; value: number }[] = []
            const offPts: { time: UTCTimestamp; value: number }[] = []
            for (let i = 0; i < on.time.length; i++) {
              const val = on.values[i]
              if (val == null) continue
              ;(val >= 1 ? onPts : offPts).push({ time: toTime(on.time[i]), value: 0 })
            }
            const dotOpts = { lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 2, lastValueVisible: false, priceLineVisible: false }
            if (onPts.length) add(LineSeries, { ...dotOpts, color: '#ef4444' }, pane).setData(onPts)
            if (offPts.length) add(LineSeries, { ...dotOpts, color: '#22c55e' }, pane).setData(offPts)
          }
          pane++
        }
      } else if (osc === 'stoch') {
        const k = lineData(indicators, 'stoch_k')
        if (k) {
          const s = add(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'Stoch' }, pane)
          s.setData(k)
          const d = lineData(indicators, 'stoch_d')
          if (d) add(LineSeries, { color: '#f59e0b', lineWidth: 1 }, pane).setData(d)
          s.createPriceLine({ price: 80, color: '#475569', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '80' })
          s.createPriceLine({ price: 20, color: '#475569', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '20' })
          pane++
        }
      }
    }

    // Custom (user-published) indicators — generic render by kind: overlays on
    // the price pane, oscillators each in their own pane (continuing the counter).
    const CUSTOM_COLORS = ['#06b6d4', '#84cc16', '#f472b6', '#fb923c', '#a78bfa', '#34d399']
    let ci = 0
    for (const cs of custom) {
      const pts: { time: UTCTimestamp; value: number }[] = []
      for (let i = 0; i < cs.time.length; i++) {
        const v = cs.values[i]
        if (v != null) pts.push({ time: toTime(cs.time[i]), value: v })
      }
      if (!pts.length) continue
      const color = CUSTOM_COLORS[ci % CUSTOM_COLORS.length]; ci++
      if (cs.kind === 'oscillator') {
        add(LineSeries, { color, lineWidth: 1, title: cs.name }, pane).setData(pts)
        pane++
      } else {
        const s = add(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        s.setData(pts)
        labeled.current.push({ s, label: cs.name, color })
      }
    }

    // Strategy: dashed trailing line(s) + dotted Buy/Sell vertical markers
    // (Buy = red, Sell = green). Overlay-kind lines (e.g. a trailing-stop
    // level) share the price pane/scale; oscillator-kind lines (e.g. an ATR
    // a strategy plots for its own reference) get their own pane, same as
    // custom published indicators just above -- otherwise a wildly
    // different-scale series (ATR ~10s vs. price in the thousands) wrecks
    // the price pane's autoscale and squishes the candles flat.
    if (strategy) {
      const STRAT_COLORS = ['#eab308', '#22d3ee', '#f472b6', '#a78bfa', '#4ade80']
      let si = 0
      for (const ln of strategy.lines) {
        const pts: { time: UTCTimestamp; value: number }[] = []
        for (let i = 0; i < ln.time.length; i++) {
          const v = ln.values[i]
          if (v != null) pts.push({ time: toTime(ln.time[i]), value: v })
        }
        if (!pts.length) continue
        const color = STRAT_COLORS[si % STRAT_COLORS.length]; si++
        if (ln.kind === 'oscillator') {
          add(LineSeries, { color, lineWidth: 1, title: ln.name }, pane).setData(pts)
          pane++
          continue
        }
        const s = add(LineSeries, {
          color, lineWidth: 2, lineStyle: LineStyle.Dashed,
          priceLineVisible: false, lastValueVisible: false,
        })
        s.setData(pts)
        labeled.current.push({ s, label: ln.name, color })
      }
      if (strategy.signals.length && priceRef.current) {
        const markers: VertMarker[] = strategy.signals.map(sig => ({
          time: toTime(sig.time),
          color: sig.type === 'buy' ? '#ef4444' : '#22c55e',
          label: sig.type === 'buy' ? 'Buy' : 'Sell',
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { (priceRef.current as any).attachPrimitive(new VertLinesPrimitive(markers)) } catch { /* noop */ }
      }
    }

    // Hand-placed labels: same vertical-marker treatment as strategy signals
    // but brighter, so your own marks read as distinct from generated ones.
    if (labels && labels.length && priceRef.current) {
      const marks: VertMarker[] = labels.map(l => ({
        time: toTime(l.time),
        color: l.type === 'buy' ? '#f87171' : '#4ade80',
        label: l.type === 'buy' ? '▲' : '▼',
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (priceRef.current as any).attachPrimitive(new VertLinesPrimitive(marks)) } catch { /* noop */ }
    }

    // Alternating session shading. Attached before the marker primitives so it
    // paints underneath them, and skipped entirely for single-day or daily data
    // where per-day bands carry no information.
    if (priceRef.current) {
      const bands = buildDayBands(data, toTime)
      if (bands.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { (priceRef.current as any).attachPrimitive(new DayBandsPrimitive(bands)) } catch { /* noop */ }
      }
    }

    // Pane sizing via stretch factors — price always dominant, oscillators compact.
    try {
      const panes = c.panes()
      if (panes.length > 1) {
        panes[0].setStretchFactor((panes.length - 1) + 2)
        for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1)
      }
    } catch { /* noop */ }

    // Refit only when the viewing window actually changed (ticker/range/interval/
    // custom dates) -- NOT when the underlying bars merely re-render, and NOT on
    // indicator/strategy toggles, so zoom is preserved for those. Using an
    // explicit key (rather than inferring from data timestamps) avoids missing a
    // refit when e.g. only the ticker changes but the date span looks the same.
    if (fitKey !== dataSig.current) {
      // The series spans the whole dataset (plus blank padding), so fitContent()
      // would show all of it. Position the window explicitly instead.
      //
      // Applied again on the next frame: setVisibleRange is silently ignored
      // when the chart has not laid out yet, which left the initial view
      // stranded in the trailing whitespace instead of on the data.
      const position = () => {
        if (viewRange) {
          try {
            c.timeScale().setVisibleRange({ from: toTime(viewRange.from), to: toTime(viewRange.to) })
            return true
          } catch { /* fall through */ }
        }
        if (pads.lead.length && data.length > 1) {
          try {
            c.timeScale().setVisibleRange({
              from: toTime(data[0].timestamp), to: toTime(data[data.length - 1].timestamp),
            })
            return true
          } catch { /* fall through */ }
        }
        c.timeScale().fitContent()
        return true
      }
      position()
      requestAnimationFrame(() => { if (chart.current === c) position() })
      dataSig.current = fitKey
    } else if (savedRange) {
      // Not a real refit -- put the view back exactly where it was instead of
      // trusting whatever range the rebuilt series settled on.
      try { c.timeScale().setVisibleRange(savedRange) } catch { /* noop */ }
    }
    emitReadout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onApiReady?.({ chart: c, series: priceRef.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, showVolume, indicators, oscillators, custom, strategy, fitKey, labels])

  // Nothing overlays the plot any more -- the readout is rendered outside, so
  // the chart gets its whole box.
  return <div ref={container} className="w-full h-full" />
}
