import { useState, useEffect, useMemo } from 'react'
import { listItems } from '../../api/workspace'
import { getStrategyChart } from '../../api/strategyChart'
import type { Range } from '../../types'

const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '5Y', 'MAX']

interface Row {
  slug: string
  trades: number
  wins: number
  pnl: number
  loading: boolean
  error?: boolean
}

/** Backtest & analytics dashboard: runs every strategy in the IDE workspace
 *  over a chosen ticker + range and compares P&L / trade count / win rate
 *  side by side -- "which strategy actually makes money" at a glance.
 *  Idealized (no fees/slippage), per-share P&L, same pairing logic as the
 *  Trading Platform view's transaction list. */
export function LabDashboard({ ticker: initialTicker, range: initialRange }: { ticker: string; range: Range }) {
  const [tickerInput, setTickerInput] = useState(initialTicker)
  const [ticker, setTicker] = useState(initialTicker)
  const [range, setRange] = useState<Range>(RANGES.includes(initialRange) ? initialRange : '1Y')
  const [slugs, setSlugs] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, Row>>({})

  useEffect(() => { listItems().then(d => setSlugs(d.strategies)).catch(() => setSlugs([])) }, [])

  useEffect(() => {
    if (!ticker || slugs.length === 0) { setRows({}); return }
    let cancelled = false
    setRows(Object.fromEntries(slugs.map(s => [s, { slug: s, trades: 0, wins: 0, pnl: 0, loading: true }])))
    slugs.forEach(async slug => {
      try {
        const data = await getStrategyChart(ticker, slug, range)
        let lastBuy: number | null = null
        let trades = 0, wins = 0, pnl = 0
        for (const sig of data.signals) {
          if (sig.type === 'buy') lastBuy = sig.price
          else if (sig.type === 'sell' && lastBuy != null) {
            const p = sig.price - lastBuy
            pnl += p; trades++; if (p >= 0) wins++
            lastBuy = null
          }
        }
        if (!cancelled) setRows(prev => ({ ...prev, [slug]: { slug, trades, wins, pnl, loading: false } }))
      } catch {
        if (!cancelled) setRows(prev => ({ ...prev, [slug]: { slug, trades: 0, wins: 0, pnl: 0, loading: false, error: true } }))
      }
    })
    return () => { cancelled = true }
  }, [ticker, range, slugs])

  const sorted = useMemo(() => Object.values(rows).sort((a, b) => b.pnl - a.pnl), [rows])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border flex-shrink-0 space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Backtest comparison</p>
        <form
          onSubmit={e => { e.preventDefault(); setTicker(tickerInput.trim().toUpperCase()) }}
          className="flex items-center gap-1.5"
        >
          <input
            value={tickerInput}
            onChange={e => setTickerInput(e.target.value)}
            placeholder="Ticker"
            className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs text-gray-100 uppercase"
          />
          <select
            value={range}
            onChange={e => setRange(e.target.value as Range)}
            className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs text-gray-200"
          >
            {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex-shrink-0">
            Run
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {slugs.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-600">No strategies in the IDE workspace yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-[10px] uppercase tracking-wide text-gray-600">
                <th className="text-left font-medium px-3 py-1.5">Strategy</th>
                <th className="text-right font-medium px-2 py-1.5">Trades</th>
                <th className="text-right font-medium px-2 py-1.5">Win%</th>
                <th className="text-right font-medium px-3 py-1.5">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.slug} className="border-t border-border/40">
                  <td className="px-3 py-1.5 text-gray-300 truncate max-w-[90px]" title={r.slug}>{r.slug}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">{r.loading ? '…' : r.trades}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-gray-400">
                    {r.loading ? '…' : r.trades > 0 ? `${Math.round((r.wins / r.trades) * 100)}%` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">
                    {r.loading ? (
                      <span className="text-gray-600">…</span>
                    ) : r.error ? (
                      <span className="text-red-400" title="Failed to run">err</span>
                    ) : (
                      <span className={r.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {r.pnl >= 0 ? '+' : ''}${r.pnl.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] text-gray-600 border-t border-border flex-shrink-0">
        Idealized: no fees/slippage. Per-share P&amp;L.
      </div>
    </div>
  )
}
