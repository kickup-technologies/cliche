"use client"

import { useEffect, type RefObject } from "react"

/**
 * Movimiento de la landing /arma-tu-kit, sin librerías:
 *
 * - Revelado al hacer scroll: los elementos `.kr` (fade + desplazamiento) y
 *   `.km` (máscara de imagen) se marcan con `data-in` al entrar al viewport.
 *   Se usa un atributo (no una clase) para que React no lo borre al
 *   re-renderizar. Sin JS, o antes de hidratar, todo se ve normal: el estado
 *   oculto solo existe bajo `[data-kit-motion]`, que se pone aquí.
 * - Lo que ya está en pantalla al hidratar se marca de inmediato (sin parpadeo).
 * - Tarjetas que aparecen después (cambio de filtro) se observan con un
 *   MutationObserver.
 * - Parallax suave del héroe (`[data-kit-parallax]`): translateY acotado por la
 *   holgura que deja la escala base de la imagen.
 *
 * Con prefers-reduced-motion no se oculta ni se desplaza nada.
 */
export function useKitMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (typeof IntersectionObserver === "undefined") return

    const SELECTOR = ".kr, .km"
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.in = "1"
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    )

    const watch = (el: Element) => {
      const h = el as HTMLElement
      if (h.dataset.in) return
      io.observe(h)
    }

    // Lo visible al hidratar se muestra ya (evita visible → oculto → visible).
    const vh = window.innerHeight
    root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.top < vh && r.bottom > 0) el.dataset.in = "1"
      else watch(el)
    })
    root.dataset.kitMotion = "1"

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return
          if (n.matches(SELECTOR)) watch(n)
          n.querySelectorAll(SELECTOR).forEach(watch)
        })
      }
    })
    mo.observe(root, { childList: true, subtree: true })

    // ── Parallax del héroe ──
    const par = root.querySelector<HTMLElement>("[data-kit-parallax]")
    let raf = 0
    const update = () => {
      raf = 0
      if (!par) return
      const box = par.parentElement?.getBoundingClientRect()
      if (!box || box.bottom < 0) return
      // 2,4 % del ancho: cabe dentro de la holgura de scale(1.08)
      const max = box.width * 0.024
      const p = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)))
      par.style.transform = `translate3d(0, ${(p * max).toFixed(2)}px, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    if (par) {
      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onScroll, { passive: true })
    }

    return () => {
      io.disconnect()
      mo.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
      delete root.dataset.kitMotion
    }
  }, [rootRef])
}
