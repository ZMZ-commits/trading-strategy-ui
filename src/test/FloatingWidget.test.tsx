import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FloatingWidget } from '../components/FloatingWidget/FloatingWidget'
import * as stocksApi from '../api/stocks'

vi.mock('../api/stocks')
vi.mocked(stocksApi.getIndices).mockResolvedValue([])

describe('FloatingWidget', () => {
  it('renders collapsed icon initially', () => {
    render(<FloatingWidget />)
    expect(screen.getByTitle('Market Overview')).toBeInTheDocument()
  })

  it('expands to panel on icon click', async () => {
    render(<FloatingWidget />)
    fireEvent.click(screen.getByTitle('Market Overview'))
    expect(await screen.findByText('Market Overview', { selector: 'span' })).toBeInTheDocument()
  })

  it('collapses back to icon on collapse click', async () => {
    render(<FloatingWidget />)
    fireEvent.click(screen.getByTitle('Market Overview'))
    await screen.findByText('Market Overview', { selector: 'span' })
    fireEvent.click(screen.getByLabelText('Collapse widget'))
    expect(screen.getByTitle('Market Overview')).toBeInTheDocument()
  })

  it('snap logic resolves to left or right edge, never center', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true })
    const WIDGET_W = 224
    const snapX = (x: number) => x + WIDGET_W / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - WIDGET_W - 8
    const leftSnap = snapX(50)
    const rightSnap = snapX(900)
    expect(leftSnap).toBe(8)
    expect(rightSnap).toBe(1200 - WIDGET_W - 8)
    const center = window.innerWidth / 2
    expect(leftSnap + WIDGET_W / 2).toBeLessThan(center * 0.33 + center)
    expect(rightSnap).toBeGreaterThan(center)
  })
})
