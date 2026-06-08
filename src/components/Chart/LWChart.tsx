import { useEffect, useMemo, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, AreaSeries, LineSeries, HistogramSeries,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import type { OHLCBar } from '../../types'
import type { Indicators } from '../../hooks/useIndicators'

type ChartType = 'candlestick' | 'line'

interface Props {
  data: OHLCBar[]
  type: ChartType
  showVolume: boolean
  indicators: Indicators
  oscillators: string[]
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

const OVERLAYS: { key: string; color: string; label: string }[] = [
  { key: 'sma20', color: '#f59e0b', label: 'SMA 20' },
  { key: 'sma50', color: '#a855f7', label: 'SMA 50' },
  { key: 'sma200', color: '#ec4899', label: 'SMA 200' },
  { key: 'ema20', color: '#14b8a6', label: 'EMA 20' },
  { key: 'bb_upper', color: '#64748b', label: '' },
  { key: 'bb_mid', color: '#475569', label: 'Bollinger' },
  { key: 'bb_lower', color: '#64748b', label: '' },
  { key: 'vwap', color: '#eab308', label: 'VWAP' },
]

export function LWChart({ data, type, showVolume, indicators, oscillators }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<ISeriesApi<any>[]>([])
  const dataSig = useRef<string>('')

  // Legend for the price-pane overlays.
  const legend = useMemo(
    () => OVERLAYS.filter(o => o.label && indicators[o.key] != null).map(o => ({ label: o.label, color: o.color })),
    [indicators],
  )

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
    return () => { c.remove(); chart.current = null; seriesRefs.current = []; dataSig.current = '' }
  }, [])

  useEffect(() => {
    const c = chart.current
    if (!c) return
    for (const s of seriesRefs.current) { try { c.removeSeries(s) } catch { /* noop */ } }
    seriesRefs.current = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const add = (def: any, opts: any, pane = 0) => {
      const s = c.addSeries(def, opts, pane)
      seriesRefs.current.push(s)
      return s
    }

    // Price (pane 0)
    if (type === 'candlestick') {
      add(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      }).setData(data.map(b => ({ time: toTime(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close })))
    } else {
      add(AreaSeries, {
        lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2,
      }).setData(data.map(b => ({ time: toTime(b.timestamp), value: b.close })))
    }

    // Volume (pane 0 overlay)
    if (showVolume) {
      const v = add(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' })
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
      v.setData(data.map(b => ({
        time: toTime(b.timestamp), value: b.volume,
        color: b.close >= b.open ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
      })))
    }

    // Overlays (pane 0)
    for (const od of OVERLAYS) {
      const ld = lineData(indicators, od.key)
      if (ld && ld.length) {
        add(LineSeries, { color: od.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(ld)
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
          // on/off dots on the zero line (red = squeeze on, green = off/fired)
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

    // Keep oscillator panes compact.
    try {
      const panes = c.panes()
      for (let i = 1; i < panes.length; i++) panes[i].setHeight(110)
    } catch { /* noop */ }

    // Only refit when the underlying data window changed (preserve zoom on toggles).
    const sig = `${data.length}:${data[0]?.timestamp ?? ''}:${data[data.length - 1]?.timestamp ?? ''}`
    if (sig !== dataSig.current) {
      c.timeScale().fitContent()
      dataSig.current = sig
    }
  }, [data, type, showVolume, indicators, oscillators])

  return (
    <div className="relative w-full h-full">
      <div ref={container} className="w-full h-full" />
      {legend.length > 0 && (
        <div className="absolute top-1 left-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] pointer-events-none">
          {legend.map(it => (
            <span key={it.label} className="flex items-center gap-1 text-gray-400">
              <span className="inline-block h-[2px] w-3" style={{ backgroundColor: it.color }} />
              {it.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
