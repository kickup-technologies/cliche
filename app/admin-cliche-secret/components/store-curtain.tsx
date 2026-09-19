"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Scale } from "lucide-react"

/**
 * StoreCurtain — cortina de cambio de tienda del panel (misma cinemática que
 * la cortina de la tienda pública en components/page-transition.tsx): sube
 * desde abajo con el branding de la tienda DESTINO, el cambio real de vista
 * ocurre por debajo mientras cubre, y NO se levanta hasta que `ready` avisa
 * que los datos del destino terminaron de cargar. Así el cambio se percibe
 * como una sola transición fluida en vez de un swap con spinners.
 */

export type CurtainStore = "cliche" | "bienestar" | "comparar"

// Tiempos idénticos a la cortina de la tienda: la firma de marca merece su
// segundo y la carga corre en paralelo por debajo.
const COVER_MS = 460
const HOLD_MS = 120
const EXIT_MS = 480
// Si los datos jamás llegan (sin red), la cortina se levanta igual y la vista
// muestra su propio "Reintentar" — nunca se queda pegada.
const MAX_WAIT_MS = 12_000

const THEME: Record<CurtainStore, { bg: string }> = {
  cliche: { bg: "#A67163" },
  bienestar: { bg: "#6E7A6D" },
  comparar: { bg: "#2D1A14" },
}

export function StoreCurtain({ target, ready, onCovered, onFinished }: {
  /** Tienda destino: al pasar de null a un valor, la cortina arranca. */
  target: CurtainStore | null
  /** true cuando la vista destino ya tiene sus datos (o su error) en pantalla. */
  ready: boolean
  /** La cortina terminó de cubrir: aquí el padre hace el cambio de vista. */
  onCovered: () => void
  /** La cortina salió por arriba y volvió a reposo. */
  onFinished: () => void
}) {
  const [phase, setPhase] = useState<"idle" | "cover" | "hold" | "exit">("idle")
  // El tema se congela al arrancar: durante la salida `target` ya es null
  // pero la cortina debe seguir mostrando la marca del destino.
  const [shown, setShown] = useState<CurtainStore>("cliche")
  const coveredAt = useRef(0)

  useEffect(() => {
    if (!target) return
    setShown(target)
    setPhase("cover")
    const t = window.setTimeout(() => {
      coveredAt.current = performance.now()
      onCovered()
      setPhase("hold")
    }, COVER_MS)
    return () => clearTimeout(t)
    // onCovered es estable (useCallback en el padre)
  }, [target, onCovered])

  // Cubierta: espera a `ready` (respetando el hold mínimo) y sale. Si los
  // datos llegaron antes de terminar de cubrir, solo se descuenta el tiempo.
  useEffect(() => {
    if (phase !== "hold") return
    if (ready) {
      const elapsed = performance.now() - coveredAt.current
      const t = window.setTimeout(() => setPhase("exit"), Math.max(HOLD_MS - elapsed, 40))
      return () => clearTimeout(t)
    }
    const fb = window.setTimeout(() => setPhase("exit"), MAX_WAIT_MS)
    return () => clearTimeout(fb)
  }, [phase, ready])

  useEffect(() => {
    if (phase !== "exit") return
    const t = window.setTimeout(() => { setPhase("idle"); onFinished() }, EXIT_MS)
    return () => clearTimeout(t)
  }, [phase, onFinished])

  const covering = phase === "cover" || phase === "hold"
  const translateY = covering ? "0%" : phase === "exit" ? "-100%" : "100%"
  const transition = phase === "idle" ? "none" : `transform ${phase === "exit" ? EXIT_MS : COVER_MS}ms cubic-bezier(0.76,0,0.24,1)`
  // El aviso de carga solo aparece si de verdad hay espera (evita el parpadeo
  // cuando los datos están en caché y la cortina sale de inmediato).
  const waiting = phase === "hold" && !ready

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: THEME[shown].bg,
        transform: `translateY(${translateY})`,
        transition,
        pointerEvents: phase === "idle" ? "none" : "auto",
        willChange: "transform",
      }}
    >
      <div
        className="px-6 text-center"
        style={{
          opacity: covering ? 1 : 0,
          transform: covering ? "translateY(0)" : "translateY(18px)",
          transition: `opacity 520ms ease ${covering ? 200 : 0}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${covering ? 200 : 0}ms`,
        }}
      >
        {shown === "cliche" && (
          <>
            <p className="mb-5 text-[0.58rem] font-semibold uppercase tracking-[0.42em] text-white/65 md:text-[0.62rem]">
              Marketing Olfativo
            </p>
            <Image
              src="/images/logo-cliche.png"
              alt="Cliché"
              width={152}
              height={128}
              sizes="200px"
              className="mx-auto h-24 w-auto object-contain brightness-0 invert md:h-32"
            />
            <div className="mx-auto my-5 h-px w-10 bg-white/40" />
            <p className="text-[0.62rem] uppercase tracking-[0.34em] text-white/70 md:text-xs">
              Panel administrativo
            </p>
          </>
        )}
        {shown === "bienestar" && (
          <>
            <p className="mb-4 text-[0.58rem] font-semibold uppercase tracking-[0.42em] text-white/65 md:text-[0.62rem]">
              by Cliché
            </p>
            <p className="font-serif text-4xl font-bold text-white md:text-5xl">Bienestar</p>
            <div className="mx-auto my-5 h-px w-10 bg-white/40" />
            <p className="text-[0.62rem] uppercase tracking-[0.34em] text-white/70 md:text-xs">
              Gestión en vivo
            </p>
          </>
        )}
        {shown === "comparar" && (
          <>
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Scale className="h-6 w-6 text-white/90" />
            </span>
            <p className="font-serif text-3xl font-bold text-white md:text-4xl">Comparar tiendas</p>
            <div className="mx-auto my-5 h-px w-10 bg-white/40" />
            <p className="text-[0.62rem] uppercase tracking-[0.34em] text-white/70 md:text-xs">
              Métricas lado a lado
            </p>
          </>
        )}
        {/* Aviso de carga: 3 puntos que respiran, solo si la espera es real */}
        <div
          className="mt-6 flex items-center justify-center gap-1.5"
          style={{ opacity: waiting ? 1 : 0, transition: "opacity 400ms ease 600ms" }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/70"
              style={{ animation: waiting ? `curtain-dot 1.1s ease-in-out ${i * 0.18}s infinite` : "none" }}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes curtain-dot {
          0%, 100% { opacity: 0.35; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  )
}
