import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/** One indicator/strategy line's value at the crosshair. */
export interface ReadoutSeries {
  label: string
  color: string
  value: number | null
}

/** Everything the chart's old overlay legend used to draw, as data.
 *
 *  The legend used to be an absolutely-positioned div inside LWChart that got
 *  innerHTML'd on every crosshair move. It now lives here so the same numbers
 *  can be rendered in more than one place at once -- the Market Insight panel
 *  and a floating window -- without the chart knowing about either. */
export interface ChartReadout {
  /** Chart identity: ticker, and a subtitle like "2026-06-23 → 2026-07-17 · 1m". */
  ticker: string
  meta: string
  /** Last bar's close, shown when the crosshair isn't over the chart. */
  lastClose: number | null
  /** Bar under the crosshair (candlestick mode), or null. */
  ohlc: { open: number; high: number; low: number; close: number } | null
  /** Value under the crosshair in line mode. */
  lineValue: number | null
  /** Named lines (indicators, strategy plots) with their value at the crosshair. */
  series: ReadoutSeries[]
}

const EMPTY: ChartReadout = {
  ticker: '', meta: '', lastClose: null, ohlc: null, lineValue: null, series: [],
}

interface Ctx {
  readout: ChartReadout
  /** Chart identity -- changes rarely. */
  setIdentity: (id: { ticker: string; meta: string; lastClose: number | null }) => void
  /** Crosshair values -- changes on every mouse move, so this is rAF-throttled. */
  setValues: (v: { ohlc: ChartReadout['ohlc']; lineValue: number | null; series: ReadoutSeries[] }) => void
  floating: boolean
  setFloating: (v: boolean) => void
}

const ChartReadoutContext = createContext<Ctx | null>(null)

export function ChartReadoutProvider({ children }: { children: ReactNode }) {
  const [readout, setReadout] = useState<ChartReadout>(EMPTY)
  const [floating, setFloating] = useState(false)

  // Crosshair moves fire far faster than React needs to re-render, so values
  // are staged in a ref and flushed once per frame. Without this, dragging
  // across a 7000-bar chart would queue a state update per mouse event.
  const pending = useRef<Partial<ChartReadout> | null>(null)
  const frame = useRef<number | null>(null)

  const flush = () => {
    frame.current = null
    const next = pending.current
    pending.current = null
    if (next) setReadout(prev => ({ ...prev, ...next }))
  }

  const schedule = (patch: Partial<ChartReadout>) => {
    pending.current = { ...(pending.current ?? {}), ...patch }
    if (frame.current == null) frame.current = requestAnimationFrame(flush)
  }

  const value = useMemo<Ctx>(() => ({
    readout,
    setIdentity: id => setReadout(prev =>
      prev.ticker === id.ticker && prev.meta === id.meta && prev.lastClose === id.lastClose
        ? prev
        : { ...prev, ...id }),
    setValues: v => schedule(v),
    floating,
    setFloating,
  }), [readout, floating])

  return <ChartReadoutContext.Provider value={value}>{children}</ChartReadoutContext.Provider>
}

export function useChartReadout(): Ctx {
  const ctx = useContext(ChartReadoutContext)
  if (!ctx) throw new Error('useChartReadout must be used inside <ChartReadoutProvider>')
  return ctx
}
