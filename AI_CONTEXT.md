# AI_CONTEXT — trading-strategy-ui

> Per-repo living context for AI assistants. Overall system:
> `trading-strategy-platform/docs/ARCHITECTURE.md`. Read that + this, then
> recompute the newest branch (`docs/AI_ONBOARDING.md` §2).
> **Live git state always wins over this snapshot.**
>
> **Last synced:** 2026-06-13 · **Newest branch at sync:** ⚠️ **`staging`**
> (2 commits ahead of `main` — responsive/mobile work not yet in prod)

---

## 1. What this repo is

The **dashboard SPA** — React 18 + Vite + TypeScript + TailwindCSS, charts via
TradingView **lightweight-charts** v5 (oscillator panes via recharts). Talks to
the backend over REST + a live-tick WebSocket.

- **Run locally:** `npm install && npm run dev` (Vite on :5173, proxies
  `/stocks`, `/market`, `/strategies` → `localhost:8000`).
- **Build/test:** `npm run build` · `npm test` (Vitest + Testing Library).
- **Prod config:** set `VITE_API_BASE_URL` to the backend URL (drives REST base
  and the `ws(s)://` derivation for live ticks).

---

## 2. Branches & environments

| Env | Branch | URL | Cloudflare Pages project |
|-----|--------|-----|--------------------------|
| Production | `main` | `trading.zemingzhang.com` | `ui-prod` |
| Staging | `staging` | `trading-stg.zemingzhang.com` | `ui-stg` |
| Dev | `dev` | `trading-dev.zemingzhang.com` | `ui-dev` |

Deployed as a static site to **Cloudflare Pages** via `wrangler` in GitHub
Actions (`deploy-{dev,staging,prod}.yml`, auto-create project on first deploy).
**Not** served from the VM.

---

## 3. Functions & modules (what the code does)

### `src/App.tsx`
- Root layout + shared state: `activeTicker`, `activeRange`, `selectedStrategy`,
  `recentTickers`, responsive `sidebarOpen`. Composes Sidebar + TopPanel +
  StockChart + BottomPanel (+ FloatingWidget, desktop only). Mobile-aware via
  `useIsMobile`.

### `src/api/` — typed fetch clients
- `config.ts` — `API_BASE` from `VITE_API_BASE_URL`.
- `stocks.ts` — `getHistory`, `getSnapshot`, `getIndices`.
- `strategies.ts` — `getStrategies`, `createStrategy` (409 handling), `deleteStrategy`.
- `execution.ts` — `runStrategy`, `getStrategyStatus`.

### `src/hooks/`
- `useStockData(ticker, range, interval?)` — fetches history, in-memory cache,
  skips `NOW` (live path).
- `useLiveTicks(ticker, enabled, max)` — WebSocket to `/ws/live/:ticker`, rolling
  tick window; derives `ws(s)://` from `API_BASE`.
- `useIndicators(ticker, range, studies, interval?)` — fetches computed indicator
  series; skips `NOW`/empty.
- `useStrategyStatus(strategyId)` — fetch + poll every 5 s while `running`.
- `useMediaQuery`/`useIsMobile`, `useDraggable`, `useResizable`, `useHResizable`
  — responsive + draggable/resizable panels.

### `src/components/`
- `Chart/` — `StockChart`, `LWChart` (lightweight-charts wrapper), `RangeTabs`
  (NOW/30M/1H/5H/1D/1W/1M/1Y/5Y/MAX + interval picker), `TickerInput`.
- `Sidebar/` — `Sidebar`, `StrategyList`, `StrategySearch`, `CreateStrategyModal`.
- `TopPanel/` — ticker input + recent tickers + watchlist.
- `BottomPanel/` — `StockDetails`, `StrategyMetrics`.
- `FloatingWidget/` — draggable market widget (desktop only; hidden on mobile).

### `src/types/index.ts`
- `Range`, `Interval`, `StrategyStatus`, `Strategy`, `OHLCBar`, `StockSnapshot`,
  `IndexQuote`, `Transaction`, `RunResult` (mirror the backend's shapes).

---

## 4. Features
- Candlestick + volume charts (lightweight-charts v5), adaptive x-axis per range.
- Range tabs incl. intraday (30M/1H/5H) and live **NOW** tab (WebSocket ticks).
- Interval-granularity picker (shown on every range, unsupported greyed out).
- Indicator picker: price overlays + oscillator panes, crosshair legend showing
  names/values on hover, guide lines, squeeze dots, preserved zoom.
- Strategy sidebar: list/search/create/delete + run metrics.
- Draggable/resizable panel splits; floating market widget (desktop).
- **Responsive, touch-friendly layout for phones & tablets** (latest, on `staging`).
- Vitest suite for components + hooks.

---

## 5. Latest Changes (Living)
> Prepend newest first. Note the branch. ⚠️ Newest work is on **`staging`**, not
> `main`. Recompute: `git log origin/staging --no-merges --oneline` and
> `git log origin/main..origin/staging --oneline` for unreleased-to-prod.

- **2026-06-22** (`dev`→prod) — **Navigator sidebar** (Indicators = Overlays/Oscillators + Strategies + Saved Views; per-section search + `+` buttons); **collapsible** top/bottom panels (drag past min or chevron); **floating widget removed**; added 5D/3M/6M/YTD ranges (1W→5D). _Next: render published custom indicators on the chart (#3)._
- **2026-06-13** — responsive/touch layout for phones & tablets; hide floating market widget on mobile.
- **2026-06-12** (`main`) — interval picker on every range, greying unsupported.
- **2026-06-10/11** (`main`) — interval-granularity dropdown; Cloudflare Pages auto-create + wrangler deploy; any-push auto-deploy.
- **2026-06-08/09** (`main`) — crosshair legend; indicator polish (legend, preserved zoom, guide lines, squeeze dots); indicator picker (overlays + panes); chart bugfixes.
- **2026-06-07** (`main`) — candlestick+volume chart (lightweight-charts); NOW live tab; intraday range tabs.

## 6. What's next / TODO
- Promote the `staging` responsive/mobile work to `main` (prod) when signed off.
- _(add upcoming work here)_
