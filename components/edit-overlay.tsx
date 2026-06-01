"use client"

import { useEffect, useState, useRef } from "react"

/**
 * EditOverlay — capa estilo Shopify/Canva que se monta SOLO dentro del preview
 * del Editor Visual (cuando la URL tiene ?preview=1). Vive dentro del iframe de
 * la tienda, por lo que sus coordenadas `fixed` coinciden con los bloques reales.
 *
 * - Hover sobre un bloque editable ([data-cliche-edit]) → contorno + etiqueta.
 * - Click sobre el bloque → avisa al panel admin (postMessage) qué editar y
 *   bloquea la navegación/acción normal de la tienda.
 * - Escucha al panel: cuando el admin enfoca un campo, resalta ese bloque aquí.
 */

interface Box {
  top: number
  left: number
  width: number
  height: number
  label: string
}

export function EditOverlay() {
  const [active, setActive] = useState(false)
  const [hover, setHover] = useState<Box | null>(null)
  const [selected, setSelected] = useState<Box | null>(null)
  const selectedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("preview") !== "1") return

    setActive(true)
    document.documentElement.setAttribute("data-cliche-edit-mode", "1")

    const rectOf = (el: HTMLElement): Box => {
      const r = el.getBoundingClientRect()
      return {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        label:
          el.getAttribute("data-cliche-label") ||
          el.getAttribute("data-cliche-edit") ||
          "",
      }
    }

    const findEditable = (t: EventTarget | null): HTMLElement | null => {
      let el = t as HTMLElement | null
      while (el && el !== document.body) {
        if (el.hasAttribute?.("data-cliche-edit")) return el
        el = el.parentElement
      }
      return null
    }

    const onMove = (e: MouseEvent) => {
      const el = findEditable(e.target)
      setHover(el ? rectOf(el) : null)
    }

    const onClick = (e: MouseEvent) => {
      const el = findEditable(e.target)
      if (!el) return
      // En modo edición, un click selecciona el bloque (no navega ni compra).
      e.preventDefault()
      e.stopPropagation()
      const key = el.getAttribute("data-cliche-edit")!
      selectedKeyRef.current = key
      setSelected(rectOf(el))
      window.parent?.postMessage({ type: "cliche-edit-click", key }, "*")
    }

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "cliche-edit-highlight" && e.data.key) {
        const el = document.querySelector<HTMLElement>(
          `[data-cliche-edit="${e.data.key}"]`
        )
        if (el) {
          selectedKeyRef.current = e.data.key
          setSelected(rectOf(el))
          el.scrollIntoView({ block: "center", behavior: "smooth" })
        }
      }
    }

    const refresh = () => {
      if (selectedKeyRef.current) {
        const el = document.querySelector<HTMLElement>(
          `[data-cliche-edit="${selectedKeyRef.current}"]`
        )
        if (el) setSelected(rectOf(el))
      }
      setHover(null)
    }

    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("click", onClick, true)
    window.addEventListener("message", onMsg)
    window.addEventListener("scroll", refresh, true)
    window.addEventListener("resize", refresh)

    return () => {
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("message", onMsg)
      window.removeEventListener("scroll", refresh, true)
      window.removeEventListener("resize", refresh)
    }
  }, [])

  if (!active) return null

  return (
    <>
      {hover && <Outline box={hover} kind="hover" />}
      {selected && <Outline box={selected} kind="selected" />}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#2D1A14",
          color: "#FAF8F5",
          fontSize: 12,
          fontWeight: 600,
          padding: "6px 14px",
          borderRadius: 999,
          zIndex: 2147483600,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,.25)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        ✏️ Haz clic en cualquier bloque para editarlo
      </div>
    </>
  )
}

function Outline({ box, kind }: { box: Box; kind: "hover" | "selected" }) {
  const color = kind === "selected" ? "#A67163" : "#7AA7C7"
  return (
    <div
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        border: `2px solid ${color}`,
        borderRadius: 6,
        pointerEvents: "none",
        zIndex: 2147483600,
        boxShadow: kind === "selected" ? "0 0 0 4px rgba(166,113,99,.15)" : "none",
        transition: "all .08s ease-out",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -22,
          left: -2,
          background: color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        {box.label}
      </span>
    </div>
  )
}
