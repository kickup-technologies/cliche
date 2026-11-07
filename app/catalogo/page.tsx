"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, ChevronDown, Gift, MessageCircle, Truck, X, Zap } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { SEGMENTS, segmentsForSlug } from "@/lib/segments"
import { FAMILIES, familyOf } from "@/lib/families"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA, WHATSAPP_CLICHE } from "@/lib/entrega"
import { AVISO_NAVIDAD } from "@/lib/aviso-navidad"
import { TiendaCard, nombreCorto } from "@/components/tienda-card"
import type { Product } from "@/lib/supabase"

type Segmento = (typeof SEGMENTS)[number]
type Uso = "" | "hogar" | "ropa"
type Orden = "destacados" | "nombre" | "nuevos"

/** Aromas pensados para prendas (el resto, para espacios). */
const ROPA_SLUGS = new Set(["vientos-de-lino", "frescura-de-lino", "calor-de-lana", "dulce-lana", "hilos-de-seda", "lycra-de-verano"])
const usoDe = (p: Product): Uso => (ROPA_SLUGS.has(p.slug.replace(/^aroma-/, "")) ? "ropa" : "hogar")
const USOS: { value: Exclude<Uso, "">; label: string }[] = [
  { value: "hogar", label: "Para tu espacio" },
  { value: "ropa", label: "Para tu ropa" },
]
const ORDENES: { value: Orden; label: string }[] = [
  { value: "destacados", label: "Destacados" },
  { value: "nombre", label: "Nombre (A-Z)" },
  { value: "nuevos", label: "Más nuevos" },
]
/** Selector con la forma de la barra de filtros (subrayado y flecha). */
function Filtro({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={`tienda-filtro ${value ? "is-activo" : ""}`}>
      <span className="tienda-oculto">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <ChevronDown size={16} aria-hidden="true" />
    </label>
  )
}

/**
 * Tienda (/catalogo), con la estructura de Bath & Body Works y la misma de
 * Bienestar by Cliché: menú lateral por familia olfativa y por tipo de marca,
 * título con el conteo, banda de beneficios reales, barra de filtros (tipo de
 * marca, familia, uso) con "Ordenar" y cuadrícula de 4 columnas (2 en celular).
 *
 * Los enlaces de siempre siguen funcionando: ?categoria=<familia|hogar|ropa>
 * y ?segmento=<tipo de marca>.
 */
