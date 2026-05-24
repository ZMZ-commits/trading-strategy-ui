import { useEffect, useState } from 'react'
import { getSnapshot } from '../../api/stocks'
import type { StockSnapshot } from '../../types'

const fmt$ = (n: number | null | undefined) => (n != null ? `$${n.toLocaleString()}` : '—')
const fmtB = (n: number | null | undefined) => {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  return `$${n.toLocaleString()}`
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1 border-b border-border/50">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-xs text-gray-200 font-mono">{value}</span>
  </div>
)

export function StockDetails({ ticker }: { ticker: string }) {
  const [snap, setSnap] = useState<StockSnapshot | null>(null)

  useEffect(() => {
    if (!ticker) return
    setSnap(null)
    getSnapshot(ticker).then(setSnap).catch(() => {})
  }, [ticker])

  if (!snap) return (
    <div className="flex-1 p-4"><p className="text-xs text-gray-600">Loading {ticker}...</p></div>
  )

  return (
    <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
      <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Market Data</p>
      <Row label="Price" value={fmt$(snap.price)} />
      <Row label="Open" value={fmt$(snap.open)} />
      <Row label="High" value={fmt$(snap.high)} />
      <Row label="Low" value={fmt$(snap.low)} />
      <Row label="Volume" value={snap.volume.toLocaleString()} />
      <Row label="Market Cap" value={fmtB(snap.marketCap)} />
      <Row label="52W High" value={fmt$(snap.week52High)} />
      <Row label="52W Low" value={fmt$(snap.week52Low)} />
    </div>
  )
}
