import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateStrategyModal } from '../components/Sidebar/CreateStrategyModal'
import * as api from '../api/strategies'

vi.mock('../api/strategies')

describe('CreateStrategyModal', () => {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  beforeEach(() => vi.clearAllMocks())

  it('save is disabled when name is empty', () => {
    render(<CreateStrategyModal onClose={onClose} onCreated={onCreated} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('save enables when name is typed', () => {
    render(<CreateStrategyModal onClose={onClose} onCreated={onCreated} />)
    fireEvent.change(screen.getByPlaceholderText(/strategy name/i), { target: { value: 'Alpha' } })
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
  })

  it('calls onCreated after successful save', async () => {
    vi.mocked(api.createStrategy).mockResolvedValue({ id: '1', name: 'Alpha', slug: 'alpha', created_at: '', dir_path: '' })
    render(<CreateStrategyModal onClose={onClose} onCreated={onCreated} />)
    fireEvent.change(screen.getByPlaceholderText(/strategy name/i), { target: { value: 'Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
  })

  it('shows error message on duplicate name', async () => {
    vi.mocked(api.createStrategy).mockRejectedValue(new Error('Strategy with this name already exists'))
    render(<CreateStrategyModal onClose={onClose} onCreated={onCreated} />)
    fireEvent.change(screen.getByPlaceholderText(/strategy name/i), { target: { value: 'Dupe' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument())
  })
})
