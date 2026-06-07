export type Range = 'NOW' | '30M' | '1H' | '5H' | '1D' | '1W' | '1M' | '1Y' | '5Y' | 'MAX'
export type StrategyStatus = 'idle' | 'running' | 'completed' | 'error'

export interface Strategy {
  id: string
  name: string
  slug: string
  created_at: string
  last_run_at?: string | null
  last_run_status?: StrategyStatus
  dir_path: string
}

export interface OHLCBar {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockSnapshot {
  ticker: string
  name: string
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  marketCap: number | null
  week52High: number | null
  week52Low: number | null
}

export interface IndexQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
}

export interface Transaction {
  id: string
  run_id: string
  timestamp: string
  type: 'signal' | 'order' | 'error'
  message: string
  data: Record<string, unknown>
}

export interface RunResult {
  run_id: string
  strategy_id: string
  state: StrategyStatus
  started_at: string
  completed_at?: string | null
  transactions: Transaction[]
  notifications: string[]
}
