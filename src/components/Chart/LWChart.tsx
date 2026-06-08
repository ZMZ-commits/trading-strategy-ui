import { useEffect, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
  type CandlestickData, type AreaData, type HistogramData,
} from 'lightweight-charts'
import type { OHLCBar } from '../../types'

type ChartType = 'candlestick' | 'line'

interface Props {
  data: OHLCBar[]
  type: ChartType
  showVolume: boolean
}

// lightweight-charts renders times in UTC; shift by the viewer's offset so the
// axis shows local time instead of UTC.
const toTime = (ts: string): UTCTimestamp => {
  const d = new Date(ts)
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000) as UTCTimestamp
}

export function LWChart({ data, type, showVolume }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const price = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null)
  const vol = useRef<ISeriesApi<'Histogram'> | null>(null)

  // Create the chart once.
  useEffect(() => {
    if (!container.current) return
    const c = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#6b7280', fontSize: 11 },
      grid: { vertLines: { color: '#1c2128' }, horzLines: { color: '#1c2128' } },
      rightPriceScale: { borderColor: '#21262d' },
      timeScale: { borderColor: '#21262d', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    })
    chart.current = c
    return () => {
      c.remove()
      chart.current = null
      price.current = null
      vol.current = null
    }
  }, [])

  // (Re)build the price series when the chart type changes.
  useEffect(() => {
    const c = chart.current
    if (!c) return
    if (price.current) { c.removeSeries(price.current); price.current = null }
    if (type === 'candlestick') {
      price.current = c.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      })
    } else {
      price.current = c.addAreaSeries({
        lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2,
      })
    }
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // Toggle the volume histogram (overlay on the bottom of the price pane).
  useEffect(() => {
    const c = chart.current
    if (!c) return
    if (showVolume && !vol.current) {
      const v = c.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' })
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
      vol.current = v
    } else if (!showVolume && vol.current) {
      c.removeSeries(vol.current); vol.current = null
    }
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVolume])

  // Push new data whenever it changes.
  useEffect(() => { apply() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data])

  function apply() {
    const ps = price.current
    if (!ps) return
    if (type === 'candlestick') {
      const cd: CandlestickData[] = data.map(b => ({
        time: toTime(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close,
      }))
      ;(ps as ISeriesApi<'Candlestick'>).setData(cd)
    } else {
      const ad: AreaData[] = data.map(b => ({ time: toTime(b.timestamp), value: b.close }))
      ;(ps as ISeriesApi<'Area'>).setData(ad)
    }
    if (vol.current) {
      const vd: HistogramData[] = data.map(b => ({
        time: toTime(b.timestamp),
        value: b.volume,
        color: b.close >= b.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
      }))
      vol.current.setData(vd)
    }
    chart.current?.timeScale().fitContent()
  }

  return <div ref={container} className="w-full h-full" />
}
