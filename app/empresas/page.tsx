import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase"
import { CATALOG_AS_PRODUCTS } from "@/lib/catalog-data"
import { PRICE_TIERS, UNIT_PRICE } from "@/lib/pricing"
import { SEO_PAGES, withSeoOverride } from "@/lib/seo"
import { OFRECER_DISTRIBUIDORES } from "@/lib/b2b-leads"
import { DEFAULT_WHATSAPP, MqBrands, MqFooter, MqTests, type TestimonioId } from "@/components/landing-maqueta/parts"
import { CotizarLink, EmpresasTracker, LeadForm, StickyBar, WaLink, WaNumberText } from "./empresas-client"
import "./empresas.css"

/**
 * Landing B2B /empresas — destino de la pauta de Google Ads y Meta para marcas
 * y negocios: marketing olfativo, aroma exclusivo, kits y regalos
 * corporativos, con formulario de cotización que guarda el ORIGEN del
 * contacto (b2b_leads) y lo muestra en el panel (sección "Empresas").
 *
 * Presentación: la maqueta de Cliché (landings/empresas-cliche) TAL CUAL,
 * con su propia cabecera y pie (sin el Header ni el Footer de la tienda).
 * Datos reales: aromas, fotos y conteo salen de la BD; precios de
 * lib/pricing; condiciones de envío de los términos. No se publican tiempos,
 * mínimos ni precios del aroma exclusivo: eso va en la cotización.
 */

export const revalidate = 3600

/** Bloque "Regalos de fin de año": su texto pide cotizar en noviembre para
 *  entregar antes de la prima, así que se oculta solo al terminar noviembre. */
const TEMPORADA_REGALOS_HASTA = "2026-11-30T23:59:59-05:00"

// ── SEO ──────────────────────────────────────────────────────────────────────

const PAGE = SEO_PAGES.find((p) => p.path === "/empresas")!

const BASE: Metadata = {
  title: PAGE.title,
  description: PAGE.description,
  alternates: { canonical: "/empresas" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/empresas",
    siteName: "Cliché Colombia",
    title: `${PAGE.title} | Cliché Colombia`,
    description: PAGE.description,
    images: [{ url: "/images/category-hoteles.png", width: 1023, height: 1537, alt: "Spray de aroma Cliché en la recepción de un hotel" }],
  },
}

export function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/empresas", BASE)
}

// ── Datos ────────────────────────────────────────────────────────────────────

interface Aroma {
  slug: string
  name: string
  image_url: string | null
}

/** Nombre corto para chips: "Aroma Agua — Fragancia Fresca" → "Agua". */
const shortName = (name: string) => name.replace(/^Aroma\s+/i, "").split(/\s+[—–]\s+/)[0].trim()
/** Slug sin el prefijo "aroma-" de la BD (Brillos de Seda existe con dos grafías). */
const baseSlug = (slug: string) => slug.replace(/^aroma-/, "").replace(/^brillos-de-seda$/, "brillos-seda")

/** Solo aromas: fuera los kits armados y el producto de prueba del checkout. */
const isAroma = (p: Aroma) => !p.slug.startsWith("kit-") && p.slug !== "prueba"

/** Mismo respaldo que /arma-tu-kit y /api/products: catálogo local si la BD
 *  falla o está vacía, para no publicar la landing sin aromas. */
const CATALOG_AROMAS: Aroma[] = CATALOG_AS_PRODUCTS.map((p) => ({ slug: p.slug, name: p.name, image_url: p.image_url }))

