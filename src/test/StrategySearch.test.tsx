import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StrategySearch } from '../components/Sidebar/StrategySearch'

describe('StrategySearch', () => {
  it('renders search input', () => {
    render(<StrategySearch value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('fires onChange as user types', () => {
    const onChange = vi.fn()
    render(<StrategySearch value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alpha' } })
    expect(onChange).toHaveBeenCalledWith('alpha')
  })

  it('fires onChange with empty string on clear', () => {
    const onChange = vi.fn()
    render(<StrategySearch value="alpha" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
