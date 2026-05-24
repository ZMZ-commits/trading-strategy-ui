import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStrategyStatus } from '../hooks/useStrategyStatus'
import * as api from '../api/execution'

vi.mock('../api/execution')

const MOCK: import('../types').RunResult = {
  run_id: 'r1', strategy_id: 's1', state: 'completed',
  started_at: '2026-05-24T10:00:00Z', transactions: [], notifications: [],
}

describe('useStrategyStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when strategyId is null', () => {
    const { result } = renderHook(() => useStrategyStatus(null))
    expect(result.current.status).toBeNull()
  })

  it('fetches and returns status when strategyId is provided', async () => {
    vi.mocked(api.getStrategyStatus).mockResolvedValue(MOCK)
    const { result } = renderHook(() => useStrategyStatus('s1'))
    await waitFor(() => expect(result.current.status).toEqual(MOCK))
  })

  it('clears status when strategyId becomes null', async () => {
    vi.mocked(api.getStrategyStatus).mockResolvedValue(MOCK)
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useStrategyStatus(id),
      { initialProps: { id: 's1' as string | null } },
    )
    await waitFor(() => expect(result.current.status).not.toBeNull())
    rerender({ id: null })
    expect(result.current.status).toBeNull()
  })
})
