"use client"

import { useEffect, useState } from "react"

/**
 * IntroOverlay — intro 100% código (ref: buckssauce.com).
 *
 * Coreografía en 3 actos:
 *  1. Cortina elíptica: el panel oscuro es un óvalo gigante que se expande;
 *     los "arcos" terracota de los bordes son el fondo asomándose.
 *  2. Profundidad: el wordmark nace lejos (pequeño + desenfocado) y crece
 *     hacia la cámara hasta ocupar su lugar — letra a letra.
 *  3. Salida: el panel completo se desliza hacia arriba revelando el sitio.
 *
 * Todo tipografía y CSS nativos — nítido a cualquier resolución.
 * Una vez por sesión; respeta prefers-reduced-motion.
 */
const SHOW_MS = 3400
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
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#A67163] transition-transform duration-[1000ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        phase === "out" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Acto 1 — cortina elíptica: óvalo oscuro que se expande sobre el
          fondo terracota; los arcos laterales son el fondo asomándose */}
      <div className="intro-ellipse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Acto 2 — contenido que viene desde la profundidad */}
      <div className="intro-depth absolute inset-0 z-10 flex flex-col items-center justify-center">
        {/* Wordmark letra por letra */}
        <h1 className="flex overflow-hidden font-serif text-6xl font-medium tracking-tight text-[#FAF8F5] md:text-8xl">
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              className="intro-letter inline-block"
              style={{ animationDelay: `${0.9 + i * 0.06}s` }}
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
        /* ── Acto 1: cortina elíptica ── */
        .intro-ellipse {
          width: 120vmax;
          height: 120vmax;
          background: #16100c;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0.62);
          animation: intro-curtain 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.25s forwards;
          will-change: transform;
        }
        @keyframes intro-curtain {
          to {
            transform: translate(-50%, -50%) scale(1.6);
          }
        }

        /* ── Acto 2: el bloque central viene desde lejos ── */
        .intro-depth {
          opacity: 0;
          transform: scale(0.32);
          filter: blur(10px);
          animation: intro-approach 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.55s forwards;
          will-change: transform, filter;
        }
        @keyframes intro-approach {
          60% {
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        /* ── Letras con máscara y stagger ── */
        .intro-letter {
          transform: translateY(115%);
          opacity: 0;
          animation: intro-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes intro-rise {
          from { transform: translateY(115%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .intro-line {
          width: 0;
          animation: intro-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.5s both;
        }
        @keyframes intro-line {
          to { width: 8rem; }
        }

        .intro-tag {
          opacity: 0;
          animation: intro-fade 0.9s ease 1.75s both;
        }
        @keyframes intro-fade {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
