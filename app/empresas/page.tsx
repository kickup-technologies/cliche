import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight, MessageCircle } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase"
import { PRICE_TIERS, UNIT_PRICE } from "@/lib/pricing"
import { SEO_PAGES, withSeoOverride } from "@/lib/seo"
import { OFRECER_DISTRIBUIDORES } from "@/lib/b2b-leads"
import { CotizarLink, EmpresasTracker, LeadForm, MobileBar, WaLink } from "./empresas-client"
import { BrandStrip, CountUp, MotionRoot, SegmentIndex, type SegmentItem } from "./empresas-motion"
import { empFontVars } from "./fonts"
import "./empresas.css"

/**
 * Landing B2B /empresas — destino de la pauta de Google Ads (desde 16-nov) y
 * Meta para marcas y negocios: marketing olfativo, aroma exclusivo, kits y
 * regalos corporativos, con formulario de cotización que guarda el ORIGEN del
 * contacto (b2b_leads) y lo muestra en el panel (sección "Empresas").
 *
 * Basada en la maqueta de la agencia, pero SOLO con contenido comprobable:
 * aromas y conteo salen de la BD, precios de lib/pricing, testimonios de las
 * reseñas aprobadas, y logos/cifras únicamente si ya están publicados en el
 * sitio. Lo pendiente de confirmar queda en las constantes de abajo.
 */

export const revalidate = 3600

// ── Contenido pendiente de confirmar con la clienta ──────────────────────────

/** "+40 marcas colombianas": está en la franja del inicio (SocialProofBar),
 *  pero marcado allí mismo como cifra POR CONFIRMAR. No se usa en una página
 *  de pauta hasta que la clienta la confirme. Activar → aparece en el héroe. */
const BRAND_COUNT_CONFIRMED: string | null = null // p. ej. "+40"

/** Logos de "Marcas que ya tienen su aroma propio": ya publicados en el inicio
 *  (components/editorial/brand-logos.tsx, logos oficiales de clichecolombia.com). */
const SHOW_BRAND_LOGOS = true

/** Bloque "Regalos de fin de año": se oculta solo después de esta fecha. */
const TEMPORADA_REGALOS_HASTA = "2026-12-20T23:59:59-05:00"

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
  id: string
  slug: string
  name: string
  image_url: string | null
}

interface Testimonio {
  name: string
  comment: string
  product: string | null
}

/** Nombre corto para chips: "Aroma Agua — Fragancia Fresca" → "Agua". */
const shortName = (name: string) => name.replace(/^Aroma\s+/i, "").split("—")[0].trim()

async function loadData(): Promise<{ aromas: Aroma[]; testimonios: Testimonio[] }> {
  if (!isSupabaseConfigured) return { aromas: [], testimonios: [] }
  try {
    const db = createServerClient()
    const [{ data: products }, { data: reviews }] = await Promise.all([
      db.from("products").select("id, slug, name, image_url").eq("is_active", true),
      db
        .from("reviews")
        .select("reviewer_name, rating, comment, product_id, created_at")
        .eq("is_approved", true)
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(20),
    ])
    const aromas = (products || []) as Aroma[]
    const byId = new Map(aromas.map((a) => [a.id, a]))
    // Solo reseñas REALES aprobadas con texto suficiente para leerse como testimonio.
    const testimonios = (reviews || [])
      .filter((r) => (r.comment || "").trim().length >= 30 && (r.reviewer_name || "").trim())
      .slice(0, 6)
      .map((r) => ({
        name: String(r.reviewer_name).trim(),
        comment: String(r.comment).trim(),
        product: byId.get(r.product_id) ? shortName(byId.get(r.product_id)!.name) : null,
      }))
    return { aromas, testimonios }
  } catch {
    return { aromas: [], testimonios: [] }
  }
}

// ── Contenido (de la maqueta) ────────────────────────────────────────────────

/** Aromas sugeridos por tipo de negocio (curaduría de la maqueta, coherente con
 *  lib/segments). Nombre, foto y enlace salen de la BD; un aroma inactivo no se muestra. */
