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

type ChartType = 'candlestick' | 'line'

interface Props {
  data: OHLCBar[]
  type: ChartType
  showVolume: boolean
  indicators: Indicators
  oscillators: string[]
  custom?: CustomSeries[]
}

const toTime = (ts: string): UTCTimestamp => {
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
  { key: 'vwap', color: '#eab308', label: 'VWAP' },
]

export function LWChart({ data, type, showVolume, indicators, oscillators, custom = [] }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<ISeriesApi<any>[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceRef = useRef<ISeriesApi<any> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labeled = useRef<{ s: ISeriesApi<any>; label: string; color: string }[]>([])
  const dataSig = useRef('')

  const fmt = (n: number | undefined) => (n == null ? '' : n.toFixed(2))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderLegend(param?: any) {
    const el = legendRef.current
    if (!el) return
    const parts: string[] = []
    const pd = priceRef.current ? param?.seriesData?.get(priceRef.current) : undefined
    if (pd) {
      if (pd.close != null) parts.push(`<b style="color:#cbd5e1">O</b>${fmt(pd.open)} <b style="color:#cbd5e1">H</b>${fmt(pd.high)} <b style="color:#cbd5e1">L</b>${fmt(pd.low)} <b style="color:#cbd5e1">C</b>${fmt(pd.close)}`)
      else if (pd.value != null) parts.push(`<span style="color:#cbd5e1">${fmt(pd.value)}</span>`)
    }
    for (const it of labeled.current) {
      const d = param?.seriesData?.get(it.s)
      const val = d && d.value != null ? ' ' + fmt(d.value) : ''
      parts.push(`<span style="color:${it.color}">●</span><span style="color:#9ca3af"> ${it.label}${val}</span>`)
    }
    el.innerHTML = parts.join('&nbsp;&nbsp;&nbsp;')
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
      timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    })
    chart.current = c
    c.subscribeCrosshairMove(p => renderLegend(p))
    return () => {
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
    for (const s of seriesRefs.current) { try { c.removeSeries(s) } catch { /* noop */ } }
    seriesRefs.current = []
    labeled.current = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const add = (def: any, opts: any, pane = 0) => { const s = c.addSeries(def, opts, pane); seriesRefs.current.push(s); return s }

    // Price (pane 0)
    if (type === 'candlestick') {
      const ps = add(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      })
      ps.setData(data.map(b => ({ time: toTime(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close })))
      priceRef.current = ps
    } else {
      const ps = add(AreaSeries, { lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2 })
      ps.setData(data.map(b => ({ time: toTime(b.timestamp), value: b.close })))
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

    // Pane sizing via stretch factors — price always dominant, oscillators compact.
    try {
      const panes = c.panes()
      if (panes.length > 1) {
        panes[0].setStretchFactor((panes.length - 1) + 2)
        for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1)
      }
    } catch { /* noop */ }

    // Refit only when the data window changed (preserve zoom on indicator toggles).
    const sig = `${data.length}:${data[0]?.timestamp ?? ''}:${data[data.length - 1]?.timestamp ?? ''}`
    if (sig !== dataSig.current) { c.timeScale().fitContent(); dataSig.current = sig }
    renderLegend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, showVolume, indicators, oscillators, custom])

  return (
    <div className="relative w-full h-full">
      <div ref={container} className="w-full h-full" />
      <div
        ref={legendRef}
        className="absolute top-1 left-2 text-[11px] leading-snug pointer-events-none rounded px-1.5 py-0.5"
        style={{ background: 'rgba(13,17,23,0.6)' }}
      />
    </div>
  )
}
