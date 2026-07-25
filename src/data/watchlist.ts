/** Watchlist / holdings model.
 *
 *  These used to be module-level consts inside TopPanel. They're extracted here
 *  because the Watchlist is now real, persisted state owned by App (you can add
 *  a recent search into a category of your choosing), so the defaults are just
 *  the seed value rather than the whole truth. */

export interface StockItem {
  ticker: string
  name: string
  price: number
  change: number
  qty?: number
}

export interface Portfolio {
  name: string
  stocks: StockItem[]
}

/** Seed value for a first-time user (before anything is stored locally). */
export const DEFAULT_WATCHLIST: Portfolio[] = [
  {
    name: 'Tech',
    stocks: [
      { ticker: 'AMZN', name: 'Amazon', price: 178.25, change: +1.8 },
      { ticker: 'GOOGL', name: 'Alphabet', price: 165.30, change: -0.3 },
      { ticker: 'META', name: 'Meta', price: 490.80, change: +2.1 },
      { ticker: 'NFLX', name: 'Netflix', price: 631.50, change: -0.9 },
      { ticker: 'NVDA', name: 'NVIDIA', price: 875.40, change: +3.4 },
      { ticker: 'ADBE', name: 'Adobe', price: 432.10, change: +0.8 },
    ],
  },
  {
    name: 'Finance',
    stocks: [
      { ticker: 'JPM', name: 'JPMorgan', price: 198.50, change: +0.6 },
      { ticker: 'BAC', name: 'Bank of America', price: 38.20, change: -0.4 },
      { ticker: 'GS', name: 'Goldman Sachs', price: 467.80, change: +1.2 },
      { ticker: 'MS', name: 'Morgan Stanley', price: 102.30, change: +0.8 },
      { ticker: 'AXP', name: 'Amex', price: 220.50, change: -0.2 },
    ],
  },
  {
    name: 'Energy',
    stocks: [
      { ticker: 'XOM', name: 'Exxon', price: 108.40, change: +0.9 },
      { ticker: 'CVX', name: 'Chevron', price: 148.70, change: -0.5 },
      { ticker: 'COP', name: 'ConocoPhillips', price: 112.20, change: +1.4 },
      { ticker: 'BP', name: 'BP plc', price: 36.80, change: +0.7 },
    ],
  },
]

/** Holdings — a different concept from the watchlist (these carry a quantity),
 *  so they stay static for now; only the watchlist is user-editable. */
export const MY_PORTFOLIOS: Portfolio[] = [
  {
    name: 'Index ETFs',
    stocks: [
      { ticker: 'SPY', name: 'S&P 500', price: 499.75, change: +0.4, qty: 10 },
      { ticker: 'QQQ', name: 'Nasdaq', price: 425.60, change: +0.7, qty: 5 },
      { ticker: 'VTI', name: 'Total Mkt', price: 218.40, change: +0.3, qty: 20 },
      { ticker: 'VOO', name: 'Vanguard', price: 460.20, change: +0.4, qty: 8 },
    ],
  },
  {
    name: 'Commodities',
    stocks: [
      { ticker: 'GLD', name: 'Gold ETF', price: 228.90, change: +1.1, qty: 3 },
      { ticker: 'SLV', name: 'Silver', price: 26.40, change: +0.8, qty: 5 },
      { ticker: 'TLT', name: 'Treasury', price: 91.20, change: -0.2, qty: 8 },
    ],
  },
  {
    name: 'Tech Plays',
    stocks: [
      { ticker: 'AAPL', name: 'Apple', price: 189.30, change: +1.2, qty: 15 },
      { ticker: 'MSFT', name: 'Microsoft', price: 412.20, change: +0.5, qty: 8 },
      { ticker: 'NVDA', name: 'NVIDIA', price: 875.40, change: +3.4, qty: 2 },
      { ticker: 'AMD', name: 'AMD', price: 168.90, change: +2.1, qty: 10 },
    ],
  },
]
