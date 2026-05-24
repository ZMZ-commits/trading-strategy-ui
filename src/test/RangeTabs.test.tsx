import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RangeTabs } from '../components/Chart/RangeTabs'

describe('RangeTabs', () => {
  it('renders all 6 range tabs', () => {
    render(<RangeTabs active="1M" onChange={vi.fn()} />)
    for (const r of ['1D', '1W', '1M', '1Y', '5Y', 'MAX']) {
      expect(screen.getByText(r)).toBeInTheDocument()
    }
  })

  it('clicking a tab fires onChange with the correct value', () => {
    const onChange = vi.fn()
    render(<RangeTabs active="1M" onChange={onChange} />)
    fireEvent.click(screen.getByText('1Y'))
    expect(onChange).toHaveBeenCalledWith('1Y')
  })

  it('active tab has highlighted class', () => {
    render(<RangeTabs active="5Y" onChange={vi.fn()} />)
    expect(screen.getByText('5Y').className).toContain('bg-blue-600')
  })

  it('inactive tabs do not have highlighted class', () => {
    render(<RangeTabs active="1M" onChange={vi.fn()} />)
    expect(screen.getByText('1Y').className).not.toContain('bg-blue-600')
  })
})
