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

    // Claves de texto que se pueden editar EN SITIO (contentEditable), estilo
    // Canva: clicas el texto y escribes directamente sobre el bloque.
    const INLINE_KEYS = new Set([
      "hero_title", "hero_subtitle", "announcement_text",
      "featured_title", "featured_subtitle",
      "cta_title", "cta_subtitle", "newsletter_subtitle",
    ])

    let inlineEl: HTMLElement | null = null
    let cleanupInline: (() => void) | null = null

    const endInline = () => {
      cleanupInline?.()
      cleanupInline = null
      inlineEl = null
    }

    const startInline = (el: HTMLElement, key: string) => {
      if (inlineEl === el) { el.focus(); return }
      endInline()
      inlineEl = el
      el.setAttribute("contenteditable", "plaintext-only")
      el.setAttribute("spellcheck", "false")
      el.style.outline = "none"
      el.style.cursor = "text"
      el.focus()
      // Caret al final del texto
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      window.parent?.postMessage({ type: "cliche-inline-start", key }, "*")

      const onInput = () => {
        window.parent?.postMessage({ type: "cliche-inline-edit", key, value: el.innerText }, "*")
      }
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); el.blur() }
        if (ev.key === "Escape") { ev.preventDefault(); el.blur() }
      }
      const onBlur = () => {
        const value = el.innerText
        el.removeAttribute("contenteditable")
        el.removeAttribute("spellcheck")
        el.style.cursor = ""
        el.removeEventListener("input", onInput)
        el.removeEventListener("keydown", onKeyDown)
        el.removeEventListener("blur", onBlur)
        window.parent?.postMessage({ type: "cliche-inline-end", key, value }, "*")
      }
      el.addEventListener("input", onInput)
      el.addEventListener("keydown", onKeyDown)
      el.addEventListener("blur", onBlur)
      cleanupInline = () => {
        el.removeAttribute("contenteditable")
        el.removeAttribute("spellcheck")
        el.style.cursor = ""
        el.removeEventListener("input", onInput)
        el.removeEventListener("keydown", onKeyDown)
        el.removeEventListener("blur", onBlur)
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
      if (inlineEl) return // mientras se edita en sitio no movemos el hover
      const el = findEditable(e.target)
      setHover(el ? rectOf(el) : null)
    }

    const onClick = (e: MouseEvent) => {
      const el = findEditable(e.target)
      // Click fuera de un bloque editable → cerrar edición en sitio
      if (!el) { if (inlineEl) inlineEl.blur(); return }
      // En modo edición, un click selecciona el bloque (no navega ni compra).
      e.preventDefault()
      e.stopPropagation()
      const key = el.getAttribute("data-cliche-edit")!
      selectedKeyRef.current = key
      setSelected(rectOf(el))
      setHover(null)
      window.parent?.postMessage({ type: "cliche-edit-click", key }, "*")
      // Texto → edición directa sobre el bloque. Otros (imágenes) → panel lateral.
      if (INLINE_KEYS.has(key)) startInline(el, key)
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
      endInline()
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
        ✏️ Clic en un texto para escribir aquí mismo · Enter para confirmar
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
