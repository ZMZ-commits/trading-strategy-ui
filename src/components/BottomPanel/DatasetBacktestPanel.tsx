import type { BacktestMeta } from '../../api/datasets'

/** Lab Platform: transactions + total P&L for the selected backtest run
 *  against the active dataset. Same buy/sell pairing + layout as the live
 *  Strategy Metrics panel. */
export function DatasetBacktestPanel({ backtest }: { backtest: BacktestMeta | null }) {
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

  let lastBuy: number | null = null
  let total = 0
  let trades = 0
  const rows = backtest.result.signals.map((s, i) => {
    let pnl: number | null = null
    if (s.type === 'buy') lastBuy = s.price
    else if (s.type === 'sell' && lastBuy != null) { pnl = s.price - lastBuy; total += pnl; trades++; lastBuy = null }
    return { key: i, time: s.time, type: s.type, price: s.price, pnl }
  })

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
          Total P&amp;L <span className="text-gray-600">· {trades} trade{trades === 1 ? '' : 's'} · per share</span>
        </span>
        <span className={`text-sm font-mono font-semibold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {total >= 0 ? '+' : ''}${total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
