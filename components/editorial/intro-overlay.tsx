"use client"

import { useEffect, useState } from "react"

/**
 * IntroOverlay — animación de entrada premium estilo "clean intro" (ref: buckssauce).
 * Panel full-screen oscuro con wordmark serif + línea trazada + tagline; luego se
 * desliza hacia arriba revelando el sitio. Se muestra una sola vez por sesión y
 * respeta prefers-reduced-motion.
 */
export function IntroOverlay() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden")

  useEffect(() => {
    const seen = sessionStorage.getItem("cliche_intro_seen")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (seen || reduce) return

    setPhase("in")
    document.body.style.overflow = "hidden"

    const tOut = setTimeout(() => setPhase("out"), 2000)
    const tDone = setTimeout(() => {
      sessionStorage.setItem("cliche_intro_seen", "1")
      document.body.style.overflow = ""
      setPhase("hidden")
    }, 3000)

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#2D1A14] transition-transform duration-[1000ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        phase === "out" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="overflow-hidden">
        <h1 className="intro-word font-serif text-5xl font-medium tracking-tight text-[#FAF8F5] md:text-7xl">
          Cliché
        </h1>
      </div>

      <span className="intro-line mt-5 block h-px bg-[#C4958A]" />

      <p className="intro-tag mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-[#FAF8F5]/70">
        Aromas que transforman
      </p>

      <style jsx>{`
        .intro-word {
          animation: intro-rise 1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .intro-line {
          width: 0;
          animation: intro-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
        }
        .intro-tag {
          opacity: 0;
          animation: intro-fade 0.9s ease 0.8s both;
        }
        @keyframes intro-rise {
          from {
            transform: translateY(110%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes intro-line {
          to {
            width: 7rem;
          }
        }
        @keyframes intro-fade {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
