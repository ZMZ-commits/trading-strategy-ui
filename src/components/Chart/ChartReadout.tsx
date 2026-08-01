import { useChartReadout } from '../../state/chartReadout'

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(2))

/** The chart's crosshair readout — OHLC plus each plotted line's value.
 *
 *  Rendered in two places at once (the Market Insight panel and the floating
 *  window), so it reads straight from context rather than taking props. */
export function ChartReadout({ compact = false }: { compact?: boolean }) {
  const { readout } = useChartReadout()
  const { ticker, meta, lastClose, ohlc, lineValue, series } = readout

  if (!ticker) {
    return <p className="text-[11px] text-gray-600">No chart active</p>
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-bold text-gray-100">{ticker}</span>
        {lastClose != null && (
          <span className="text-sm font-mono text-gray-300">${lastClose.toFixed(2)}</span>
        )}
      </div>
      {meta && <p className="text-[10px] text-gray-600 leading-tight">{meta}</p>}

      {/* OHLC of the hovered bar; falls back to a hint when not hovering. */}
      {ohlc ? (
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-mono tabular-nums">
          {([['O', ohlc.open], ['H', ohlc.high], ['L', ohlc.low], ['C', ohlc.close]] as const).map(([k, v]) => (
            <span key={k}>
              <span className="text-gray-500">{k}</span>
              <span className={k === 'C' && ohlc.close >= ohlc.open ? 'text-green-400' : k === 'C' ? 'text-red-400' : 'text-gray-300'}>
                {' '}{fmt(v)}
              </span>
            </span>
          ))}
        </div>
      ) : lineValue != null ? (
        <div className="text-[11px] font-mono text-gray-300 tabular-nums">{fmt(lineValue)}</div>
      ) : (
        <p className="text-[10px] text-gray-700 italic">Hover the chart for bar values</p>
      )}

      {series.length > 0 && (
        <div className={`flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] ${compact ? '' : 'pt-0.5'}`}>
          {series.map(s => (
            <span key={s.label} className="whitespace-nowrap">
              <span style={{ color: s.color }}>●</span>
              <span className="text-gray-500"> {s.label}</span>
              {s.value != null && <span className="text-gray-300 font-mono tabular-nums"> {fmt(s.value)}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
