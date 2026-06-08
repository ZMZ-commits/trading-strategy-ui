import { useEffect, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode,
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
  oscillators: string[] // ordered, e.g. ['rsi','macd','squeeze','stoch']
}

// lightweight-charts renders in UTC; shift by the viewer offset to show local time.
const toTime = (ts: string): UTCTimestamp => {
  const d = new Date(ts)
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000) as UTCTimestamp
}

// {time,value} line points from an indicator series, skipping nulls.
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

// histogram points colored by sign.
function histData(ind: Indicators, key: string, posColor: string, negColor: string) {
  const s = ind[key]
  if (!s) return null
  const out: { time: UTCTimestamp; value: number; color: string }[] = []
  for (let i = 0; i < s.time.length; i++) {
    const v = s.values[i]
    if (v != null) out.push({ time: toTime(s.time[i]), value: v, color: v >= 0 ? posColor : negColor })
  }
  return out
}

const OVERLAYS: { key: string; color: string }[] = [
  { key: 'sma20', color: '#f59e0b' }, { key: 'sma50', color: '#a855f7' }, { key: 'sma200', color: '#ec4899' },
  { key: 'ema20', color: '#14b8a6' },
  { key: 'bb_upper', color: '#64748b' }, { key: 'bb_mid', color: '#475569' }, { key: 'bb_lower', color: '#64748b' },
  { key: 'vwap', color: '#eab308' },
]

export function LWChart({ data, type, showVolume, indicators, oscillators }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<ISeriesApi<any>[]>([])

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
    return () => { c.remove(); chart.current = null; seriesRefs.current = [] }
  }, [])

  // Rebuild all series whenever inputs change.
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
      const s = add(CandlestickSeries, {
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      })
      s.setData(data.map(b => ({ time: toTime(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close })))
    } else {
      const s = add(AreaSeries, {
        lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2,
      })
      s.setData(data.map(b => ({ time: toTime(b.timestamp), value: b.close })))
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
        const s = add(LineSeries, { color: od.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        s.setData(ld)
      }
    }

    // Oscillator panes
    let pane = 1
    for (const osc of oscillators) {
      if (osc === 'rsi') {
        const ld = lineData(indicators, 'rsi')
        if (ld) { add(LineSeries, { color: '#3b82f6', lineWidth: 1 }, pane).setData(ld); pane++ }
      } else if (osc === 'macd') {
        const m = lineData(indicators, 'macd')
        if (m) {
          add(LineSeries, { color: '#3b82f6', lineWidth: 1 }, pane).setData(m)
          const sig = lineData(indicators, 'macd_signal')
          if (sig) add(LineSeries, { color: '#f59e0b', lineWidth: 1 }, pane).setData(sig)
          const hist = histData(indicators, 'macd_hist', 'rgba(34,197,94,0.5)', 'rgba(239,68,68,0.5)')
          if (hist) add(HistogramSeries, {}, pane).setData(hist)
          pane++
        }
      } else if (osc === 'squeeze') {
        const mom = histData(indicators, 'squeeze_mom', 'rgba(34,197,94,0.6)', 'rgba(239,68,68,0.6)')
        if (mom) { add(HistogramSeries, {}, pane).setData(mom); pane++ }
      } else if (osc === 'stoch') {
        const k = lineData(indicators, 'stoch_k')
        if (k) {
          add(LineSeries, { color: '#3b82f6', lineWidth: 1 }, pane).setData(k)
          const d = lineData(indicators, 'stoch_d')
          if (d) add(LineSeries, { color: '#f59e0b', lineWidth: 1 }, pane).setData(d)
          pane++
        }
      }
    }

    // Keep oscillator panes compact, price pane large.
    try {
      const panes = c.panes()
      for (let i = 1; i < panes.length; i++) panes[i].setHeight(110)
    } catch { /* noop */ }

    c.timeScale().fitContent()
  }, [data, type, showVolume, indicators, oscillators])

  return <div ref={container} className="w-full h-full" />
}