async function loadData(): Promise<{ aromas: Aroma[]; whatsappNumber: string }> {
  if (!isSupabaseConfigured) return { aromas: CATALOG_AROMAS.filter(isAroma), whatsappNumber: DEFAULT_WHATSAPP }
  try {
    const db = createServerClient()
    const [{ data: products }, { data: settings }] = await Promise.all([
      db.from("products").select("slug, name, image_url").eq("is_active", true),
      db.from("site_settings").select("value").eq("key", "whatsapp_number").maybeSingle(),
    ])
    const fromDb = ((products || []) as Aroma[]).filter(isAroma)
    const digits = typeof settings?.value === "string" ? settings.value.replace(/\D/g, "") : ""
    return {
      aromas: fromDb.length ? fromDb : CATALOG_AROMAS.filter(isAroma),
      whatsappNumber: digits.length >= 10 ? digits : DEFAULT_WHATSAPP,
    }
  } catch {
    return { aromas: CATALOG_AROMAS.filter(isAroma), whatsappNumber: DEFAULT_WHATSAPP }
  }
}

// ── Contenido (de la maqueta) ────────────────────────────────────────────────

/** Aromas sugeridos por tipo de negocio (curaduría de la maqueta). Nombre y
 *  foto salen de la BD; un aroma inactivo no se muestra. */
const SEGMENTOS = [
  {
    title: "Tiendas y marcas de ropa",
    text: "El aroma recibe a tus clientas en la tienda y viaja en cada prenda y cada pedido que despachas.",
    slugs: ["brillos-seda", "vientos-de-lino", "eternamente-indigo"],
  },
  {
    title: "Hoteles, spas y Airbnb",
    text: "Lobby, habitaciones y cabinas con un aroma que tus huéspedes reconocen desde que entran.",
    slugs: ["tierra", "sello-de-dios", "agua"],
  },
  {
    title: "Oficinas y consultorios",
    text: "Recepción y salas de espera con un aroma fresco y limpio que acompaña a tus clientes y a tu equipo.",
    slugs: ["aire", "agua"],
  },
  {
    title: "Marcas premium y streetwear",
    text: "Un aroma amaderado y elegante que se vuelve parte de la firma de tu marca.",
    slugs: ["luxury", "eternamente-indigo"],
  },
]

const PASOS = [
  { t: "Nos cuentas tu marca", d: "Qué espacios tienes, qué quieres que sientan tus clientes y cuántas unidades imaginas." },
  { t: "Te proponemos aromas", d: "Partimos de la colección o de una fórmula a la medida de tu marca." },
  { t: "Definimos la cotización", d: "Aroma, presentación, cantidades y tiempos de entrega, por escrito." },
  { t: "Producimos y despachamos", d: "Hecho a mano en Medellín, con envío a toda Colombia." },
]

/** Testimonios de la maqueta de empresas, TEXTUALES y en su orden. */
const TESTS: readonly TestimonioId[] = ["mariana", "andres", "daniela", "camila", "catalina", "valentina"]

// Respuestas de la maqueta; las condiciones de envío son las de los términos
// (despacho el siguiente día hábil, entrega de 7 a 9 días hábiles).
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Qué es el marketing olfativo?",
    a: "Es usar un aroma propio en tus espacios, tus empaques y tus prendas para que tus clientes reconozcan tu marca también por cómo huele.",
  },
  {
    q: "¿Cuánto cuesta un aroma exclusivo?",
    a: "Depende del aroma, la presentación y las cantidades. Te enviamos una cotización por escrito después de conocer tu proyecto.",
  },
  {
    q: "¿Cuánto rinde un frasco?",
    a: "Cada spray trae 250 ml. En espacios se usan de 3 a 5 puf para habitaciones de hasta 20 m², y el aroma se siente hasta 8 horas en espacios cerrados.",
  },
  {
    q: "¿Se puede aplicar sobre la ropa y los muebles?",
    a: "Sí. La fórmula es sin aceites grasos ni colorantes, así que puedes aplicarla sobre telas y muebles claros.",
  },
  {
    q: "¿Envían a toda Colombia?",
    a: "Sí. Despachamos desde Medellín el siguiente día hábil del pedido y el envío tarda de 7 a 9 días hábiles.",
  },
  ...(OFRECER_DISTRIBUIDORES
    ? [{
        q: "¿Puedo vender Cliché en mi tienda?",
        a: "Sí. Elige «Quiero ser distribuidor» en el formulario o escríbenos por WhatsApp y te contamos las condiciones.",
      }]
    : []),
]

