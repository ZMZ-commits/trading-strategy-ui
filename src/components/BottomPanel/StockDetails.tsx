import { useEffect, useState } from 'react'
import { getSnapshot } from '../../api/stocks'
import type { StockSnapshot } from '../../types'

const fmt$ = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const fmtB = (n: number | null | undefined) => {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  return `$${n.toLocaleString()}`
}

const fmtVol = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-md px-2.5 py-2 border border-border/40">
      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5 leading-none">{label}</p>
      <p className={`text-xs font-mono font-semibold leading-tight ${accent ? 'text-blue-400' : 'text-gray-100'}`}>
        {value}
      </p>
    </div>
  )
}

export function StockDetails({ ticker }: { ticker: string }) {
  const [snap, setSnap] = useState<StockSnapshot | null>(null)

  useEffect(() => {
    if (!ticker) return
    setSnap(null)
    getSnapshot(ticker).then(setSnap).catch(() => {})
  }, [ticker])

  if (!snap) return (
    <div className="h-full p-3 flex items-center">
      <p className="text-xs text-gray-600 animate-pulse">Loading {ticker}…</p>
    </div>
  )

  return (
    <div className="h-full p-2.5 overflow-y-auto scrollbar-thin">
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">Market Data</span>
        {snap.name && <span className="text-[10px] text-gray-700 truncate">{snap.name}</span>}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="col-span-2">
          <Card label="Price" value={fmt$(snap.price)} accent />
        </div>
        <Card label="Open" value={fmt$(snap.open)} />
        <Card label="Prev Close" value={fmt$(snap.close)} />
        <Card label="High" value={fmt$(snap.high)} />
        <Card label="Low" value={fmt$(snap.low)} />
        <Card label="Volume" value={fmtVol(snap.volume)} />
        <Card label="Mkt Cap" value={fmtB(snap.marketCap)} />
        <Card label="52W High" value={fmt$(snap.week52High)} />
        <Card label="52W Low" value={fmt$(snap.week52Low)} />
      </div>
    </div>
  )
}
