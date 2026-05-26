import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface StockEntry { ticker: string; name: string }

const STOCKS: StockEntry[] = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'GOOG', name: 'Alphabet Inc. Class C' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' },
  { ticker: 'V', name: 'Visa Inc.' },
  { ticker: 'UNH', name: 'UnitedHealth Group' },
  { ticker: 'XOM', name: 'Exxon Mobil' },
  { ticker: 'JNJ', name: 'Johnson & Johnson' },
  { ticker: 'WMT', name: 'Walmart Inc.' },
  { ticker: 'MA', name: 'Mastercard Inc.' },
  { ticker: 'PG', name: 'Procter & Gamble' },
  { ticker: 'LLY', name: 'Eli Lilly and Company' },
  { ticker: 'AVGO', name: 'Broadcom Inc.' },
  { ticker: 'HD', name: 'Home Depot Inc.' },
  { ticker: 'MRK', name: 'Merck & Co.' },
  { ticker: 'CVX', name: 'Chevron Corporation' },
  { ticker: 'ABBV', name: 'AbbVie Inc.' },
  { ticker: 'COST', name: 'Costco Wholesale' },
  { ticker: 'PEP', name: 'PepsiCo Inc.' },
  { ticker: 'KO', name: 'Coca-Cola Company' },
  { ticker: 'ADBE', name: 'Adobe Inc.' },
  { ticker: 'NFLX', name: 'Netflix Inc.' },
  { ticker: 'CSCO', name: 'Cisco Systems' },
  { ticker: 'AMD', name: 'Advanced Micro Devices' },
  { ticker: 'MCD', name: "McDonald's Corporation" },
  { ticker: 'ORCL', name: 'Oracle Corporation' },
  { ticker: 'NKE', name: 'NIKE Inc.' },
  { ticker: 'QCOM', name: 'Qualcomm Inc.' },
  { ticker: 'TXN', name: 'Texas Instruments' },
  { ticker: 'INTU', name: 'Intuit Inc.' },
  { ticker: 'AMGN', name: 'Amgen Inc.' },
  { ticker: 'IBM', name: 'IBM Corporation' },
  { ticker: 'NOW', name: 'ServiceNow Inc.' },
  { ticker: 'UBER', name: 'Uber Technologies' },
  { ticker: 'BKNG', name: 'Booking Holdings' },
  { ticker: 'AMAT', name: 'Applied Materials' },
  { ticker: 'GS', name: 'Goldman Sachs' },
  { ticker: 'BAC', name: 'Bank of America' },
  { ticker: 'WFC', name: 'Wells Fargo' },
  { ticker: 'MS', name: 'Morgan Stanley' },
  { ticker: 'C', name: 'Citigroup Inc.' },
  { ticker: 'GE', name: 'GE Aerospace' },
  { ticker: 'CAT', name: 'Caterpillar Inc.' },
  { ticker: 'AXP', name: 'American Express' },
  { ticker: 'SBUX', name: 'Starbucks Corporation' },
  { ticker: 'PANW', name: 'Palo Alto Networks' },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings' },
  { ticker: 'SNOW', name: 'Snowflake Inc.' },
  { ticker: 'PLTR', name: 'Palantir Technologies' },
  { ticker: 'ARM', name: 'Arm Holdings' },
  { ticker: 'MU', name: 'Micron Technology' },
  { ticker: 'LRCX', name: 'Lam Research' },
  { ticker: 'KLAC', name: 'KLA Corporation' },
  { ticker: 'REGN', name: 'Regeneron Pharmaceuticals' },
  { ticker: 'ISRG', name: 'Intuitive Surgical' },
  { ticker: 'GILD', name: 'Gilead Sciences' },
  { ticker: 'ADP', name: 'Automatic Data Processing' },
  { ticker: 'BLK', name: 'BlackRock Inc.' },
  { ticker: 'SPGI', name: 'S&P Global Inc.' },
  { ticker: 'DE', name: 'Deere & Company' },
  { ticker: 'COP', name: 'ConocoPhillips' },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { ticker: 'DIA', name: 'SPDR Dow Jones ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares' },
  { ticker: 'SLV', name: 'iShares Silver Trust' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury ETF' },
  { ticker: 'MSTR', name: 'MicroStrategy Inc.' },
  { ticker: 'COIN', name: 'Coinbase Global' },
  { ticker: 'HOOD', name: 'Robinhood Markets' },
  { ticker: 'RIVN', name: 'Rivian Automotive' },
  { ticker: 'SOFI', name: 'SoFi Technologies' },
  { ticker: 'RBLX', name: 'Roblox Corporation' },
  { ticker: 'DKNG', name: 'DraftKings Inc.' },
  { ticker: 'BP', name: 'BP plc' },
]

function rank(s: StockEntry, q: string): number {
  const u = q.toUpperCase()
  if (s.ticker === u) return 0
  if (s.ticker.startsWith(u)) return 1
  if (s.name.toUpperCase().startsWith(u)) return 2
  return 3
}

interface Props { current: string; onSubmit: (ticker: string) => void }

export function TickerInput({ current, onSubmit }: Props) {
  const [value, setValue] = useState(current)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropRect, setDropRect] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Sync input when active ticker changes externally (e.g. clicking watchlist)
  useEffect(() => { setValue(current) }, [current])

  const suggestions = value.length >= 1
    ? STOCKS
        .filter(s =>
          s.ticker.includes(value.toUpperCase()) ||
          s.name.toLowerCase().includes(value.toLowerCase()),
        )
        .sort((a, b) => rank(a, value) - rank(b, value))
        .slice(0, 8)
    : []

  const refreshRect = () => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropRect({ top: r.bottom + 4, left: r.left })
  }

  const submit = (ticker: string) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    onSubmit(t)
    setValue(t)
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); e.preventDefault() }
    else if (e.key === 'ArrowUp') { setActiveIdx(i => Math.max(i - 1, -1)); e.preventDefault() }
    else if (e.key === 'Enter') { activeIdx >= 0 && suggestions[activeIdx] ? submit(suggestions[activeIdx].ticker) : submit(value) }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  const dropdown = open && suggestions.length > 0
    ? createPortal(
        <div
          style={{ position: 'fixed', top: dropRect.top, left: dropRect.left, width: 280, zIndex: 9999 }}
          className="bg-panel border border-border rounded-lg shadow-2xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.ticker}
              onMouseDown={() => submit(s.ticker)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === activeIdx ? 'bg-blue-600/20' : 'hover:bg-surface'
              } ${i > 0 ? 'border-t border-border/40' : ''}`}
            >
              <span className="text-[11px] font-mono font-bold text-blue-400 w-12 flex-shrink-0">{s.ticker}</span>
              <span className="text-xs text-gray-400 truncate">{s.name}</span>
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => {
          setValue(e.target.value.toUpperCase())
          setOpen(true)
          setActiveIdx(-1)
          refreshRect()
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => { refreshRect(); if (value.length >= 1) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search ticker…"
        className="w-full px-2.5 py-1.5 text-xs font-mono bg-surface border border-border rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 uppercase"
      />
      {dropdown}
    </div>
  )
}
