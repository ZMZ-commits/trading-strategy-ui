import { useRef, useState, useCallback, useEffect } from 'react'

// direction='up'  — drag handle at top, drag upward to grow (BottomPanel)
// direction='down' — drag handle at bottom, drag downward to grow (TopPanel)
export function useResizable(initialHeight: number, min = 120, direction: 'up' | 'down' = 'up') {
  const [height, setHeight] = useState(initialHeight)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(initialHeight)

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startY.current = e.clientY
      startH.current = height
      e.preventDefault()
    },
    [height],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const max = window.innerHeight * 0.6
      const delta = direction === 'up'
        ? startY.current - e.clientY
        : e.clientY - startY.current
      const next = Math.min(Math.max(startH.current + delta, min), max)
      setHeight(next)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [min, direction])

  return { height, onDragHandleMouseDown }
}
