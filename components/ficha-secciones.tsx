"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Gift, Home, MapPin, RotateCcw, ShieldCheck, Shirt, Sparkles, Truck, Wind, Zap, type LucideIcon } from "lucide-react"
import { FAMILIES, familyOf } from "@/lib/families"
import { PRICE_TIERS, tierSavings, type PriceTier } from "@/lib/pricing"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA } from "@/lib/entrega"
import type { Product } from "@/lib/supabase"

/*
 * Piezas de la ficha v2 de Cliché (7-nov-2026), con la estructura de la ficha
 * de Bienestar by Cliché: láminas en la galería, kits en tarjetas con foto,
 * secciones abiertas (por qué te va a gustar, cómo se usa, envío, preguntas y
 * la historia) y una barra de atajos fija. Solo datos que ya estaban en el
 * sitio: los usos y la duración de "¿Cómo usarlo?", el envío y la garantía.
 */

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`
const FAMILIA_SINGULAR: Record<string, string> = { citricos: "cítrica", florales: "floral", amaderados: "amaderada", dulces: "dulce", frescos: "fresca" }
export const nombreCorto = (p: Product) => p.name.replace(/^Aroma\s+/i, "").split(" — ")[0]

/** Los pasos de uso (los mismos que tenía "¿Cómo usarlo?"). */
const PASOS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Home, titulo: "En tus espacios", texto: "Aplica de 3 a 5 pufs al aire en habitaciones de hasta 20 m²." },
  { Icono: Shirt, titulo: "En tu ropa", texto: "3 pufs en prendas superiores y 5 en jeans y prendas inferiores." },
  { Icono: Wind, titulo: "Deja que se asiente", texto: "El aroma se siente hasta 8 horas en espacios cerrados." },
]

const ENVIO: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Zap, titulo: `Llega en ${ENTREGA_EN_LINEA}`, texto: "Despacho prioritario de los pedidos pagados en línea, a toda Colombia." },
  { Icono: Truck, titulo: "Envío gratis desde $300.000", texto: "Por debajo, el flete se calcula en el pago." },
  ...(SOUVENIR_EN_LINEA ? [{ Icono: Gift, titulo: "Souvenir de regalo", texto: "Va en tu caja cuando pagas en línea." }] : []),
  { Icono: RotateCcw, titulo: "Garantía de 30 días", texto: "Para cambios y devoluciones." },
  { Icono: ShieldCheck, titulo: "Pago protegido", texto: "Tarjeta, PSE o Nequi con Mercado Pago." },
]

export const LAMINAS: { id: string; label: string; Icono: LucideIcon }[] = [
  { id: "lamina:aroma", label: "El aroma", Icono: Sparkles },
  { id: "lamina:uso", label: "Cómo se usa", Icono: Wind },
  { id: "lamina:envio", label: "Envío", Icono: Truck },
]

/**
 * Lámina de la galería: una "foto" hecha en HTML con lo que el cliente quiere
 * saber antes de comprar (a qué huele, cómo se usa, cuándo llega).
 */
export function LaminaFicha({ tipo, product, notes }: { tipo: string; product: Product; notes: string[] }) {
  const fam = FAMILIES.find((f) => f.value === familyOf(product))
  return (
    <div className="ficha-lamina">
      {tipo === "lamina:aroma" && (
        <>
          <span className="ficha-lamina-eyebrow">El aroma</span>
          <h3>{nombreCorto(product)}</h3>
          {fam && <p className="ficha-lamina-familia"><b>{fam.label}</b> · {fam.tag}</p>}
          {notes.length > 0 && (
            <ul className="ficha-lamina-notas">
              {notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          <p className="ficha-lamina-pie">Spray de 250 ml · para espacios, prendas y paquetes de envío</p>
        </>
      )}
      {tipo === "lamina:uso" && (
        <>
          <span className="ficha-lamina-eyebrow">Cómo se usa</span>
          <ol className="ficha-lamina-pasos">
            {PASOS.map((p, i) => <li key={p.titulo}><span aria-hidden="true">{i + 1}</span><div><b>{p.titulo}</b><small>{p.texto}</small></div></li>)}
          </ol>
        </>
      )}
      {tipo === "lamina:envio" && (
        <>
          <span className="ficha-lamina-eyebrow">Envío y garantía</span>
          <ul className="ficha-lamina-envio">
            {ENVIO.map(({ Icono, titulo }) => <li key={titulo}><Icono size={20} aria-hidden="true" /><b>{titulo}</b></li>)}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * Presentaciones en tarjetas con foto (como los packs de Bienestar): los
 * frascos apilados según la cantidad, el precio, el valor por frasco y lo que
 * se ahorra frente a la unidad, sin precios tachados.
 */
export function KitsFicha({ product, tierId, onChange }: { product: Product; tierId: string; onChange: (id: string) => void }) {
  const foto = (Array.isArray(product.image_urls) ? product.image_urls.find(Boolean) : null) || product.image_url || ""
  const precioDe = (t: PriceTier) => (t.id === "unit" ? product.price : t.price)
  return (
    <fieldset className="ficha-kits">
      <legend>Elige tu presentación</legend>
      {PRICE_TIERS.map((t) => {
        const on = t.id === tierId
        const n = Math.min(t.units, 3)
        return (
          <label key={t.id} className={`ficha-kit${on ? " is-on" : ""}`}>
            <input type="radio" name="presentacion" value={t.id} checked={on} onChange={() => onChange(t.id)} className="sr-only" />
            {t.badge && <span className="ficha-kit-cinta">{t.badge}</span>}
            <span className={`ficha-kit-fotos n${n}`} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {Array.from({ length: n }).map((_, i) => <img key={i} src={foto} alt="" />)}
              {t.units > 3 && <em>×{t.units}</em>}
            </span>
            <b>{t.label}</b>
            <strong>{fmt(precioDe(t))}</strong>
            {t.units > 1
              ? <small>{fmt(Math.round(t.price / t.units))} c/u · ahorras {fmt(tierSavings(t))}</small>
              : <small>Un frasco de 250 ml</small>}
            <span className="ficha-kit-radio" aria-hidden="true" />
          </label>
        )
      })}
    </fieldset>
  )
}

const ANCLAS = [
  { id: "por-que", label: "Por qué" },
  { id: "uso", label: "Cómo se usa" },
  { id: "envio", label: "Envío" },
  { id: "preguntas", label: "Preguntas" },
  { id: "historia", label: "La historia" },
]

/**
 * Barra de atajos fija arriba (aparece al pasar el botón de compra): lleva a
 * cada sección y marca en cuál va la persona.
 */
export function AtajosFicha({ visible }: { visible: boolean }) {
  const [activa, setActiva] = useState("por-que")
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => { for (const e of entradas) if (e.isIntersecting) setActiva(e.target.id) },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    for (const a of ANCLAS) { const el = document.getElementById(a.id); if (el) obs.observe(el) }
    return () => obs.disconnect()
  }, [])
  return (
    <nav className={`ficha-atajos${visible ? " is-visible" : ""}`} aria-label="Secciones de la ficha">
      {ANCLAS.map((a) => (
        <a key={a.id} href={`#${a.id}`} className={activa === a.id ? "is-activa" : undefined} aria-current={activa === a.id ? "true" : undefined}>{a.label}</a>
      ))}
    </nav>
  )
}

