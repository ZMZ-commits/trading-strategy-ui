import { useRef, useState, useCallback, useEffect } from 'react'

export function useHResizable(initialWidth: number, min = 150) {
  const [width, setWidth] = useState(initialWidth)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startW = useRef(initialWidth)

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true)
      startX.current = e.clientX
      startW.current = width
      e.preventDefault()
    },
    [width],
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const max = window.innerWidth * 0.7
      const next = Math.min(Math.max(startW.current + (e.clientX - startX.current), min), max)
      setWidth(next)
    }
    const onUp = () => setDragging(false)
    // Suppress text selection while dragging so the cursor stays an ew-resize.
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.userSelect = prevUserSelect
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, min])

  return { width, dragging, onDragHandleMouseDown }
}
