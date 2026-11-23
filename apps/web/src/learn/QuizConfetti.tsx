import { useEffect, useRef } from 'react'

interface ConfettiPiece {
  x: number
  y: number
  size: number
  color: string
  vx: number
  vy: number
  rot: number
  vRot: number
  shape: 'rect' | 'circle'
}

const COLORS = ['#1747c4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export function QuizConfetti({ active, count = 45 }: { active: boolean; count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext?.('2d')
    if (!ctx) return

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight

    const particles: ConfettiPiece[] = Array.from({ length: count }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 120,
      y: canvas.height * 0.4 + (Math.random() - 0.5) * 80,
      size: Math.random() * 8 + 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 12 + 6),
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    }))

    let animId: number
    let frame = 0
    const maxFrames = 90

    const render = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.4 // gravity
        p.vx *= 0.98 // air drag
        p.rot += p.vRot

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames)

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      if (frame < maxFrames) {
        animId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [active, count])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      aria-hidden="true"
    />
  )
}
