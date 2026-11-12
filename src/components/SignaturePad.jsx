import { useEffect, useImperativeHandle, useRef } from 'react'

/**
 * Freehand signature capture on a canvas (mouse, touch or pen).
 * Give it a ref to read it: ref.current.isEmpty(), .clear(), .toDataUrl().
 */
export default function SignaturePad({ ref }) {
  const canvasRef = useRef(null)
  const state = useRef({ drawing: false, points: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * ratio
    canvas.height = canvas.clientHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000'
  }, [])

  useImperativeHandle(ref, () => ({
    isEmpty: () => state.current.points < 15,
    clear: () => {
      const canvas = canvasRef.current
      canvas.getContext('2d').clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      state.current.points = 0
    },
    toDataUrl: () => canvasRef.current.toDataURL('image/png'),
  }))

  const position = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <canvas
      ref={canvasRef}
      className="signature-canvas"
      aria-label="Signature area"
      onPointerDown={(e) => {
        const ctx = canvasRef.current.getContext('2d')
        state.current.drawing = true
        canvasRef.current.setPointerCapture(e.pointerId)
        const { x, y } = position(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.01, y + 0.01)
        ctx.stroke()
        e.preventDefault()
      }}
      onPointerMove={(e) => {
        if (!state.current.drawing) return
        const ctx = canvasRef.current.getContext('2d')
        const { x, y } = position(e)
        ctx.lineTo(x, y)
        ctx.stroke()
        state.current.points++
      }}
      onPointerUp={() => { state.current.drawing = false }}
      onPointerCancel={() => { state.current.drawing = false }}
    />
  )
}
