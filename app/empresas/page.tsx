import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { BrandLogos } from "@/components/editorial/brand-logos"
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase"
import { PRICE_TIERS, UNIT_PRICE } from "@/lib/pricing"
import { SEO_PAGES, withSeoOverride } from "@/lib/seo"
import { OFRECER_DISTRIBUIDORES } from "@/lib/b2b-leads"
import { CotizarLink, EmpresasTracker, LeadForm, MobileBar, WaLink } from "./empresas-client"

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

const eyebrow = "text-xs uppercase tracking-[0.14em] text-[#8F5E51]"
const h2 = "font-serif text-[clamp(26px,4.2vw,36px)] font-semibold leading-[1.14] text-balance text-[#2D1A14]"
const card = "rounded-2xl border border-[#2D1A14]/10 bg-white"
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-[22px] py-[15px] text-center text-[16.5px] font-semibold transition-colors"
const btnWa = `${btnBase} bg-[#1F7A4D] text-white hover:bg-[#17633E]`
const btnPrimary = `${btnBase} bg-[#2D1A14] text-[#FAF8F5] hover:bg-[#4A2F25]`

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }

  return (
    <>
      <EmpresasTracker />
      <Header />
      {/* pt-28: el Header es fixed. pb extra en móvil para la barra fija. */}
      <main className="min-h-screen bg-[#FAF8F5] pb-24 pt-24 text-[#2D1A14] md:pb-0 md:pt-28">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        {/* ── Héroe ─────────────────────────────────────────────── */}
        <section aria-labelledby="t-hero" className="mx-auto grid max-w-6xl gap-6 px-4 pb-8 pt-4 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-12 md:pt-8">
          <div className="flex min-w-0 flex-col gap-4">
            <span className={eyebrow}>Marketing olfativo para empresas · Medellín, Colombia</span>
            <h1 id="t-hero" className="font-serif text-[clamp(34px,6vw,54px)] font-semibold leading-[1.1] text-balance">
              Tu marca también se reconoce por su aroma
            </h1>
            <p className="max-w-[62ch] text-lg leading-relaxed text-[#4A2F25]">
              Llevamos un aroma propio a tu tienda, tu hotel, tu spa o tu oficina, y a tus prendas y tus pedidos.
              Fórmulas artesanales hechas en Colombia
              {BRAND_COUNT_CONFIRMED ? ` para ${BRAND_COUNT_CONFIRMED.replace("+", "más de ")} marcas colombianas` : ""}.
            </p>
            <div id="hero-ctas" className="flex flex-wrap gap-2.5">
              <WaLink className={`${btnWa} flex-[1_1_200px]`}>Cotizar por WhatsApp</WaLink>
              <CotizarLink className={`${btnPrimary} flex-[1_1_200px]`}>Pedir cotización</CotizarLink>
            </div>
            <p className="text-[13.5px] text-[#7A6A63]">Te respondemos por WhatsApp en horario hábil.</p>
            <div className={`grid grid-cols-2 gap-2.5 ${facts.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {facts.map((f) => (
                <div key={f.s} className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-[#2D1A14]/10 bg-white px-3 py-2.5">
                  <b className="font-serif text-2xl leading-tight">{f.b}</b>
                  <span className="text-[12.5px] leading-snug text-[#7A6A63]">{f.s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px]">
            <Image
              src="/images/category-hoteles.png"
              alt="Spray de aroma Cliché en la recepción de un hotel"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </section>

        {SHOW_BRAND_LOGOS && <BrandLogos />}

        {/* ── Para quién ────────────────────────────────────────── */}
        <section aria-labelledby="t-quien" className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-11">
          <span className={eyebrow}>Para quién</span>
          <h2 id="t-quien" className={h2}>Un aroma para cada tipo de negocio</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENTOS.map((s) => {
              const lista = s.slugs.map((sl) => bySlug.get(sl)).filter(Boolean) as Aroma[]
              return (
                <article key={s.title} className={`${card} flex flex-col gap-2.5 p-[18px]`}>
                  <h3 className="font-serif text-[19px] font-semibold">{s.title}</h3>
                  <p className="text-[15px] leading-relaxed text-[#4A2F25]">{s.text}</p>
                  {lista.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      {lista.map((a) => (
                        <Link
                          key={a.slug}
                          href={`/productos/${a.slug}`}
                          className="flex items-center gap-1.5 rounded-full bg-[#F3EAE1] py-[3px] pl-[3px] pr-2.5 text-[13px] transition-colors hover:bg-[#EADBCF]"
                        >
                          {a.image_url && (
                            <Image src={a.image_url} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />
                          )}
                          {shortName(a.name)}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        {/* ── Cómo trabajamos ───────────────────────────────────── */}
        <section aria-labelledby="t-como" className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-[#2D1A14]/10 px-4 py-11">
          <span className={eyebrow}>Cómo trabajamos</span>
          <h2 id="t-como" className={h2}>Tres formas de tener tu aroma</h2>
          <div className="grid gap-3.5 md:grid-cols-3">
            <article className={`${card} flex flex-col overflow-hidden`}>
              <div className="relative aspect-[16/10]">
                <Image src="/images/category-ropa.png" alt="Spray Eternamente Índigo en una tienda de ropa" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                <h3 className="font-serif text-[19px] font-semibold">Un aroma de nuestra colección</h3>
                <p className="text-[15px] leading-relaxed text-[#4A2F25]">
                  Eliges entre {totalAromas > 0 ? `${totalAromas} aromas` : "nuestros aromas"} en spray de 250 ml y empiezas hoy mismo, en tu tienda o en tus prendas.
                </p>
                <span className="text-[13.5px] text-[#8F5E51]">
                  Kits desde {cop(kitDesde)} · aromas a {cop(UNIT_PRICE)}
                </span>
                <Link href="/arma-tu-kit" className="mt-auto inline-flex items-center gap-1 pt-1.5 text-[15px] font-semibold">
                  Ver los kits <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
            <article className={`${card} flex flex-col overflow-hidden`}>
              <div className="relative aspect-[16/10]">
                <Image src="/images/category-hoteles.png" alt="Recepción de hotel con aroma Cliché" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                <h3 className="font-serif text-[19px] font-semibold">Un aroma exclusivo para tu marca</h3>
                <p className="text-[15px] leading-relaxed text-[#4A2F25]">
                  Diseñamos contigo la identidad olfativa de tu marca y la llevamos a tus espacios, tus empaques y tus prendas.
                </p>
                <span className="text-[13.5px] text-[#8F5E51]">Precio, cantidades y tiempos según tu proyecto</span>
                <CotizarLink need="exclusivo" className="mt-auto inline-flex items-center gap-1 pt-1.5 text-[15px] font-semibold">
                  Cotizar mi aroma <ArrowRight className="h-4 w-4" />
                </CotizarLink>
              </div>
            </article>
            <article className={`${card} flex flex-col overflow-hidden`}>
              <div className="relative aspect-[16/10]">
                <Image src="/images/category-kits-marca.png" alt="Caja de regalo con tres sprays de aroma" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                <h3 className="font-serif text-[19px] font-semibold">Regalos corporativos</h3>
                <p className="text-[15px] leading-relaxed text-[#4A2F25]">
                  Kits de aromas para tus clientes y tu equipo en la temporada de fin de año.
                </p>
                <span className="text-[13.5px] text-[#8F5E51]">Cotización por volumen</span>
                <CotizarLink need="regalos" className="mt-auto inline-flex items-center gap-1 pt-1.5 text-[15px] font-semibold">
                  Cotizar regalos <ArrowRight className="h-4 w-4" />
                </CotizarLink>
              </div>
            </article>
          </div>

          <h3 className="mt-2.5 font-serif text-[19px] font-semibold">Así funciona un aroma exclusivo</h3>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((p, i) => (
              <li key={p.t} className="flex flex-col gap-1.5 rounded-[14px] border border-[#2D1A14]/10 bg-white p-4">
                <span aria-hidden className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#2D1A14] text-sm font-semibold text-[#FAF8F5]">
                  {i + 1}
                </span>
                <b className="font-serif text-lg font-semibold">{p.t}</b>
                <span className="text-[15px] leading-relaxed text-[#4A2F25]">{p.d}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Testimonios: SOLO reseñas reales aprobadas (tabla reviews) ── */}
        {testimonios.length > 0 && (
          <section aria-labelledby="t-tests" className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-[#2D1A14]/10 px-4 py-11">
            <span className={eyebrow}>Reseñas de clientes</span>
            <h2 id="t-tests" className={h2}>Lo que cuentan nuestros clientes</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {testimonios.map((t, i) => (
                <figure key={i} className="flex flex-col gap-2.5 rounded-[14px] border border-[#2D1A14]/10 bg-white p-[18px]">
                  <blockquote className="font-serif text-lg leading-snug">“{t.comment}”</blockquote>
                  <figcaption className="text-[13.5px] text-[#7A6A63]">{t.name}</figcaption>
                  {t.product && <span className="text-[12.5px] text-[#8F5E51]">{t.product}</span>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ── Regalos de fin de año (se oculta solo tras la temporada) ── */}
        {temporada && (
          <section aria-labelledby="t-fin" className="mx-auto max-w-6xl border-t border-[#2D1A14]/10 px-4 py-11">
            <div className="grid overflow-hidden rounded-[18px] bg-[#2D1A14] text-[#FAF8F5] md:grid-cols-2">
              <div className="relative min-h-[260px]">
                <Image src="/images/category-kits-marca.png" alt="Caja de regalo con sprays de aroma" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="flex flex-col justify-center gap-3.5 px-6 py-7">
                <span className="text-xs uppercase tracking-[0.14em] text-[#E8C9B8]">Regalos de fin de año</span>
                <h2 id="t-fin" className="font-serif text-[clamp(26px,4.2vw,36px)] font-semibold leading-[1.14] text-balance text-white">
                  Regala un aroma a tus clientes y a tu equipo
                </h2>
                <p className="text-[#EFE4DC]">
                  Para entregar antes de Navidad, cotiza en noviembre: la entrega tarda de 7 a 9 días hábiles más el tiempo de preparación.
                </p>
                <CotizarLink need="regalos" className={`${btnBase} self-start bg-[#FAF8F5] text-[#2D1A14] hover:bg-white`}>
                  Cotizar regalos de fin de año
                </CotizarLink>
              </div>
            </div>
          </section>
        )}

        {/* ── Formulario ────────────────────────────────────────── */}
        <section id="cotizar" aria-labelledby="t-form" className="mx-auto max-w-6xl scroll-mt-28 border-t border-[#2D1A14]/10 px-4 py-11">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className={eyebrow}>Cotización</span>
              <h2 id="t-form" className={h2}>Cuéntanos qué necesitas</h2>
              <p className="max-w-[62ch] text-[#4A2F25]">
                Con estos datos te respondemos con una propuesta concreta. Si prefieres, escríbenos directo por WhatsApp.
              </p>
              <WaLink className={`${btnWa} self-start`}>Escribir por WhatsApp</WaLink>
              {OFRECER_DISTRIBUIDORES && (
                <p className="text-[13.5px] text-[#7A6A63]">
                  ¿Quieres vender Cliché en tu tienda? Elige «Quiero ser distribuidor» en el formulario.
                </p>
              )}
            </div>
            <div className={`${card} relative rounded-[18px] p-5`}>
              <LeadForm />
            </div>
          </div>
        </section>

        {/* ── Preguntas frecuentes ──────────────────────────────── */}
        <section aria-labelledby="t-faq" className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-[#2D1A14]/10 px-4 py-11">
          <h2 id="t-faq" className={h2}>Preguntas frecuentes</h2>
          <div className="flex flex-col gap-2.5">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-[#2D1A14]/10 bg-white px-[18px]">
                <summary className="flex cursor-pointer list-none justify-between gap-3 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-[22px] leading-none text-[#A67163] group-open:hidden">+</span>
                  <span aria-hidden className="hidden text-[22px] leading-none text-[#A67163] group-open:inline">–</span>
                </summary>
                <p className="pb-4 text-[15.5px] leading-relaxed text-[#4A2F25]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      {/* En móvil la barra fija trae WhatsApp; el flotante se reserva para escritorio. */}
      <div className="hidden md:block">
        <WhatsAppButton />
      </div>
      <MobileBar />
    </>
  )
}
