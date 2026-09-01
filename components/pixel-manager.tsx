"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getConsent } from "@/components/cookie-consent"

/**
 * PixelManager — carga Meta Pixel, TikTok, GA4 y Clarity.
 *
 * Modelo de consentimiento OPT-OUT / implícito (válido bajo la Ley 1581/2012 de
 * Colombia): mientras el visitante NO haya decidido, se trata como aceptado y se
 * cargan todos los pixels para maximizar la medición. Solo se desactivan si el
 * usuario RECHAZA explícitamente en el banner o en /cookies.
 * (Nota: este modelo NO es válido bajo GDPR; si se vende a la UE habría que
 *  aplicar opt-in por región.)
 *
 * Marketing → Meta Pixel + TikTok
 * Analíticas → GA4 + Clarity
 */

// Píxel "Cliché Web - Píxel" (cuenta de Andrés, 2026-09-01). Hardcodeado a propósito:
// el env NEXT_PUBLIC_META_PIXEL_ID en Vercel aún apunta al dataset viejo (1574258694440791).
const META_PIXEL_ID = "1083378614065362"
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || "G-TLBP0W75MF"
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || ""
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "x02j83u050"

function injectScript(src: string, id: string) {
  if (document.getElementById(id)) return
  const s = document.createElement("script")
  s.id = id
  s.src = src
  s.async = true
  document.head.appendChild(s)
}

function loadMetaPixel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.fbq) return
  w.fbq = function (...args: unknown[]) {
    if (w.fbq.callMethod) w.fbq.callMethod(...args)
    else w.fbq.queue.push(args)
  }
  w._fbq = w.fbq
  w.fbq.push = w.fbq
  w.fbq.loaded = true
  w.fbq.version = "2.0"
  w.fbq.queue = []
  injectScript("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel-sdk")
  w.fbq("init", META_PIXEL_ID)
  w.fbq("track", "PageView")
}

function loadGA4() {
  if (!GA4_ID) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.__ga4Loaded) return
  w.__ga4Loaded = true
  w.dataLayer = w.dataLayer || []
  // OJO: gtag.js SOLO interpreta como comando lo que se empuja como objeto
  // `arguments`. Con `(...args) => dataLayer.push(args)` se empuja un Array y
  // Google lo descarta EN SILENCIO: el script cargaba, pero el `config` nunca
  // se procesaba (ni cookie _ga ni un solo hit). Debe quedar como el snippet
  // oficial: push(arguments) — no tocar la firma.
  // eslint-disable-next-line prefer-rest-params
  w.gtag = function gtag() { w.dataLayer.push(arguments) }
  w.gtag("js", new Date())
  w.gtag("config", GA4_ID)
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`, "ga4-sdk")
  // Drenar los eventos de embudo que use-capi encoló mientras gtag no existía
  // (gtag carga diferido; un view_item temprano llegaría antes que este init).
  const queued = w.__ga4Queue as Array<[string, Record<string, unknown>]> | undefined
  if (queued?.length) {
    queued.forEach(([name, params]) => w.gtag("event", name, params))
    w.__ga4Queue = []
  }
}

function loadTikTok() {
  if (!TIKTOK_PIXEL_ID) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.ttq) return
  const ttq: Record<string, unknown> = {}
  const methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"]
  ttq._q = []
  methods.forEach((m) => {
    ttq[m] = (...args: unknown[]) => { (ttq._q as unknown[]).push([m, ...args]) }
  })
  w.ttq = ttq
  injectScript(
    `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${TIKTOK_PIXEL_ID}&lib=ttq`,
    "tiktok-pixel-sdk"
  )
  ;(ttq.page as () => void)()
}

function loadClarity() {
  if (!CLARITY_ID) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.clarity) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] = c[a] || function (...args: unknown[]) { (c[a].q = c[a].q || []).push(args) }
    const t = l.createElement(r) as HTMLScriptElement
    t.async = true
    t.src = "https://www.clarity.ms/tag/" + i
    const y = l.getElementsByTagName(r)[0]
    y.parentNode?.insertBefore(t, y)
  })(w, document, "clarity", "script", CLARITY_ID)
}

export function PixelManager() {
  const pathname = usePathname()
  const isAdminArea = pathname?.startsWith("/admin")

  useEffect(() => {
    // No cargar pixels en el panel admin: evita ensuciar los datos de Meta
    // con la navegación interna del administrador.
    if (isAdminArea) return
    const apply = () => {
      const consent = getConsent()
      // Opt-out: sin decisión previa → se asume aceptado (consentimiento implícito).
      const analytics = consent ? consent.analytics : true
      const marketing = consent ? consent.marketing : true

      if (analytics) {
        if (GA4_ID) loadGA4()
        if (CLARITY_ID) loadClarity() // mapas de calor + grabaciones de sesión
      }
      if (marketing) {
        if (META_PIXEL_ID) loadMetaPixel()
        if (TIKTOK_PIXEL_ID) loadTikTok()
      }

      // Si el usuario revoca durante la sesión (sin recargar), cortamos el envío
      // de los pixels de marketing ya cargados.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      if (w.fbq) w.fbq("consent", marketing ? "grant" : "revoke")
      if (!marketing && w.ttq?.disableCookie) w.ttq.disableCookie()
    }

    // Carga DIFERIDA de los pixels (LCP móvil): los SDKs de terceros (fbevents,
    // gtag, clarity…) sumaban ~1.7s de evaluación de JS compitiendo con la
    // hidratación en el primer paint. Se cargan al primer gesto del usuario o a
    // los 3.5s — lo que ocurra primero. El PageView sigue disparándose segundos
    // después de aterrizar (antes de cualquier clic), así que la atribución de
    // pauta y la deduplicación con CAPI no cambian.
    let fired = false
    const start = () => {
      if (fired) return
      fired = true
      cleanupDefer()
      apply()
    }
    const events: (keyof WindowEventMap)[] = ["pointerdown", "scroll", "keydown", "touchstart"]
    const cleanupDefer = () => {
      events.forEach((e) => window.removeEventListener(e, start))
      clearTimeout(timer)
    }
    events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }))
    const timer = window.setTimeout(start, 3500)

    window.addEventListener("cliche-consent-change", apply)
    return () => {
      cleanupDefer()
      window.removeEventListener("cliche-consent-change", apply)
    }
  }, [isAdminArea])

  return null
}
