import { useRef, useState, useCallback, useEffect } from 'react'

export function useResizable(initialHeight: number, min = 120) {
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
      const max = window.innerHeight * 0.7
      const next = Math.min(Math.max(startH.current + (startY.current - e.clientY), min), max)
      setHeight(next)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [min])

  return { height, onDragHandleMouseDown }
}
