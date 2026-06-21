import { useState } from 'react'
import { getHistory } from '../../api/stocks'
import { getPyodide } from '../../lib/pyodide'
import type { Range } from '../../types'

interface Props { onClose: () => void }

const RANGES: Range[] = ['1M', '3M', '6M', '1Y']

// Default user script. `ctx` exposes the exported metrics + indicator helpers.
const DEFAULT_CODE = `# Custom indicator — runs in your browser (Python via Pyodide).
# ctx gives you the exported metrics + helpers:
#   ctx.open / high / low / close / volume   (lists, oldest -> newest)
#   ctx.sma(series, n)  ctx.ema(series, n)  ctx.rsi(n)
# Return a series to plot with ctx.plot(name, values, kind)
#   kind = "overlay"  (on the price chart)  or  "oscillator"  (own pane)

def compute(ctx):
    ema21 = ctx.ema(ctx.close, 21)
    return ctx.plot("EMA 21", ema21, kind="overlay")
`

// Injected before the user's code: defines the ctx SDK.
const BOOTSTRAP = `
import json as _json
_bars = _json.loads(BARS_JSON)

class Ctx:
    def __init__(self, bars):
        self.time = [b["timestamp"] for b in bars]
        self.open = [b["open"] for b in bars]
        self.high = [b["high"] for b in bars]
        self.low = [b["low"] for b in bars]
        self.close = [b["close"] for b in bars]
        self.volume = [b["volume"] for b in bars]
        self._out = None

    def sma(self, src, n):
        out = [None] * len(src)
        for i in range(n - 1, len(src)):
            w = src[i - n + 1:i + 1]
            if all(v is not None for v in w):
                out[i] = sum(w) / n
        return out

    def ema(self, src, n):
        out = [None] * len(src)
        k = 2.0 / (n + 1)
        prev = None
        for i, v in enumerate(src):
            if v is None:
                out[i] = prev
                continue
            prev = v if prev is None else (v - prev) * k + prev
            out[i] = prev
        return out

    def rsi(self, n=14, src=None):
        s = src if src is not None else self.close
        out = [None] * len(s)
        ag = al = 0.0
        for i in range(1, len(s)):
            ch = s[i] - s[i - 1]
            g, l = max(ch, 0.0), max(-ch, 0.0)
            if i <= n:
                ag += g; al += l
                if i == n:
                    ag /= n; al /= n
                    rs = ag / al if al else float("inf")
                    out[i] = 100 - 100 / (1 + rs)
            else:
                ag = (ag * (n - 1) + g) / n
                al = (al * (n - 1) + l) / n
                rs = ag / al if al else float("inf")
                out[i] = 100 - 100 / (1 + rs)
        return out

    def plot(self, name, values, kind="overlay"):
        self._out = {"name": str(name), "values": list(values), "kind": kind, "time": self.time}
        return self._out

ctx = Ctx(_bars)
`

const FOOTER = `
try:
    _res = compute(ctx)
except NameError:
    raise RuntimeError("Define a function:  def compute(ctx): ...  that returns ctx.plot(name, values, kind)")
if _res is None:
    _res = ctx._out
RESULT_JSON = _json.dumps(_res)
`

interface IndicatorResult { name: string; kind: string; values: (number | null)[]; time: string[] }

type Status = 'idle' | 'fetching' | 'loading-python' | 'running' | 'done' | 'error'

const STATUS_TEXT: Record<Status, string> = {
  idle: '', fetching: 'Fetching data…', 'loading-python': 'Loading Python runtime (first run only)…',
  running: 'Running…', done: '', error: '',
}

// Tiny inline sparkline of the output series.
function Sparkline({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v))
  if (nums.length < 2) return <p className="text-xs text-gray-600">Series too short to preview.</p>
  const min = Math.min(...nums), max = Math.max(...nums)
  const span = max - min || 1
  const W = 520, H = 80
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * W},${H - ((v - min) / span) * H}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
    </svg>
  )
}

export function CustomIndicatorIDE({ onClose }: Props) {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [ticker, setTicker] = useState('AAPL')
  const [range, setRange] = useState<Range>('6M')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IndicatorResult | null>(null)

  const busy = status === 'fetching' || status === 'loading-python' || status === 'running'

  const run = async () => {
    setError(null); setResult(null)
    try {
      setStatus('fetching')
      const hist = await getHistory(ticker.trim().toUpperCase() || 'AAPL', range)
      if (!hist.bars.length) throw new Error('No data for that ticker / range.')
      setStatus('loading-python')
      const py = await getPyodide()
      py.globals.set('BARS_JSON', JSON.stringify(hist.bars))
      setStatus('running')
      py.runPython(BOOTSTRAP + '\n' + code + '\n' + FOOTER)
      const raw = py.globals.get('RESULT_JSON')
      const parsed = JSON.parse(String(raw)) as IndicatorResult | null
      if (!parsed || !Array.isArray(parsed.values)) {
        throw new Error('compute() must return ctx.plot(name, values, kind).')
      }
      setResult(parsed)
      setStatus('done')
    } catch (e) {
      // Pyodide surfaces the Python traceback in the error message.
      setError((e as Error).message || String(e))
      setStatus('error')
    }
  }

  const nonNull = result ? result.values.filter(v => v != null).length : 0
  const last = result ? [...result.values].reverse().find(v => v != null) : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded-lg w-full max-w-3xl max-h-[88vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-200">Custom Indicator IDE</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0">
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="Ticker"
            className="w-24 px-2 py-1.5 text-xs bg-surface border border-border rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono uppercase"
          />
          <select
            value={range}
            onChange={e => setRange(e.target.value as Range)}
            className="px-2 py-1.5 text-xs bg-surface border border-border rounded text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={run}
            disabled={busy}
            className="ml-auto px-4 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors"
          >
            {busy ? 'Running…' : '▶ Run'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-64 px-3 py-2 text-xs font-mono leading-relaxed bg-surface border border-border rounded text-gray-200 focus:outline-none focus:border-blue-500 resize-y"
          />

          {busy && <p className="text-xs text-blue-400">{STATUS_TEXT[status]}</p>}

          {error && (
            <pre className="text-[11px] text-red-400 bg-red-950/30 border border-red-900/40 rounded p-3 whitespace-pre-wrap overflow-x-auto">
              {error}
            </pre>
          )}

          {result && (
            <div className="border border-border rounded p-3 bg-surface/40">
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="font-semibold text-gray-200">{result.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 text-[10px] uppercase tracking-wide">{result.kind}</span>
                <span className="ml-auto text-gray-500">{nonNull} pts · last {last != null ? Number(last).toFixed(2) : '—'}</span>
              </div>
              <Sparkline values={result.values} />
              <p className="mt-2 text-[10px] text-gray-600">Output preview. Plotting onto the main chart + saving comes next.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