const SEGMENTOS = [
  {
    title: "Tiendas y marcas de ropa",
    text: "El aroma recibe a tus clientas en la tienda y viaja en cada prenda y cada pedido que despachas.",
    slugs: ["aroma-brillos-seda", "aroma-vientos-de-lino", "aroma-eternamente-indigo"],
  },
  {
    title: "Hoteles, spas y Airbnb",
    text: "Lobby, habitaciones y cabinas con un aroma que tus huéspedes reconocen desde que entran.",
    slugs: ["aroma-tierra", "aroma-sello-de-dios", "aroma-agua"],
  },
  {
    title: "Oficinas y consultorios",
    text: "Recepción y salas de espera con un aroma fresco y limpio que acompaña a tus clientes y a tu equipo.",
    slugs: ["aroma-aire", "aroma-agua"],
  },
  {
    title: "Marcas premium y streetwear",
    text: "Un aroma amaderado y elegante que se vuelve parte de la firma de tu marca.",
    slugs: ["aroma-luxury", "aroma-eternamente-indigo"],
  },
]

/** Foto editorial de cada tipo de negocio (fotos de producto ya publicadas en el sitio). */
const SEGMENTO_FOTO: Record<string, { img: string; alt: string }> = {
  "Tiendas y marcas de ropa": { img: "/images/segments/femeninas.jpg", alt: "Spray de aroma Cliché en una tienda de ropa de tonos claros" },
  "Hoteles, spas y Airbnb": { img: "/images/segments/spa.jpg", alt: "Spray de aroma Cliché junto a toallas y velas en un spa" },
  "Oficinas y consultorios": { img: "/images/hero-main.jpg", alt: "Spray de aroma Cliché sobre una mesa de madera junto a la ventana" },
  "Marcas premium y streetwear": { img: "/images/segments/unisex.jpg", alt: "Spray de aroma Cliché junto a un perchero de prendas claras" },
}

const PASOS = [
  { t: "Nos cuentas tu marca", d: "Qué espacios tienes, qué quieres que sientan tus clientes y cuántas unidades imaginas." },
  { t: "Te proponemos aromas", d: "Partimos de la colección o de una fórmula a la medida de tu marca." },
  { t: "Definimos la cotización", d: "Aroma, presentación, cantidades y tiempos de entrega, por escrito." },
  { t: "Producimos y despachamos", d: "Producción artesanal en Colombia, con envío a todo el país." },
]

// Cada respuesta está respaldada por contenido ya publicado en el sitio
// (ficha de producto, FAQ del inicio, términos y condiciones).
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
    a: "Cada spray trae 250 ml. En espacios se usan de 3 a 5 puf para habitaciones de hasta 20 m², y el aroma dura hasta 8 horas por aplicación.",
  },
  {
    q: "¿Se puede aplicar sobre la ropa y los muebles?",
    a: "Sí. La fórmula no contiene aceites grasos ni colorantes: puedes aplicarla sobre prendas, telas, empaques y mobiliario claro sin dejar residuo.",
  },
  {
    q: "¿Envían a toda Colombia?",
    a: "Sí. Los pedidos salen el siguiente día hábil y la entrega tarda de 7 a 9 días hábiles a todo el país.",
  },
  ...(OFRECER_DISTRIBUIDORES
    ? [{
        q: "¿Puedo vender Cliché en mi tienda?",
        a: "Sí. Elige «Quiero ser distribuidor» en el formulario o escríbenos por WhatsApp y te contamos las condiciones.",
      }]
    : []),
]

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

// ── Estilos compartidos ──────────────────────────────────────────────────────
// Escala tipográfica pensada para Cormorant Garamond (ópticamente pequeña):
// display grande con interlineado apretado e itálica terracota de acento.

const wrap = "mx-auto w-full max-w-[1320px] px-5 md:px-10"
const kicker = "emp-eyebrow emp-kicker"
const h2 = "emp-display text-[clamp(38px,5.4vw,74px)] leading-[0.96] text-[var(--emp-ink)]"
const btnBase =
  "emp-btn group inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-full px-7 text-center text-[15.5px] font-semibold tracking-[0.01em]"
const btnWa = `${btnBase} bg-[#1F7A4D] text-white hover:bg-[#17633E]`
const btnPrimary = `${btnBase} bg-[var(--emp-ink)] text-[var(--emp-cream)] hover:bg-[var(--emp-ink-2)]`
const bodyText = "text-[16.5px] leading-[1.7] text-[var(--emp-ink-2)]"

/** Índice de escalonado para las animaciones (--i). */
const st = (i: number) => ({ "--i": i }) as CSSProperties

/** "25" → 25 · "8 h" → 8 + " h" · "+40" → "+" + 40 (para el contador). */
function splitFigure(b: string) {
  const m = b.match(/^(\+?)(\d+)(.*)$/)
  return m ? { prefix: m[1], value: Number(m[2]), suffix: m[3] } : null
}

