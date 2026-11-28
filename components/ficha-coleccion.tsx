"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Check, ChevronRight, ShieldCheck, Truck } from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { PedidoRapido } from "@/components/pedido-rapido"
import { AtajosFicha, SeccionesFicha } from "@/components/ficha-secciones"
import { useCAPI } from "@/lib/use-capi"
import { useSiteSettings } from "@/lib/use-site-settings"
import { parseFreeShippingThreshold, SHIPPING_COST } from "@/lib/pricing"
import { ENTREGA_EN_LINEA } from "@/lib/entrega"
import { CONTRAENTREGA_ACTIVA } from "@/lib/contraentrega"
import { AVISO_NAVIDAD } from "@/lib/aviso-navidad"
import {
  BLACK_FRIDAY, COLECCION_AROMAS, COLECCION_CANTIDADES, COLECCION_FOTO, enBlackFriday,
  separadoColecciones, totalColecciones,
} from "@/lib/coleccion"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`
const notasDe = (slug: string) => COLECCION_AROMAS.find((a) => a.slug === slug)?.notas ?? ""
const nombreDe = (slug: string) => COLECCION_AROMAS.find((a) => a.slug === slug)?.nombre ?? ""

/** Black Friday en una franja de una línea, con la cuenta regresiva real. */
function CintaBlackFriday() {
  // null hasta montar: el reloj del servidor y el del navegador no coinciden.
  const [ahora, setAhora] = useState<number | null>(null)
  useEffect(() => {
    setAhora(Date.now())
    const t = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (ahora !== null && !enBlackFriday(ahora)) return null
  const seg = ahora === null ? null : Math.max(0, Math.floor((BLACK_FRIDAY.hasta - ahora) / 1000))
  const partes: [string, number | null][] = [
    ["d", seg === null ? null : Math.floor(seg / 86400)],
    ["h", seg === null ? null : Math.floor(seg / 3600) % 24],
    ["m", seg === null ? null : Math.floor(seg / 60) % 60],
    ["s", seg === null ? null : seg % 60],
  ]
  return (
    <div className="col-bf" role="timer" aria-label="Black Friday: la rebaja por llevar 2 o 3 Colecciones termina el lunes 30 a medianoche">
      <p className="col-bf-titulo"><b>Black Friday</b><small>termina en</small></p>
      <p className="col-bf-reloj" aria-hidden="true">
        {partes.map(([u, v]) => <span key={u}><strong>{v === null ? "--" : String(v).padStart(2, "0")}</strong>{u}</span>)}
      </p>
    </div>
  )
}

/**
 * Ficha de la «Colección de Navidad»: el mismo diseño de las fichas de los
 * aromas (encabezado, galería, secciones), con los cuatro aromas fijos y,
 * como en Black Accord, solo la elección de cuántas (1, 2 o 3).
 */
export function FichaColeccion({ product, aromas }: { product: Product; aromas: Product[] }) {
  const siteSettings = useSiteSettings()
  const { track } = useCAPI()
  const [cantidad, setCantidad] = useState(1)
  const [pedidoAbierto, setPedidoAbierto] = useState(false)
  const [foto, setFoto] = useState(COLECCION_FOTO)
  // La rebaja del Black Friday se apaga sola a medianoche, sin recargar.
  const [bf, setBf] = useState(() => enBlackFriday())
  useEffect(() => {
    setBf(enBlackFriday())
    const falta = BLACK_FRIDAY.hasta - Date.now()
    if (falta <= 0 || falta > 2_000_000_000) return
    const t = window.setTimeout(() => setBf(false), falta)
    return () => window.clearTimeout(t)
  }, [])

  const total = totalColecciones(cantidad, bf)
  const separado = separadoColecciones(aromas, cantidad)
  const umbral = parseFreeShippingThreshold(siteSettings.free_shipping_threshold)
  const textoComprar = (cantidad > 1 ? `Llevar ${cantidad} Colecciones` : "Comprar ahora").toUpperCase()
  const ids = aromas.map((a) => a.id)
  const galeria = product.image_urls.length ? product.image_urls : [COLECCION_FOTO]

  // Barra fija: aparece cuando el botón principal sale de la pantalla.
  const ctaRef = useRef<HTMLDivElement>(null)
  const [barra, setBarra] = useState(false)
  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setBarra(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    track({ event_name: "ViewContent", custom_data: { content_ids: ids, content_name: product.name, content_type: "product", currency: "COP", value: product.price } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pedir() {
    track({
      event_name: "InitiateCheckout",
      custom_data: { content_ids: ids, content_name: product.name, content_type: "product", currency: "COP", value: total, num_items: cantidad * aromas.length },
    })
    setPedidoAbierto(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <div className="container mx-auto px-4 sm:px-6 mb-8">
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/catalogo" className="hover:text-primary transition-colors">Aromas</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/80 truncate max-w-[200px] normal-case tracking-normal">{product.name}</span>
          </nav>
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-start mb-20 lg:mb-28">
            {/* Galería */}
            <div className="relative lg:sticky lg:top-24">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-muted/20">
                <Image src={foto} alt={`${product.name}: ${COLECCION_AROMAS.map((a) => a.nombre).join(", ")}`} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                {product.badge && (
                  <div className="absolute top-4 left-4">
                    <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>{product.badge}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 mt-4">
                {galeria.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setFoto(url)}
                    aria-label={i === 0 ? "Ver la Colección" : `Ver ${nombreDe(aromas[i - 1]?.slug ?? "")}`}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${foto === url ? "border-primary shadow-md" : "border-border hover:border-primary/50"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Información y compra */}
            <div className="flex flex-col gap-4 lg:pt-2">
              <h1 className="font-serif text-[2rem] lg:text-[2.75rem] font-bold text-foreground leading-[1.08] tracking-tight">{product.name}</h1>
              <p className="text-[15.5px] text-muted-foreground leading-[1.6] -mt-1">
                Navidad, Calor de Lana, Tierra y Sello de Dios: 4 aromas de 250 ml para la casa y la ropa.
              </p>

              <CintaBlackFriday />

              <div>
                <p className="col-precio">
                  <strong>{fmt(total)}</strong>
                  <s>{fmt(separado)}</s>
                  <em>por separado</em>
                </p>
                <p className="text-[13px] text-muted-foreground mt-1">Impuestos incluidos · llega en {ENTREGA_EN_LINEA}</p>
              </div>

              <div className="col-oferta">
                <p className="col-oferta-titulo">¿Cuántas Colecciones?</p>
                <fieldset className="cod-packs col-packs">
                  <legend className="cod-oculto">Elige cuántas Colecciones</legend>
                  {COLECCION_CANTIDADES.map((n) => {
                    const on = n === cantidad
                    const t = totalColecciones(n, bf)
                    const sep = separadoColecciones(aromas, n)
                    const cinta = bf ? (n === 2 ? "Recomendado" : n === 3 ? "Mejor precio" : "") : ""
                    return (
                      <label key={n} className={`cod-pack ${on ? "is-on" : ""}`}>
                        {cinta && <span className="cod-pack-cinta">{cinta}</span>}
                        <input className="cod-oculto" type="radio" name="col-cantidad" value={n} checked={on} onChange={() => setCantidad(n)} />
                        <span className="cod-pack-radio" aria-hidden="true" />
                        <span className={`col-pack-fotos n${n}`} aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {Array.from({ length: n }, (_, i) => <img key={i} src={COLECCION_FOTO} alt="" width={40} height={40} />)}
                        </span>
                        <b>{n} {n === 1 ? "Colección" : "Colecciones"}</b>
                        <strong>{fmt(t)}</strong>
                        <s className="pr-tachado"><span className="cod-oculto">Por separado </span>{fmt(sep)}</s>
                        <small>Ahorras {fmt(sep - t)}</small>
                      </label>
                    )
                  })}
                </fieldset>
                <p className="col-nota">Tachado: lo que valen esos frascos por separado.</p>
              </div>

              <div ref={ctaRef}>
                <button type="button" className="cod-cta pdp-comprar" onClick={pedir} disabled={product.stock < cantidad}>
                  <Truck size={19} aria-hidden="true" />
                  <span className="cod-cta-txt">
                    <span>{textoComprar} · {fmt(total)}</span>
                    <small>{CONTRAENTREGA_ACTIVA ? "Pagas al recibir · " : ""}llega en {ENTREGA_EN_LINEA.replace(" a ", "-")}</small>
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-3 pt-3 border-t border-foreground/[0.06] divide-x divide-foreground/[0.06]">
                {[
                  { Icon: Truck, label: `Llega en ${ENTREGA_EN_LINEA.replace(" a ", "-").replace(" hábiles", "")}` },
                  { Icon: ShieldCheck, label: CONTRAENTREGA_ACTIVA ? "Pagas al recibir" : "Pago 100% seguro" },
                  { Icon: BadgeCheck, label: "30 días garantía" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-2 px-2 py-1">
                    <Icon className="w-[18px] h-[18px] text-primary" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              <div className="col-trae">
                <p className="col-oferta-titulo">Cada Colección trae · 250 ml cada uno</p>
                <ul>
                  {aromas.map((a) => (
                    <li key={a.id}>
                      <Link href={`/productos/${a.slug}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={(Array.isArray(a.image_urls) && a.image_urls.find(Boolean)) || a.image_url} alt="" loading="lazy" decoding="async" />
                        <span><b>{nombreDe(a.slug)}</b><small>{notasDe(a.slug)}</small></span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="col-condiciones">
                  <li><Check size={15} aria-hidden="true" /> Entrega estimada de {ENTREGA_EN_LINEA}</li>
                  <li><Check size={15} aria-hidden="true" /> {total >= umbral ? "Envío gratis en este pedido" : `Envío ${fmt(SHIPPING_COST)} · gratis desde ${fmt(umbral)}`}</li>
                  <li><Check size={15} aria-hidden="true" /> Garantía de 30 días</li>
                </ul>
                {AVISO_NAVIDAD.activo && <p className="col-navidad"><b>Navidad:</b> pide hasta el {AVISO_NAVIDAD.fechaLimite} y llega antes del 24.</p>}
              </div>
            </div>
          </div>

          <SeccionesFicha
            product={product}
            historia={product.description || ""}
            isKit
            faq={[
              ...(bf ? [{ q: "¿Hasta cuándo es el Black Friday?", a: `Hasta el lunes 30 de noviembre a las 11:59 p. m., hora de Colombia: 2 Colecciones por ${fmt(totalColecciones(2, true))} y 3 por ${fmt(totalColecciones(3, true))}. Desde el 1 de diciembre cada Colección vale ${fmt(totalColecciones(1, false))}.` }] : []),
              { q: "¿Qué aromas trae?", a: `${COLECCION_AROMAS.map((a) => `${a.nombre} (${a.notas.toLowerCase()})`).join(", ")}. Un frasco de 250 ml de cada uno.` },
              { q: "¿Cómo pago?", a: CONTRAENTREGA_ACTIVA ? "En efectivo cuando la recibes, o en línea con tarjeta, PSE o Nequi." : "En línea con tarjeta, PSE o Nequi." },
              { q: "¿Cuándo llega?", a: `Despachamos a toda Colombia y llega en ${ENTREGA_EN_LINEA}.` },
              ...(AVISO_NAVIDAD.activo ? [{ q: "¿Llega a tiempo para Navidad?", a: `Sí, si la pides hasta el ${AVISO_NAVIDAD.fechaLimite}.` }] : []),
            ]}
          />
        </div>
      </main>
      <Footer />
      <WhatsAppButton />

      <PedidoRapido
        abierto={pedidoAbierto}
        onClose={() => setPedidoAbierto(false)}
        product={product}
        tierId="x4"
        onTierChange={() => {}}
        qty={1}
        coleccion={{ aromas, cantidad, onCantidad: setCantidad, bf }}
      />

      <AtajosFicha visible={barra} />

      <div
        className="fixed inset-x-0 bottom-0 z-40 transition-all duration-300"
        style={{ marginBottom: "var(--cookie-bar-h, 0px)", transform: barra ? "translateY(0)" : "translateY(120%)", opacity: barra ? 1 : 0 }}
        inert={!barra}
      >
        <div
          className="flex w-full items-center gap-3 border-t border-border bg-card py-3 pl-4 pr-[84px] lg:pl-10 lg:pr-28"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)", boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }}
        >
          <div className="hidden lg:block h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={COLECCION_FOTO} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate lg:font-serif lg:text-sm lg:text-foreground">{product.name}</p>
            <p className="font-bold text-foreground text-sm">{fmt(total)} · {cantidad} {cantidad === 1 ? "Colección" : "Colecciones"}</p>
          </div>
          <button type="button" className="col-barra-cta" onClick={pedir}>{textoComprar}</button>
        </div>
      </div>
    </>
  )
}
