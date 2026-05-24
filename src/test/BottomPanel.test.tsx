import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BottomPanel } from '../components/BottomPanel/BottomPanel'
import * as stocksApi from '../api/stocks'

vi.mock('../api/stocks')
vi.mocked(stocksApi.getSnapshot).mockResolvedValue({
  ticker: 'AAPL', name: 'Apple', price: 189, open: 188, high: 190, low: 187, close: 189,
  volume: 50000000, marketCap: null, week52High: null, week52Low: null,
})

describe('BottomPanel', () => {
  it('renders drag handle', () => {
    render(<BottomPanel ticker="AAPL" selectedStrategy={null} />)
    expect(screen.getByTitle('Drag to resize')).toBeInTheDocument()
  })

  it('shows placeholder when no strategy selected', () => {
    render(<BottomPanel ticker="AAPL" selectedStrategy={null} />)
    expect(screen.getByText(/select a strategy/i)).toBeInTheDocument()
  })
})
