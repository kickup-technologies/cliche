"use client"

import { useEffect, useState } from "react"

/**
 * IntroOverlay — intro 100% código (ref: buckssauce.com).
 * Fondo: foto de seda en alta resolución con drift sutil (Ken Burns).
 * Wordmark "Cliché" revelado letra por letra dentro de máscaras, línea
 * trazada y tagline — todo tipografía nativa, nítida a cualquier
 * resolución. Salida: panel se desliza hacia arriba.
 * Una vez por sesión; respeta prefers-reduced-motion.
 */
const SHOW_MS = 3000
const SLIDE_MS = 1000
const LETTERS = ["C", "l", "i", "c", "h", "é"]

export function IntroOverlay() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden")

  useEffect(() => {
    const seen = sessionStorage.getItem("cliche_intro_seen")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (seen || reduce) return

    setPhase("in")
    document.body.style.overflow = "hidden"

    const tOut = setTimeout(() => setPhase("out"), SHOW_MS)
    const tDone = setTimeout(() => {
      sessionStorage.setItem("cliche_intro_seen", "1")
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#16100c] transition-transform duration-[1000ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        phase === "out" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Fondo seda alta resolución con drift lento */}
      <div className="intro-bg absolute inset-0" />
      {/* Velo para contraste del wordmark */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#16100c]/55 via-[#16100c]/35 to-[#16100c]/60" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Wordmark letra por letra, cada una en su máscara */}
        <h1 className="flex overflow-hidden font-serif text-6xl font-medium tracking-tight text-[#FAF8F5] md:text-8xl">
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              className="intro-letter inline-block"
              style={{ animationDelay: `${0.15 + i * 0.07}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <span className="intro-line mt-6 block h-px bg-[#C4958A]" />

        <p className="intro-tag mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.45em] text-[#FAF8F5]/80">
          Aromas que transforman
        </p>
      </div>

      <style jsx>{`
        .intro-bg {
          background-image: url('/images/intro/intro-silk-clean.png');
          background-size: cover;
          background-position: center;
          animation: intro-drift 5.5s cubic-bezier(0.25, 0.1, 0.25, 1) both;
          will-change: transform;
        }
        .intro-letter {
          transform: translateY(115%);
          opacity: 0;
          animation: intro-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .intro-line {
          width: 0;
          animation: intro-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.85s both;
        }
        .intro-tag {
          opacity: 0;
          animation: intro-fade 0.9s ease 1.1s both;
        }
        @keyframes intro-drift {
          from { transform: scale(1.07) translateY(8px); }
          to   { transform: scale(1) translateY(0); }
        }
        @keyframes intro-rise {
          from { transform: translateY(115%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes intro-line {
          to { width: 8rem; }
        }
        @keyframes intro-fade {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