const cop = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)}`

export default async function EmpresasPage() {
  const { aromas, whatsappNumber } = await loadData()
  const bySlug = new Map(aromas.map((a) => [baseSlug(a.slug), a]))
  const totalAromas = aromas.length
  const kitDesde = Math.min(...PRICE_TIERS.filter((t) => t.units > 1).map((t) => t.price))
  const temporada = Date.now() <= Date.parse(TEMPORADA_REGALOS_HASTA)

  // "+40" ya está publicado en el inicio (components/editorial/social-proof-bar).
  const facts = [
    { b: "+40", s: "marcas colombianas con aroma Cliché" },
    ...(totalAromas > 0 ? [{ b: String(totalAromas), s: "aromas en colección" }] : []),
    { b: "8 h", s: "de aroma por aplicación en espacios cerrados" },
    { b: "250 ml", s: "por frasco, de alta concentración" },
  ]

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }

  return (
    <div className="mq-emp">
      <EmpresasTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="wrap">
        <header className="brand">
          <Link href="/" aria-label="Cliché, ir a la tienda">
            <Image src="/images/logo-cliche.png" alt="Cliché" width={88} height={74} priority />
          </Link>
          <nav aria-label="Atajos">
            <CotizarLink className="pill">Cotizar</CotizarLink>
            <WaLink className="pill">WhatsApp <WaNumberText /></WaLink>
          </nav>
        </header>

        <section className="hero" aria-labelledby="t-hero">
          <div className="info">
            <span className="eyebrow">Marketing olfativo para empresas · Medellín, Colombia</span>
            <h1 id="t-hero">Tu marca también se reconoce por su aroma</h1>
            <p className="sub" style={{ fontSize: 18 }}>
              Llevamos un aroma propio a tu tienda, tu hotel, tu spa o tu oficina, y a tus prendas y tus pedidos.
              Fórmulas artesanales hechas en Medellín para más de 40 marcas colombianas.
            </p>
            <div className="ctas" id="hero-ctas">
              <WaLink className="btn btn-wa">Cotizar por WhatsApp</WaLink>
              <CotizarLink className="btn btn-primary">Pedir cotización</CotizarLink>
            </div>
            <p className="note">Te respondemos por WhatsApp en horario hábil.</p>
            <div className="facts">
              {facts.map((f) => (
                <div key={f.s} className="fact"><b>{f.b}</b><span>{f.s}</span></div>
              ))}
            </div>
          </div>
          <Image
            className="hero-img"
            src="/images/category-hoteles.png"
            alt="Spray de aroma Cliché en la recepción de un hotel"
            width={1023}
            height={1537}
            priority
            sizes="(min-width: 900px) 520px, 100vw"
          />
        </section>

        <MqBrands label="Marcas que ya usan aromas Cliché" />

        <section className="block" aria-labelledby="t-quien">
          <span className="eyebrow">Para quién</span>
          <h2 id="t-quien">Un aroma para cada tipo de negocio</h2>
          <div className="segs">
            {SEGMENTOS.map((s) => {
              const chips = s.slugs.map((sl) => bySlug.get(sl)).filter((a): a is Aroma => !!a)
              return (
                <article key={s.title} className="seg">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {chips.length > 0 && (
                    <div className="aromas">
                      {chips.map((a) => (
                        <span key={a.slug} className="aroma">
                          {a.image_url && <Image src={a.image_url} alt="" width={52} height={52} sizes="26px" />}
                          {shortName(a.name)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section className="block" aria-labelledby="t-como">
          <span className="eyebrow">Cómo trabajamos</span>
          <h2 id="t-como">Tres formas de tener tu aroma</h2>
          <div className="services">
            <article className="svc">
              <Image src="/images/category-ropa.png" alt="Spray Eternamente Índigo en una tienda de ropa" width={1024} height={1536} sizes="(min-width: 900px) 360px, 100vw" />
              <div className="txt">
                <h3>Un aroma de nuestra colección</h3>
                <p>
                  Eliges entre {totalAromas > 0 ? `${totalAromas} aromas` : "nuestros aromas"} en spray de 250 ml y
                  empiezas hoy mismo, en tu tienda o en tus prendas.
                </p>
                <span className="meta">Kits desde {cop(kitDesde)} · aromas a {cop(UNIT_PRICE)}</span>
                <a className="go" href="/arma-tu-kit" target="_blank" rel="noopener">Ver los kits</a>
              </div>
            </article>
            <article className="svc">
              <Image src="/images/category-hoteles.png" alt="Recepción de hotel con aroma Cliché" width={1023} height={1537} sizes="(min-width: 900px) 360px, 100vw" />
              <div className="txt">
                <h3>Un aroma exclusivo para tu marca</h3>
                <p>Diseñamos contigo la identidad olfativa de tu marca y la llevamos a tus espacios, tus empaques y tus prendas.</p>
                <span className="meta">Precio, cantidades y tiempos según tu proyecto</span>
                <CotizarLink need="exclusivo" className="go">Cotizar mi aroma</CotizarLink>
              </div>
            </article>
            <article className="svc">
              <Image src="/images/segments/hogar.jpg" alt="Aroma Cliché sobre un escritorio" width={1024} height={1536} sizes="(min-width: 900px) 360px, 100vw" />
              <div className="txt">
                <h3>Regalos corporativos</h3>
                <p>Kits de aromas para tus clientes y tu equipo en la temporada de fin de año.</p>
                <span className="meta">Cotización por volumen</span>
                <CotizarLink need="regalos" className="go">Cotizar regalos</CotizarLink>
              </div>
            </article>
          </div>
          <h3 style={{ marginTop: 10 }}>Así funciona un aroma exclusivo</h3>
          <ol className="steps">
            {PASOS.map((p) => (
              <li key={p.t}><b>{p.t}</b><span>{p.d}</span></li>
            ))}
          </ol>
        </section>

        <section className="block" aria-labelledby="t-tests">
          <span className="eyebrow">Negocios que ya tienen su aroma</span>
          <h2 id="t-tests">Lo que cuentan nuestros clientes</h2>
          <MqTests ids={TESTS} />
        </section>

        {temporada && (
          <section className="block" aria-labelledby="t-fin">
            <div className="season">
              <Image src="/images/landing/kit-aromas-cliche.jpg" alt="Cuatro aromas Cliché listos para regalar" width={1200} height={1500} sizes="(min-width: 900px) 560px, 100vw" />
              <div className="txt">
                <span className="eyebrow">Regalos de fin de año</span>
                <h2 id="t-fin">Regala un aroma a tus clientes y a tu equipo</h2>
                <p>
                  Para entregar antes de la prima del 18 de diciembre, cotiza en noviembre: el envío tarda de 7 a 9 días
                  hábiles más el tiempo de preparación.
                </p>
                <CotizarLink need="regalos" className="btn btn-light">Cotizar regalos de fin de año</CotizarLink>
              </div>
            </div>
          </section>
        )}

        <section className="block" id="cotizar" aria-labelledby="t-form">
          <div className="formwrap">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="eyebrow">Cotización</span>
              <h2 id="t-form">Cuéntanos qué necesitas</h2>
              <p className="sub">
                Con estos datos te respondemos con una propuesta concreta. Si prefieres, escríbenos directo por WhatsApp.
              </p>
              <WaLink className="btn btn-wa" style={{ alignSelf: "flex-start" }}>Escribir por WhatsApp</WaLink>
              {OFRECER_DISTRIBUIDORES && (
                <p className="note">¿Quieres vender Cliché en tu tienda? Elige «Quiero ser distribuidor» en el formulario.</p>
              )}
            </div>
            <div className="formcard">
              <LeadForm />
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="t-faq">
          <h2 id="t-faq">Preguntas frecuentes</h2>
          <div>
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <MqFooter whatsappNumber={whatsappNumber} />
      </div>

      <StickyBar />
    </div>
  )
}