/** Beneficios de la marquesina: solo datos ya publicados en esta página. */
const BENEFICIOS = [
  "Fórmulas artesanales hechas en Colombia",
  "Hasta 8 horas de aroma por aplicación",
  "250 ml de alta concentración",
  "Sin aceites grasos ni colorantes",
  "Envío a toda Colombia",
]

export default async function EmpresasPage() {
  const { aromas, testimonios } = await loadData()
  const bySlug = new Map(aromas.map((a) => [a.slug, a]))
  const totalAromas = aromas.length
  const kitDesde = Math.min(...PRICE_TIERS.filter((t) => t.units > 1).map((t) => t.price))
  const temporada = Date.now() <= Date.parse(TEMPORADA_REGALOS_HASTA)

  const facts = [
    ...(BRAND_COUNT_CONFIRMED ? [{ b: BRAND_COUNT_CONFIRMED, s: "marcas colombianas con aroma Cliché" }] : []),
    ...(totalAromas > 0 ? [{ b: String(totalAromas), s: "aromas en colección" }] : []),
    { b: "8 h", s: "de aroma por aplicación" },
    { b: "250 ml", s: "por frasco, de alta concentración" },
  ]

  const segmentos: SegmentItem[] = SEGMENTOS.map((s) => ({
    title: s.title,
    text: s.text,
    ...SEGMENTO_FOTO[s.title],
    aromas: (s.slugs.map((sl) => bySlug.get(sl)).filter(Boolean) as Aroma[]).map((a) => ({
      slug: a.slug,
      name: shortName(a.name),
      image_url: a.image_url,
    })),
  }))

  const formas = [
    {
      img: "/images/category-ropa.png",
      alt: "Spray Eternamente Índigo en una tienda de ropa",
      title: "Un aroma de nuestra colección",
      text: `Eliges entre ${totalAromas > 0 ? `${totalAromas} aromas` : "nuestros aromas"} en spray de 250 ml y empiezas hoy mismo, en tu tienda o en tus prendas.`,
      meta: `Kits desde ${cop(kitDesde)} · aromas a ${cop(UNIT_PRICE)}`,
      cta: (
        <Link href="/arma-tu-kit" className="emp-link self-start text-[15px]">
          Ver los kits <ArrowRight className="emp-arrow h-4 w-4" />
        </Link>
      ),
    },
    {
      img: "/images/segments/hoteles.jpg",
      alt: "Spray de aroma Cliché en una habitación de hotel junto a la cama",
      title: "Un aroma exclusivo para tu marca",
      text: "Diseñamos contigo la identidad olfativa de tu marca y la llevamos a tus espacios, tus empaques y tus prendas.",
      meta: "Precio, cantidades y tiempos según tu proyecto",
      cta: (
        <CotizarLink need="exclusivo" className="emp-link self-start text-[15px]">
          Cotizar mi aroma <ArrowRight className="emp-arrow h-4 w-4" />
        </CotizarLink>
      ),
    },
    {
      img: "/images/category-kits-marca.png",
      alt: "Caja de regalo con tres sprays de aroma",
      title: "Regalos corporativos",
      text: "Kits de aromas para tus clientes y tu equipo en la temporada de fin de año.",
      meta: "Cotización por volumen",
      cta: (
        <CotizarLink need="regalos" className="emp-link self-start text-[15px]">
          Cotizar regalos <ArrowRight className="emp-arrow h-4 w-4" />
        </CotizarLink>
      ),
    },
  ]

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }

  const [destacado, ...otros] = testimonios

  return (
    <>
      <EmpresasTracker />
      <Header />
      {/* pt = alto del Header fijo. pb extra en móvil para la barra fija. */}
      <main
        className={`${empFontVars} emp min-h-screen overflow-x-clip bg-[var(--emp-cream)] pb-24 pt-[65px] text-[var(--emp-ink)] md:pb-0 md:pt-[73px]`}
      >
        <MotionRoot />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        {/* ── Héroe: texto editorial + foto a sangre ─────────────── */}
        <section aria-labelledby="t-hero" className="relative">
          <div className="grid md:min-h-[min(880px,calc(100svh-73px))] md:grid-cols-12">
            <div className="emp-intro flex min-w-0 flex-col justify-center gap-6 px-5 pb-12 pt-10 md:col-span-7 md:gap-8 md:py-20 md:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] md:pr-12 lg:pr-20">
              <span className={kicker} style={st(0)}>Marketing olfativo para empresas · Medellín, Colombia</span>
              <h1 id="t-hero" className="emp-display text-[clamp(50px,6.6vw,100px)] leading-[0.92]" style={st(1)}>
                Tu marca también se reconoce <em>por su aroma</em>
              </h1>
              <p className="max-w-[52ch] text-[17px] leading-[1.7] text-[var(--emp-ink-2)] md:text-[18px]" style={st(2)}>
                Llevamos un aroma propio a tu tienda, tu hotel, tu spa o tu oficina, y a tus prendas y tus pedidos.
                Fórmulas artesanales hechas en Colombia
                {BRAND_COUNT_CONFIRMED ? ` para ${BRAND_COUNT_CONFIRMED.replace("+", "más de ")} marcas colombianas` : ""}.
              </p>
              <div className="flex flex-col gap-3.5" style={st(3)}>
                <div id="hero-ctas" className="flex flex-wrap gap-3">
                  <WaLink className={`${btnWa} flex-[1_1_220px] sm:flex-none`}>
                    <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Cotizar por WhatsApp
                  </WaLink>
                  <CotizarLink className={`${btnPrimary} flex-[1_1_220px] sm:flex-none`}>
                    Pedir cotización <ArrowRight className="emp-arrow h-4 w-4" aria-hidden />
                  </CotizarLink>
                </div>
                <p className="text-[13px] text-[var(--emp-mute)]">Te respondemos por WhatsApp en horario hábil.</p>
              </div>
              <ul
                className={`mt-2 grid border-t border-[var(--emp-line)] pt-6 ${facts.length >= 4 ? "grid-cols-2 gap-y-6 sm:grid-cols-4" : "grid-cols-3"}`}
                style={st(4)}
              >
                {facts.map((f, i) => {
                  const fig = splitFigure(f.b)
                  return (
                    <li
                      key={f.s}
                      className={`flex min-w-0 flex-col gap-1.5 pr-3 ${i > 0 ? "border-l border-[var(--emp-line)] pl-4 md:pl-6" : ""}`}
                    >
                      <b className="emp-num text-[clamp(26px,2.6vw,38px)] font-medium leading-none tracking-[-0.03em] text-[var(--emp-ink)]">
                        {fig ? <CountUp value={fig.value} prefix={fig.prefix} suffix={fig.suffix} /> : f.b}
                      </b>
                      <span className="text-[12.5px] leading-snug text-[var(--emp-mute)]">{f.s}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--emp-sand)] md:col-span-5 md:aspect-auto md:min-h-[620px]">
              <div data-parallax="0.04" className="absolute inset-x-0 -inset-y-[5%]">
                <Image
                  src="/images/category-hoteles.png"
                  alt="Spray de aroma Cliché en la recepción de un hotel"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 42vw"
                  className="emp-hero-img object-cover"
                />
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#2D1A14]/45 to-transparent" />
              <span aria-hidden className="emp-eyebrow absolute bottom-5 left-5 text-[#FAF8F5]/90 md:bottom-8 md:left-8">
                Cliché · Marketing olfativo
              </span>
            </div>
          </div>
        </section>

        {SHOW_BRAND_LOGOS && <BrandStrip label="Marcas que ya tienen su aroma propio" />}

        {/* ── Para quién: índice editorial con imagen fija ───────── */}
        <section aria-labelledby="t-quien" className={`${wrap} py-20 md:py-32`}>
          <div data-reveal className="mb-10 flex flex-col gap-5 md:mb-16">
            <span className={kicker}>Para quién</span>
            <h2 id="t-quien" className={`${h2} max-w-[14ch]`}>
              Un aroma para cada <em>tipo de negocio</em>
            </h2>
          </div>
          <SegmentIndex items={segmentos} />
        </section>

        {/* ── Marquesina de beneficios (los mismos datos de la página) ── */}
        <div aria-hidden className="bg-[var(--emp-ink)] py-7 text-[var(--emp-cream)] md:py-10">
          <div className="emp-marquee" style={{ ["--emp-dur" as string]: "70s" }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="emp-marquee-track">
                {BENEFICIOS.map((b) => (
                  <span key={b} className="flex items-center gap-10 pr-10 font-serif text-[clamp(26px,3.4vw,46px)] italic leading-none md:gap-14 md:pr-14">
                    {b}
                    <span className="h-1.5 w-1.5 rotate-45 bg-[var(--emp-terra)]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Cómo trabajamos: filas alternas con foto en parallax ── */}
        <section aria-labelledby="t-como">
          <div className={`${wrap} py-20 md:py-32`}>
            <div data-reveal className="mb-14 flex flex-col gap-5 md:mb-24">
              <span className={kicker}>Cómo trabajamos</span>
              <h2 id="t-como" className={`${h2} max-w-[16ch]`}>
                Tres formas de <em>tener tu aroma</em>
              </h2>
            </div>
            <div className="flex flex-col gap-20 md:gap-32">
              {formas.map((f, i) => {
                const flip = i % 2 === 1
                return (
                  <article key={f.title} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
                    <div
                      data-reveal="mask"
                      className={`emp-frame relative aspect-[4/5] w-full overflow-hidden md:row-start-1 md:col-span-6 ${flip ? "md:col-start-7" : "md:col-start-1"}`}
                    >
                      <div data-parallax="0.06" className="absolute inset-x-0 -inset-y-[8%]">
                        <Image src={f.img} alt={f.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                      </div>
                    </div>
                    <div
                      data-reveal
                      style={st(1)}
                      className={`flex flex-col gap-5 md:row-start-1 md:col-span-5 ${flip ? "md:col-start-1" : "md:col-start-8"}`}
                    >
                      <span aria-hidden className="font-serif text-[64px] italic leading-[0.8] text-[var(--emp-terra)] md:text-[88px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="emp-display text-[clamp(34px,3.8vw,52px)] leading-[0.98]">{f.title}</h3>
                      <p className={`${bodyText} max-w-[44ch]`}>{f.text}</p>
                      <span className="emp-num border-t border-[var(--emp-line)] pt-4 text-[14px] text-[var(--emp-terra-d)]">{f.meta}</span>
                      {f.cta}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="bg-[var(--emp-sand)]">
            <div className={`${wrap} py-20 md:py-28`}>
              <h3 data-reveal className="emp-display mb-12 max-w-[18ch] text-[clamp(32px,3.8vw,52px)] leading-[0.98] md:mb-16">
                Así funciona un aroma <em>exclusivo</em>
              </h3>
              <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
                {PASOS.map((p, i) => (
                  <li key={p.t} className="relative flex flex-col gap-3 pt-7">
                    <span aria-hidden data-reveal="line" style={st(i)} className="absolute inset-x-0 top-0 h-px bg-[var(--emp-ink)]/25" />
                    <div data-reveal style={st(i)} className="flex flex-col gap-3">
                      <span aria-hidden className="font-serif text-[56px] italic leading-[0.85] text-[var(--emp-terra)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <b className="font-serif text-[27px] font-medium leading-[1.1]">{p.t}</b>
                      <span className="text-[15.5px] leading-relaxed text-[var(--emp-ink-2)]">{p.d}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Testimonios: SOLO reseñas reales aprobadas (tabla reviews) ── */}
        {destacado && (
          <section aria-labelledby="t-tests" className={`${wrap} py-20 md:py-32`}>
            <div className="grid gap-10 md:grid-cols-12 md:gap-12">
              <div data-reveal className="flex flex-col gap-5 md:col-span-4">
                <span className={kicker}>Reseñas de clientes</span>
                <h2 id="t-tests" className="emp-display text-[clamp(34px,3.8vw,52px)] leading-[0.98]">
                  Lo que cuentan <em>nuestros clientes</em>
                </h2>
              </div>
              <div className="md:col-span-8">
                <figure data-reveal style={st(1)} className="relative">
                  <blockquote className="relative font-serif text-[clamp(28px,3.4vw,46px)] font-medium leading-[1.12] tracking-[-0.01em]">
                    “{destacado.comment}”
                  </blockquote>
                  <figcaption className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                    <span aria-hidden className="h-px w-8 bg-[var(--emp-terra)]" />
                    <span className="font-semibold">{destacado.name}</span>
                    {destacado.product && <span className="text-[var(--emp-terra-d)]">· {destacado.product}</span>}
                  </figcaption>
                </figure>
                {otros.length > 0 && (
                  <div className="mt-14 grid gap-x-10 sm:grid-cols-2">
                    {otros.map((t, i) => (
                      <figure key={i} data-reveal style={st(i)} className="flex flex-col gap-4 border-t border-[var(--emp-line)] py-8">
                        <blockquote className="font-serif text-[23px] leading-[1.25]">“{t.comment}”</blockquote>
                        <figcaption className="flex flex-wrap gap-x-2 text-[13.5px]">
                          <span className="font-semibold">{t.name}</span>
                          {t.product && <span className="text-[var(--emp-terra-d)]">· {t.product}</span>}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Regalos de fin de año (se oculta solo tras la temporada) ── */}
        {temporada && (
          <section aria-labelledby="t-fin" className="emp-on-dark relative isolate overflow-hidden bg-[var(--emp-ink)] text-[var(--emp-cream)]">
            <div aria-hidden className="absolute inset-0 -z-10">
              <div data-parallax="0.08" className="absolute inset-x-0 -inset-y-[12%]">
                <Image src="/images/intro/intro-silk-clean.png" alt="" fill sizes="100vw" className="object-cover object-[70%_center]" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#2D1A14]/80 via-[#2D1A14]/70 to-[#2D1A14]/90 md:bg-gradient-to-r md:from-[#2D1A14] md:via-[#2D1A14]/80 md:to-[#2D1A14]/10" />
            </div>
            <div className={`${wrap} py-24 md:py-36`}>
              <div data-reveal className="flex max-w-[640px] flex-col gap-6">
                <span className={kicker}>Regalos de fin de año</span>
                <h2 id="t-fin" className="emp-display text-[clamp(40px,5.6vw,80px)] leading-[0.95] text-white">
                  Regala un aroma <em>a tus clientes y a tu equipo</em>
                </h2>
                <p className="max-w-[48ch] text-[17px] leading-[1.7] text-[#EFE4DC]">
                  Para entregar antes de Navidad, cotiza en noviembre: la entrega tarda de 7 a 9 días hábiles más el tiempo de preparación.
                </p>
                <CotizarLink need="regalos" className={`${btnBase} mt-2 self-start bg-[var(--emp-cream)] text-[var(--emp-ink)] hover:bg-white`}>
                  Cotizar regalos de fin de año <ArrowRight className="emp-arrow h-4 w-4" aria-hidden />
                </CotizarLink>
              </div>
            </div>
          </section>
        )}

        {/* ── Formulario ────────────────────────────────────────── */}
        <section id="cotizar" aria-labelledby="t-form" className={`${wrap} scroll-mt-28 py-20 md:py-32`}>
          <div className="grid items-start gap-10 md:grid-cols-12 md:gap-12">
            <div data-reveal className="flex flex-col gap-6 md:sticky md:top-28 md:col-span-5">
              <span className={kicker}>Cotización</span>
              <h2 id="t-form" className={h2}>
                Cuéntanos <em>qué necesitas</em>
              </h2>
              <p className={`${bodyText} max-w-[42ch]`}>
                Con estos datos te respondemos con una propuesta concreta. Si prefieres, escríbenos directo por WhatsApp.
              </p>
              <WaLink className={`${btnWa} self-start`}>
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Escribir por WhatsApp
              </WaLink>
              {OFRECER_DISTRIBUIDORES && (
                <p className="text-[13.5px] text-[var(--emp-mute)]">
                  ¿Quieres vender Cliché en tu tienda? Elige «Quiero ser distribuidor» en el formulario.
                </p>
              )}
            </div>
            <div data-reveal style={st(1)} className="md:col-span-7">
              <div className="relative rounded-[22px] border border-[var(--emp-line)] bg-white p-5 shadow-[var(--emp-shadow)] sm:p-8 md:p-10">
                <LeadForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Preguntas frecuentes ──────────────────────────────── */}
        <section aria-labelledby="t-faq" className={`${wrap} border-t border-[var(--emp-line)] py-20 md:py-32`}>
          <div className="grid gap-10 md:grid-cols-12 md:gap-12">
            <div data-reveal className="md:col-span-4">
              <h2 id="t-faq" className="emp-display text-[clamp(38px,4.4vw,60px)] leading-[0.96] md:sticky md:top-28">
                Preguntas <em>frecuentes</em>
              </h2>
            </div>
            <div className="emp-faq border-t border-[var(--emp-line)] md:col-span-8">
              {FAQS.map((f, i) => (
                <details key={f.q} data-reveal style={st(i)} className="border-b border-[var(--emp-line)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-serif text-[clamp(22px,2.2vw,28px)] font-medium leading-[1.2] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="emp-faq-icon" />
                  </summary>
                  <p className="emp-faq-a max-w-[60ch] pb-7 pr-10 text-[16px] leading-[1.7] text-[var(--emp-ink-2)]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {/* En móvil la barra fija trae WhatsApp; el flotante se reserva para escritorio. */}
      <div className="hidden md:block">
        <WhatsAppButton />
      </div>
      <div className={`${empFontVars} [font-family:var(--font-emp-sans),system-ui,sans-serif]`}>
        <MobileBar />
      </div>
    </>
  )
}