/** Secciones abiertas debajo de la compra (reemplazan el acordeón cerrado). */
export function SeccionesFicha({ product, historia, titulo, faq, isKit }: {
  product: Product
  historia: string
  titulo?: string | null
  faq: { q: string; a: string }[]
  isKit: boolean
}) {
  const [abierta, setAbierta] = useState(0)
  const fam = FAMILIES.find((f) => f.value === familyOf(product))
  const porQue = [
    ...(fam ? [{ Icono: Sparkles, titulo: `Familia ${FAMILIA_SINGULAR[fam.value] ?? fam.label.toLowerCase()}`, texto: fam.tag }] : []),
    { Icono: Home, titulo: "Para espacios, prendas y envíos", texto: "Pensado para tu casa, tu ropa y los paquetes que despachas." },
    { Icono: Wind, titulo: "Rinde y se queda", texto: "3 a 5 pufs perfuman un espacio de 20 m², hasta 8 horas en espacios cerrados." },
    { Icono: MapPin, titulo: "Hecho en Colombia", texto: "Frasco de 250 ml con atomizador." },
  ]
  return (
    <div className="ficha-secciones">
      <section id="por-que" className="ficha-sec">
        <h2>Por qué te va a gustar</h2>
        <ul className="ficha-porque">
          {porQue.map(({ Icono, titulo: t, texto }) => <li key={t}><Icono size={22} aria-hidden="true" /><b>{t}</b><small>{texto}</small></li>)}
        </ul>
      </section>

      <section id="uso" className="ficha-sec">
        <h2>Cómo se usa</h2>
        <ol className="ficha-pasos">
          {PASOS.map((p, i) => <li key={p.titulo}><span aria-hidden="true">{i + 1}</span><div><b>{p.titulo}</b><small>{p.texto}</small></div></li>)}
        </ol>
        <p className="ficha-nota">Evita el contacto con los ojos y mantenlo fuera del alcance de los niños.</p>
      </section>

      <section id="envio" className="ficha-sec">
        <h2>Envío y garantía</h2>
        <ul className="ficha-envio">
          {ENVIO.map(({ Icono, titulo: t, texto }) => <li key={t}><Icono size={20} aria-hidden="true" /><div><b>{t}</b><small>{texto}</small></div></li>)}
        </ul>
      </section>

      <section id="preguntas" className="ficha-sec">
        <h2>Preguntas frecuentes</h2>
        <div className="ficha-faq">
          {faq.map((f, i) => {
            const open = abierta === i
            return (
              <div key={f.q} className={`ficha-faq-item${open ? " is-open" : ""}`}>
                <button type="button" aria-expanded={open} onClick={() => setAbierta(open ? -1 : i)}>
                  <span>{f.q}</span><ChevronDown size={18} aria-hidden="true" />
                </button>
                {open && <p>{f.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section id="historia" className="ficha-sec ficha-historia">
        <h2>La historia</h2>
        {titulo && <p className="ficha-historia-titulo">{titulo}</p>}
        {historia.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
        {isKit && <p className="ficha-nota">Kit con varios frascos de 250 ml: cada uno aromatiza hasta 160 prendas o espacios. Listo para regalar.</p>}
      </section>
    </div>
  )
}
