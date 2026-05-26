"use client"

import { useRef, useEffect, useCallback, useState } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
}

interface Props {
  src: string
  alt: string
  badge?: string | null
  badgeColor?: string | null
  stock?: number
}

export function SprayProductViewer({ src, alt, badge, badgeColor, stock }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(false)

  // Sync canvas dimensions to container
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const sync = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(container)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0.015)

    for (const p of particlesRef.current) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.04  // soft gravity
      p.vx *= 0.97  // air drag
      p.opacity -= 0.018
      p.size *= 0.985

      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${p.opacity})`
      ctx.fill()
    }

    if (particlesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [])

  const triggerSpray = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Nozzle roughly at top-center of a spray bottle image
    const nozzleX = canvas.width * 0.52
    const nozzleY = canvas.height * 0.12

    for (let i = 0; i < 70; i++) {
      // Cone: upward with slight left lean (bottle pointing up)
      const spread = 0.55
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const speed = Math.random() * 3.5 + 0.8
      particlesRef.current.push({
        x: nozzleX + (Math.random() - 0.5) * 8,
        y: nozzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 0.8,
        opacity: Math.random() * 0.65 + 0.3,
        hue: 195 + Math.random() * 30, // light blue mist
      })
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [animate])

  const handleClick = useCallback(() => {
    setPressed(true)
    triggerSpray()
    setTimeout(() => setPressed(false), 150)
  }, [triggerSpray])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * 18, y: x * -18 })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative aspect-square bg-muted/30 rounded-3xl overflow-hidden cursor-pointer select-none"
      style={{ perspective: "900px" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D tilt wrapper */}
      <div
        className="w-full h-full"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${pressed ? 0.96 : 1})`,
          transition: pressed
            ? "transform 0.08s ease-out"
            : "transform 0.25s ease-out",
          willChange: "transform",
        }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain p-8 pointer-events-none"
          draggable={false}
        />
      </div>

      {/* Spray particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* Badges */}
      {badge && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className={`${badgeColor || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
            {badge}
          </span>
        </div>
      )}
      {typeof stock === "number" && stock <= 10 && stock > 0 && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className={`text-white text-xs font-bold px-3 py-1.5 rounded-full ${stock <= 3 ? "bg-red-600 animate-pulse" : "bg-orange-500"}`}>
            {stock <= 3 ? `¡Solo ${stock} quedan!` : "Pocas unidades"}
          </span>
        </div>
      )}

      {/* Interaction hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-[10px] text-muted-foreground/40 tracking-wider uppercase flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          Presiona para activar
        </span>
      </div>
    </div>
  )
}
