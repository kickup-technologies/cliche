"use client"

import { useEffect, useRef, useState } from "react"
import { shouldPlayIntro } from "@/lib/intro-gate"

const SHOW_MS = 5000
const SLIDE_MS = 1000

export function IntroOverlay() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden")
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    // Solo en carga directa/refresh de la landing — nunca en navegación interna
    if (!shouldPlayIntro()) return

    setPhase("in")
    document.body.style.overflow = "hidden"

    const tOut = setTimeout(() => setPhase("out"), SHOW_MS)
    const tDone = setTimeout(() => {
      document.body.style.overflow = ""
      setPhase("hidden")
    }, SHOW_MS + SLIDE_MS)

    return () => {
      clearTimeout(tOut)
      clearTimeout(tDone)
      document.body.style.overflow = ""
    }
  }, [])

  if (phase === "hidden") return null

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#16100c] transition-transform duration-[1000ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        phase === "out" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Video de fondo — el ref callback dispara play() apenas se monta,
          porque autoPlay solo no es fiable cuando el elemento entra tarde al DOM */}
      <video
        ref={(el) => {
          videoRef.current = el
          el?.play().catch(() => {})
        }}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        onCanPlay={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => {}) }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}
