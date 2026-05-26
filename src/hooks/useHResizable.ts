import { useRef, useState, useCallback, useEffect } from 'react'

export function useHResizable(initialWidth: number, min = 150) {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(initialWidth)

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startX.current = e.clientX
      startW.current = width
      e.preventDefault()
    },
    [width],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const max = window.innerWidth * 0.7
      const next = Math.min(Math.max(startW.current + (e.clientX - startX.current), min), max)
      setWidth(next)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [min])

  return { width, onDragHandleMouseDown }
}