function TiendaInner() {
  const params = useSearchParams()
  const { addItem, openDrawer, items } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<string | null>(null)
  const [segmento, setSegmento] = useState<Segmento | null>(null)
  const [uso, setUso] = useState<Uso>("")
  const [orden, setOrden] = useState<Orden>("destacados")
  const [aviso, setAviso] = useState<Product | null>(null)

  // Filtros desde la URL (menú del encabezado, enlaces de las landings).
  const categoria = params.get("categoria") ?? ""
  const segParam = params.get("segmento") ?? ""
  useEffect(() => {
    setFamily(FAMILIES.some((f) => f.value === categoria) ? categoria : null)
    setUso(categoria === "hogar" || categoria === "ropa" ? categoria : "")
    setSegmento(SEGMENTS.find((s) => s.key === segParam) ?? null)
  }, [categoria, segParam])

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      // Los aromas sacados de todas las familias desde el admin (categoría
      // "ninguna") no participan de la tienda ni de sus contadores.
      .then((data) => { setProducts(Array.isArray(data) ? data.filter((p: Product) => p.slug !== "prueba" && familyOf(p) !== null) : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // El aviso de "agregado" se va solo.
  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(() => setAviso(null), 4500)
    return () => window.clearTimeout(t)
  }, [aviso])

  // La URL guarda dónde está la persona (se puede compartir) sin recargar.
  const ir = (fam: string | null, seg: Segmento | null, u: Uso = uso) => {
    setFamily(fam); setSegmento(seg); setUso(u)
    const q = new URLSearchParams()
    if (fam) q.set("categoria", fam)
    else if (u) q.set("categoria", u)
    if (seg) q.set("segmento", seg.key)
    const qs = q.toString()
    window.history.replaceState(null, "", qs ? `/catalogo?${qs}` : "/catalogo")
  }
  const quitarFiltros = () => ir(null, null, "")

  const agregar = (p: Product) => {
    // addItem dispara AddToCart (Pixel + CAPI) una sola vez.
    addItem(p)
    setAviso(p)
  }

  const conteo = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of products) { const f = familyOf(p); if (f) c[f] = (c[f] || 0) + 1 }
    return c
  }, [products])
  const familias = FAMILIES.filter((f) => conteo[f.value])
  const segmentos = SEGMENTS.filter((s) => products.some((p) => segmentsForSlug(p.slug).includes(s.key)))

  const lista = useMemo(() => {
    let l = products
    if (family) l = l.filter((p) => familyOf(p) === family)
    if (segmento) l = l.filter((p) => segmentsForSlug(p.slug).includes(segmento.key))
    if (uso) l = l.filter((p) => usoDe(p) === uso)
    // "Destacados": primero los que la marca destaca (más vendido, nuevo…) y
    // luego cada familia en su orden.
    const famIdx = (p: Product) => FAMILIES.findIndex((f) => f.value === familyOf(p))
    const rank = (p: Product) => (p.badge ? 0 : 100) + famIdx(p)
    const ordenes: Record<Orden, (a: Product, b: Product) => number> = {
      destacados: (a, b) => rank(a) - rank(b),
      nombre: (a, b) => nombreCorto(a).localeCompare(nombreCorto(b), "es"),
      nuevos: (a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""),
    }
    return [...l].sort(ordenes[orden])
  }, [products, family, segmento, uso, orden])

  const famActual = FAMILIES.find((f) => f.value === family)
  const usoActual = USOS.find((u) => u.value === uso)
  const titulo = segmento ? segmento.label : famActual ? famActual.label : usoActual ? usoActual.label : "Todos los aromas"
  const subtitulo = segmento ? segmento.tagline : famActual ? famActual.tag : "Aromas en spray para tus espacios, tus prendas y tu marca. Hechos en Colombia."
  const hayFiltros = !!(family || segmento || uso)
  const navidad = AVISO_NAVIDAD.activo && Date.now() < AVISO_NAVIDAD.hasta

  const ayuda = (clase = "") => (
    <div className={`tienda-ayuda ${clase}`}>
      <MessageCircle size={20} aria-hidden="true" />
      <p><b>¿No sabes cuál elegir?</b> Cuéntanos para qué espacio o marca es y te recomendamos.</p>
      <a href={`https://wa.me/${WHATSAPP_CLICHE}?text=${encodeURIComponent("¡Hola Cliché! Quiero asesoría para elegir mi aroma")}`} target="_blank" rel="noreferrer">Asesoría por WhatsApp</a>
    </div>
  )

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="tienda tienda-cliche">
        <div className="tienda-wrap">
          <nav className="tienda-migas" aria-label="Estás en">
            <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
            {hayFiltros
              ? <><button type="button" onClick={quitarFiltros}>Tienda</button><span aria-hidden="true">/</span><b>{titulo}</b></>
              : <b>Tienda</b>}
          </nav>

          <div className="tienda-grid">
            {/* ── Menú lateral (escritorio) ── */}
            <aside className="tienda-lado" aria-label="Categorías">
              <h2>Por familia</h2>
              <ul>
                <li><button type="button" className={!hayFiltros ? "is-activo" : ""} aria-current={!hayFiltros ? "true" : undefined} onClick={quitarFiltros}>Todos los aromas <small>{products.length || ""}</small></button></li>
                {familias.map((f) => (
                  <li key={f.value}><button type="button" className={family === f.value && !segmento ? "is-activo" : ""} aria-current={family === f.value && !segmento ? "true" : undefined} onClick={() => ir(f.value, null, "")}>{f.label} <small>{conteo[f.value]}</small></button></li>
                ))}
              </ul>
              <h2>Por tipo de marca</h2>
              <ul>
                {segmentos.map((s) => (
                  <li key={s.key}><button type="button" className={segmento?.key === s.key && !family ? "is-activo" : ""} aria-current={segmento?.key === s.key && !family ? "true" : undefined} onClick={() => ir(null, s, "")}>{s.label}</button></li>
                ))}
              </ul>
              {ayuda()}
            </aside>

            <section className="tienda-main" aria-labelledby="tienda-titulo">
              <div className="tienda-cabeza">
                <h1 id="tienda-titulo">{titulo}</h1>
                <span aria-live="polite">{loading ? "" : `${lista.length} producto${lista.length !== 1 ? "s" : ""}`}</span>
              </div>
              <p className="tienda-sub">{subtitulo}</p>

              {/* Beneficios reales del pedido (los mismos del checkout). */}
              <ul className="tienda-banda">
                <li><Zap size={17} aria-hidden="true" /><span>Llega en {ENTREGA_EN_LINEA}</span></li>
                {SOUVENIR_EN_LINEA && <li><Gift size={17} aria-hidden="true" /><span>Souvenir de regalo al pagar en línea</span></li>}
                <li><Truck size={17} aria-hidden="true" /><span>{navidad ? `Para Navidad, pide hasta el ${AVISO_NAVIDAD.fechaCorta}` : "Envío gratis desde $300.000"}</span></li>
              </ul>

              {/* Chips de familia: el menú lateral en celular. */}
              <div className="tienda-chips" role="group" aria-label="Familias">
                <button type="button" className={!family ? "active" : ""} aria-pressed={!family} onClick={() => ir(null, segmento)}>Todos</button>
                {familias.map((f) => (
                  <button type="button" key={f.value} className={family === f.value ? "active" : ""} aria-pressed={family === f.value} onClick={() => ir(f.value, segmento)}>{f.label}</button>
                ))}
              </div>

              <div className="tienda-filtros">
                <span className="tienda-filtros-titulo">Filtros</span>
                <div className="tienda-filtros-campos">
                  <Filtro label="Tipo de marca" value={segmento?.key || ""} onChange={(v) => ir(family, SEGMENTS.find((s) => s.key === v) ?? null)}>
                    <option value="">Tipo de marca</option>
                    {segmentos.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </Filtro>
                  <span className="tienda-solo-escritorio">
                    <Filtro label="Familia" value={family || ""} onChange={(v) => ir(v || null, segmento)}>
                      <option value="">Familia</option>
                      {familias.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </Filtro>
                  </span>
                  <Filtro label="Uso" value={uso} onChange={(v) => ir(family, segmento, v as Uso)}>
                    <option value="">Uso</option>
                    {USOS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </Filtro>
                </div>
                <Filtro label="Ordenar por" value={orden === "destacados" ? "" : orden} onChange={(v) => setOrden((v || "destacados") as Orden)}>
                  <option value="">Ordenar</option>
                  {ORDENES.slice(1).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Filtro>
              </div>

              {hayFiltros && (
                <div className="tienda-activos">
                  {segmento && <button type="button" onClick={() => ir(family, null)}>{segmento.label} <X size={13} aria-hidden="true" /><span className="tienda-oculto">quitar</span></button>}
                  {famActual && <button type="button" onClick={() => ir(null, segmento)}>{famActual.label} <X size={13} aria-hidden="true" /><span className="tienda-oculto">quitar</span></button>}
                  {usoActual && <button type="button" onClick={() => ir(family, segmento, "")}>{usoActual.label} <X size={13} aria-hidden="true" /><span className="tienda-oculto">quitar</span></button>}
                  <button type="button" className="tienda-limpiar" onClick={quitarFiltros}>Quitar todo</button>
                </div>
              )}

              {loading ? (
                <div className="tienda-productos" aria-busy="true">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="tienda-card"><div className="tienda-foto animate-pulse" /></div>)}
                </div>
              ) : lista.length > 0 ? (
                <div className="tienda-productos">
                  {lista.map((p) => <TiendaCard key={p.id} product={p} onAdd={agregar} />)}
                </div>
              ) : (
                <div className="tienda-vacio">
                  <p>No hay aromas con esa combinación.</p>
                  <button type="button" onClick={quitarFiltros}>Ver todos los aromas</button>
                </div>
              )}

              {/* Arma tu kit: mezclar aromas a precio de kit. */}
              <Link href="/arma-tu-kit" className="tienda-kit">
                <span><b>¿Quieres mezclar aromas?</b> Arma tu kit x3, x4 o x6 con los que quieras.</span>
                <span aria-hidden="true">Armar →</span>
              </Link>

              {/* La asesoría, en celular (en escritorio vive en el menú lateral). */}
              {ayuda("tienda-ayuda-movil")}
            </section>
          </div>
        </div>

        {/* Aviso de "agregado": abre el carrito. */}
        <div className={`tienda-aviso${aviso ? " is-visible" : ""}`} role="status" aria-live="polite">
          {aviso && (
            <>
              <Check size={17} aria-hidden="true" />
              <span><b>{nombreCorto(aviso)}</b> está en tu carrito</span>
              <button type="button" className="tienda-aviso-ver" onClick={() => { setAviso(null); openDrawer() }}>Ver carrito ({items.reduce((n, i) => n + i.quantity, 0)})</button>
              <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)}><X size={15} /></button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={null}>
      <TiendaInner />
    </Suspense>
  )
}
