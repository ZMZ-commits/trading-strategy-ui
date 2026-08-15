import type { BacktestMeta } from '../../api/datasets'

interface Props {
  backtest: BacktestMeta | null
  /** Clamp displayed trades + total P&L to the chart's currently active
   *  range-tab/custom-window cutoff, instead of the whole dataset's history. */
  windowStart?: string | null
  windowEnd?: string | null
  /** Bar-replay playhead. Trades after it are withheld so the console fills in
   *  as the replay runs rather than revealing the whole result immediately. */
  cutoff?: string | null
}

/** Lab Platform: transactions + total P&L for the selected backtest run
 *  against the active dataset. Same buy/sell pairing + layout as the live
 *  Strategy Metrics panel. */
export function DatasetBacktestPanel({ backtest, windowStart, windowEnd, cutoff }: Props) {
  if (!backtest) return (
    <div className="flex-1 p-4 flex items-center justify-center">
      <p className="text-xs text-gray-600">Run a backtest (left) and select it to see results here</p>
    </div>
  )

  if (backtest.status !== 'completed' || !backtest.result) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-xs text-gray-600">
          {backtest.status === 'error' ? `Failed: ${backtest.error ?? 'unknown error'}` : `Backtest is ${backtest.status}…`}
        </p>
      </div>
    )
  }

  // Pair buy/sell over the FULL signal history first (so pnl pairing is
  // never broken by clipping mid-sequence), then clamp to the active window
  // for display -- same warmup-then-trim principle as the chart's indicators.
  let lastBuy: number | null = null
  const allRows = backtest.result.signals.map((s, i) => {
    let pnl: number | null = null
    if (s.type === 'buy') lastBuy = s.price
    else if (s.type === 'sell' && lastBuy != null) { pnl = s.price - lastBuy; lastBuy = null }
    return { key: i, time: s.time, type: s.type, price: s.price, pnl }
  })
  // Compare instants, never the raw strings: dataset bars carry a local UTC
  // offset ("...15:59:00-04:00") while backtest signals come back in UTC
  // ("...19:15:00+00:00"). Those are ordered differently as text than in time,
  // so string comparison silently dropped the final day's trades even with the
  // window at MAX.
  const ms = (t: string) => new Date(t).getTime()
  const windowed = windowStart && windowEnd
    ? allRows.filter(r => ms(r.time) >= ms(windowStart) && ms(r.time) <= ms(windowEnd))
    : allRows
  // During replay the list stops at the playhead, so the trades and the P&L
  // land as the bars do instead of showing the whole run up front.
  const rows = cutoff ? windowed.filter(r => ms(r.time) <= ms(cutoff)) : windowed
  const sum = (rs: typeof allRows) => {
    let t = 0, n = 0
    for (const r of rs) { if (r.pnl != null) { t += r.pnl; n++ } }
    return { total: t, trades: n }
  }
  const { total, trades } = sum(rows)
  // The Strategies list reports the whole RUN's P&L, while this panel follows
  // the chart's window. When a window hides some trades the two figures differ
  // -- which reads as a contradiction unless we say which is which, so show the
  // run total alongside whenever they diverge.
  const runStats = sum(allRows)
  const windowed = rows.length !== allRows.length

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{backtest.strategy_slug}</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-400 flex-shrink-0">backtest</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-600">No trades in this dataset</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-gray-600">
                <th className="text-left font-medium pb-1">Date</th>
                <th className="text-left font-medium pb-1">Side</th>
                <th className="text-right font-medium pb-1">Price</th>
                <th className="text-right font-medium pb-1">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-border/40">
                  <td className="py-1 text-gray-500 whitespace-nowrap">{new Date(r.time).toLocaleDateString()}</td>
                  <td className="py-1">
                    <span className={`font-semibold ${r.type === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                      {r.type === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono text-gray-300">${r.price.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono">
                    {r.pnl != null && (
                      <span className={r.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {r.pnl >= 0 ? '+' : ''}{r.pnl.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t border-border pt-2 mt-2 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-500">
          {windowed ? 'Window P&L' : 'Total P&L'}
          <span className="text-gray-600"> · {trades} trade{trades === 1 ? '' : 's'} · per share</span>
          {/* Say plainly why this disagrees with the figure in the Strategies
              list, which always covers the whole run. */}
          {windowed && (
            <span className="text-gray-600">
              {' · full run '}
              <span className={runStats.total >= 0 ? 'text-green-500/80' : 'text-red-500/80'}>
                {runStats.total >= 0 ? '+' : ''}${runStats.total.toFixed(2)}
              </span>
              {` over ${runStats.trades}`}
            </span>
          )}
        </span>
        <span className={`text-sm font-mono font-semibold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {total >= 0 ? '+' : ''}${total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
