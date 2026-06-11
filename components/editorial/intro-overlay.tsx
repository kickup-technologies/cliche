"use client"

import { useEffect, useRef, useState } from "react"

/**
 * IntroOverlay — intro cinematográfica con video (seda + logo Cliché).
 * El video (CF Studio, 8s) trae el logo embebido, así que no se superpone
 * wordmark HTML. El temporizador de salida arranca cuando el video empieza
 * a reproducirse de verdad; si no logra arrancar en 2.5s se cae a la
 * imagen B con wordmark animado. Una vez por sesión; respeta
 * prefers-reduced-motion.
 */
const VIDEO_SHOW_MS = 3800 // visible antes del slide-out
const SLIDE_MS = 1000      // duración del slide-out
const VIDEO_GRACE_MS = 2500 // margen para que el video arranque

export function IntroOverlay() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden")
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const startedRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Arranca la cuenta regresiva de salida (una sola vez)
  const beginCountdown = () => {
    if (startedRef.current) return
    startedRef.current = true
    timersRef.current.push(
      setTimeout(() => setPhase("out"), VIDEO_SHOW_MS),
      setTimeout(() => {
        sessionStorage.setItem("cliche_intro_seen", "1")
        document.body.style.overflow = ""
        setPhase("hidden")
      }, VIDEO_SHOW_MS + SLIDE_MS),
    )
  }

  useEffect(() => {
    const seen = sessionStorage.getItem("cliche_intro_seen")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (seen || reduce) return

    setPhase("in")
    document.body.style.overflow = "hidden"

    // Si el video no arranca a tiempo (red lenta, pestaña oculta),
    // cae a la imagen y corre la intro igual.
    const grace = setTimeout(() => {
      const v = videoRef.current
      if (!v || v.readyState < 2) setVideoFailed(true)
      beginCountdown()
    }, VIDEO_GRACE_MS)
    timersRef.current.push(grace)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      document.body.style.overflow = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === "hidden") return null

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#1a0e0a] transition-transform duration-[1000ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        phase === "out" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {!videoFailed ? (
        /* Video cinematográfico con logo embebido */
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlaying={beginCountdown}
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/api/intro-video" type="video/mp4" />
        </video>
      ) : (
        /* Fallback: imagen B + wordmark HTML */
        <>
          <div className="intro-bg absolute inset-0" />
          <div className="absolute inset-0 bg-[#1a0e0a]/60" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="overflow-hidden">
              <h1 className="intro-word font-serif text-5xl font-medium tracking-tight text-[#FAF8F5] md:text-7xl">
                Cliché
              </h1>
            </div>
            <span className="intro-line mt-5 block h-px bg-[#C4958A]" />
            <p className="intro-tag mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-[#FAF8F5]/75">
              Aromas que transforman
            </p>
          </div>
        </>
      )}

      <style jsx>{`
        .intro-bg {
          background-image: url('/images/intro/intro-b.png');
          background-size: cover;
          background-position: center;
          animation: intro-kb 6s ease-in-out both;
        }
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
        @keyframes intro-kb {
          from { transform: scale(1.08); }
          to   { transform: scale(1); }
        }
        @keyframes intro-rise {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes intro-line {
          to { width: 7rem; }
        }
        @keyframes intro-fade {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
