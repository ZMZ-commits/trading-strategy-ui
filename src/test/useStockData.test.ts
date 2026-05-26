import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStockData } from '../hooks/useStockData'
import * as api from '../api/stocks'

vi.mock('../api/stocks')

const BARS = [{ timestamp: '2026-01-01', open: 180, high: 182, low: 179, close: 181, volume: 5e7 }]

describe('useStockData', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('starts loading and returns data', async () => {
    vi.mocked(api.getHistory).mockResolvedValue({ ticker: 'AAPL', range: '1M', bars: BARS })
    const { result } = renderHook(() => useStockData('AAPL', '1M'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(BARS)
  })

  it('does not call API twice for the same ticker+range (cache hit)', async () => {
    vi.mocked(api.getHistory).mockResolvedValue({ ticker: 'AAPL', range: '1M', bars: BARS })
    const { rerender } = renderHook(() => useStockData('AAPL', '1M'))
    await waitFor(() => expect(vi.mocked(api.getHistory)).toHaveBeenCalledTimes(1))
    rerender()
    expect(vi.mocked(api.getHistory)).toHaveBeenCalledTimes(1)
  })

  it('returns error string on failed fetch', async () => {
    vi.mocked(api.getHistory).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useStockData('AAPL', '1M'))
    await waitFor(() => expect(result.current.error).toBe('Network error'))
  })
})
