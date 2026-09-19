"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Scale } from "lucide-react"

/**
 * StoreCurtain — cortina de cambio de tienda del panel (misma cinemática que
 * la cortina de la tienda pública en components/page-transition.tsx).
 *
 * DIRIGIDA POR EVENTOS (como navigateWithCurtain de la tienda): el clic en el
 * selector solo dispara `startStoreCurtain(...)` — NINGÚN estado del AdminPage
 * cambia, así que el árbol pesado del panel no se re-renderiza y la cortina
 * arranca al instante (antes, el setState en la raíz re-renderizaba todo el
 * panel ANTES de que la cortina pudiera moverse → "freeze" de segundos).
 * El swap real de tienda ocurre en `onCovered`, ya con la pantalla cubierta:
 * todo el render pesado del destino sucede POR DEBAJO de la cortina. Y no se
 * levanta hasta que la vista destino avisa con `storeCurtainReady()`.
 */

export type CurtainStore = "cliche" | "bienestar" | "comparar"

const START_EVT = "cliche:store-curtain"
const READY_EVT = "cliche:store-curtain-ready"

/** Arranca la cortina hacia la tienda `target` (ignorado si ya hay una en curso). */
export function startStoreCurtain(target: CurtainStore) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(START_EVT, { detail: { target } }))
}

/** La vista destino ya tiene datos (o su error) en pantalla: puede levantarse. */
export function storeCurtainReady() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(READY_EVT))
}

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

export function StoreCurtain({ onCovered }: {
  /** La cortina terminó de cubrir: aquí el padre hace el cambio de vista. */
  onCovered: (target: CurtainStore) => void
}) {
  const [phase, setPhase] = useState<"idle" | "cover" | "hold" | "exit">("idle")
  const [ready, setReady] = useState(false)
  // El tema se congela al arrancar: durante la salida debe seguir mostrando
  // la marca del destino.
  const [shown, setShown] = useState<CurtainStore>("cliche")
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const targetRef = useRef<CurtainStore>("cliche")
  const coveredAt = useRef(0)
  const onCoveredRef = useRef(onCovered)
  onCoveredRef.current = onCovered

  // Arranque por evento: no toca ningún estado del panel.
  useEffect(() => {
    const onStart = (e: Event) => {
      const target = (e as CustomEvent).detail?.target as CurtainStore | undefined
      if (!target || phaseRef.current !== "idle") return
      targetRef.current = target
      setReady(false)
      setShown(target)
      setPhase("cover")
    }
    const onReady = () => setReady(true)
    window.addEventListener(START_EVT, onStart as EventListener)
    window.addEventListener(READY_EVT, onReady)
    return () => {
      window.removeEventListener(START_EVT, onStart as EventListener)
      window.removeEventListener(READY_EVT, onReady)
    }
  }, [])

  // Cubierta → se pinta primero el estado "hold" (con su animación de carga)
  // y SOLO DESPUÉS se dispara el swap de tienda: el render pesado del destino
  // ocurre en un tick aparte, ya tapado, sin congelar la animación.
  useEffect(() => {
    if (phase !== "cover") return
    const t = window.setTimeout(() => {
      coveredAt.current = performance.now()
      setPhase("hold")
      window.setTimeout(() => onCoveredRef.current(targetRef.current), 50)
    }, COVER_MS)
    return () => clearTimeout(t)
  }, [phase])

  // Espera a `ready` (respetando el hold mínimo) y sale. Si los datos
  // llegaron antes de terminar de cubrir, solo se descuenta el tiempo.
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
    const t = window.setTimeout(() => setPhase("idle"), EXIT_MS)
    return () => clearTimeout(t)
  }, [phase])

  const covering = phase === "cover" || phase === "hold"
  const translateY = covering ? "0%" : phase === "exit" ? "-100%" : "100%"
  const transition = phase === "idle" ? "none" : `transform ${phase === "exit" ? EXIT_MS : COVER_MS}ms cubic-bezier(0.76,0,0.24,1)`
  // La animación de carga aparece apenas la cortina cubre y aún no hay datos
  // (con un fade corto para no parpadear cuando la caché responde al toque).
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
            {/* Logo oficial (crema, lockup completo con emblema y tagline):
                sobre el sage se usa tal cual, sin filtros. */}
            <Image
              src="/images/logo-bienestar.png"
              alt="Bienestar by Cliché"
              width={318}
              height={197}
              sizes="320px"
              className="mx-auto h-36 w-auto object-contain md:h-44"
            />
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
        {/* Animación de carga: puntos que respiran + etiqueta. Las animaciones
            son transform/opacity (compositor): siguen fluidas aunque el render
            pesado del destino esté ocupando el hilo principal por debajo. */}
        <div
          className="mt-7"
          style={{ opacity: waiting ? 1 : 0, transition: "opacity 350ms ease 250ms" }}
        >
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-white/85"
                style={{ animation: waiting ? `curtain-dot 1.1s ease-in-out ${i * 0.18}s infinite` : "none" }}
              />
            ))}
          </div>
          <p className="mt-3 text-[0.55rem] uppercase tracking-[0.3em] text-white/60">
            Cargando la tienda
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes curtain-dot {
          0%, 100% { opacity: 0.35; transform: translateY(0) scale(0.85); }
          50% { opacity: 1; transform: translateY(-4px) scale(1); }
        }
      `}</style>
    </div>
  )
}
