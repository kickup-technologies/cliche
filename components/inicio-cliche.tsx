import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Gift, RotateCcw, ShieldCheck, Shirt, Zap } from "lucide-react"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA } from "@/lib/entrega"
import { FAMILIES } from "@/lib/families"
import { PRICE_TIERS, tierSavings } from "@/lib/pricing"

/**
 * Portada del inicio (7-nov-2026, como la de Bienestar by Cliché): foto real
 * de los frascos y el mensaje en texto HTML, en lugar de los banners del panel
 * con fotos generadas. En celular va la foto primero y debajo el título y los
 * botones; en escritorio, mitad y mitad.
 */
export function PortadaCliche() {
  return (
    <section className="portada-cl" aria-labelledby="portada-titulo">
      <div className="portada-cl-foto">
        <Image src="/images/landing/kit-aromas-cliche.jpg" alt="Cuatro aromas Cliché en spray de 250 ml: Eternamente Índigo, Brillos de Seda, Calor de Lana y Sello de Dios" fill priority sizes="(max-width:820px) 100vw, 50vw" />
      </div>
      <div className="portada-cl-texto">
        <span className="portada-cl-eyebrow">Aromas para espacios, prendas y marcas · Hechos en Colombia</span>
        <h1 id="portada-titulo">El aroma que hace que tu espacio y tu marca se recuerden</h1>
        <p>25 aromas en spray de 250 ml para la casa, la ropa y tu tienda. Elige el tuyo y recíbelo en {ENTREGA_EN_LINEA} en toda Colombia.</p>
        <div className="portada-cl-botones">
          <Link className="portada-cl-btn is-primario" href="/catalogo">Ver la tienda</Link>
          <Link className="portada-cl-btn" href="/arma-tu-kit">Arma tu kit</Link>
        </div>
        <small className="portada-cl-nota">Desde $78.000 · Envío gratis desde $300.000{SOUVENIR_EN_LINEA ? " · Souvenir de regalo al pagar en línea" : ""}</small>
      </div>
    </section>
  )
}

const PARA_QUE = [
  { titulo: "Para tu casa", texto: "La sala, el baño, el estudio o el cuarto: que todo huela a cuidado.", foto: "/images/segments/hogar.jpg", href: "/catalogo?categoria=hogar" },
  { titulo: "Para tu ropa", texto: "Prendas, sábanas y clósets con un aroma que se queda.", foto: "/images/category-ropa.png", href: "/catalogo?categoria=ropa" },
  { titulo: "Para tu tienda o marca", texto: "Un aroma propio para tu local, tus empaques y tus clientes.", foto: "/images/segments/femeninas.jpg", href: "/empresas" },
  { titulo: "Para regalar", texto: "Arma tu kit x3, x4 o x6 con los aromas que quieras.", foto: "/images/segments/accesorios.jpg", href: "/arma-tu-kit" },
]

/** "¿Para qué lo buscas?": cuatro mosaicos grandes, como "Elige por momento" de Bienestar. */
export function ParaQueCliche() {
  return (
    <section className="paraque-cl" aria-labelledby="paraque-titulo">
      <div className="paraque-cl-cabeza">
        <span className="portada-cl-eyebrow">Elige por uso</span>
        <h2 id="paraque-titulo">¿Para qué lo buscas?</h2>
      </div>
      <div className="paraque-cl-grid">
        {PARA_QUE.map((m) => (
          <Link key={m.titulo} className="paraque-cl-mosaico" href={m.href}>
            <Image src={m.foto} alt="" fill sizes="(max-width:820px) 50vw, 25vw" />
            <span className="paraque-cl-texto">
              <b>{m.titulo}</b>
              <small>{m.texto}</small>
            </span>
            <span className="paraque-cl-flecha" aria-hidden="true"><ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Una foto real por familia (el frasco de un aroma de esa familia). */
const FOTO_FAMILIA: Record<string, string> = {
  citricos: "/images/products/agua-foto.jpg",
  frescos: "/images/products/frescura-de-lino.jpg",
  florales: "/images/products/romeo-y-julieta.jpg",
  dulces: "/images/products/dulce-lana-foto.jpg",
  amaderados: "/images/products/eternamente-indigo-foto.jpg",
}

/** "Compra por familia": las cinco familias olfativas, cada una a su tienda. */
export function FamiliasCliche() {
  return (
    <section className="familias-cl" aria-labelledby="familias-titulo">
      <div className="paraque-cl-cabeza">
        <span className="portada-cl-eyebrow">Compra por familia</span>
        <h2 id="familias-titulo">¿Qué aroma te gusta?</h2>
      </div>
      <div className="familias-cl-grid">
        {FAMILIES.map((f) => (
          <Link key={f.value} className="familias-cl-item" href={`/catalogo?categoria=${f.value}`}>
            <span className="familias-cl-foto"><Image src={FOTO_FAMILIA[f.value]} alt="" fill sizes="(max-width:820px) 40vw, 18vw" /></span>
            <b>{f.label}</b>
            <small>{f.tag}</small>
          </Link>
        ))}
      </div>
    </section>
  )
}

/**
 * Kits con el precio real de cada uno y lo que se ahorra frente a comprar
 * por unidad (sin precios tachados). Lleva a "Arma tu kit", donde se eligen
 * los aromas.
 */
export function KitsCliche() {
  const kits = PRICE_TIERS.filter((t) => t.units > 1)
  return (
    <section className="kits-cl" aria-labelledby="kits-titulo">
      <div className="kits-cl-cabeza">
        <span className="portada-cl-eyebrow">Arma tu kit</span>
        <h2 id="kits-titulo">Mezcla los aromas que quieras y ahorra</h2>
        <p>Elige 3, 4 o 6 frascos de 250 ml, del mismo aroma o combinados. Llega en una sola caja.</p>
      </div>
      <div className="kits-cl-grid">
        {kits.map((t) => (
          <Link key={t.id} href="/arma-tu-kit" className={`kits-cl-kit${t.badge === "Recomendado" ? " is-destacado" : ""}`}>
            {t.badge && <span className="kits-cl-cinta">{t.badge}</span>}
            <b>{t.label}</b>
            <strong>${t.price.toLocaleString("es-CO")}</strong>
            <small>${Math.round(t.price / t.units).toLocaleString("es-CO")} c/u · ahorras ${tierSavings(t).toLocaleString("es-CO")}</small>
            <span className="kits-cl-cta">Elegir aromas <ArrowRight size={14} aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Garantías en una sola fila (reemplaza las cuatro pantallas fijas). */
export function GarantiasCliche() {
  const items = [
    { Icono: Zap, titulo: `Llega en ${ENTREGA_EN_LINEA}`, texto: "Despacho prioritario al pagar en línea." },
    ...(SOUVENIR_EN_LINEA ? [{ Icono: Gift, titulo: "Souvenir de regalo", texto: "Va en tu caja cuando pagas en línea." }] : []),
    { Icono: Shirt, titulo: "No mancha", texto: "Úsalo en prendas, sábanas y cortinas." },
    { Icono: RotateCcw, titulo: "Garantía de 30 días", texto: "Para cambios y devoluciones." },
    { Icono: ShieldCheck, titulo: "Pago protegido", texto: "Tarjeta, PSE o Nequi con Mercado Pago." },
  ]
  return (
    <section className="garantias-cl" aria-label="Garantías de Cliché">
      <ul>
        {items.map(({ Icono, titulo, texto }) => (
          <li key={titulo}><Icono size={22} aria-hidden="true" /><b>{titulo}</b><small>{texto}</small></li>
        ))}
      </ul>
    </section>
  )
}
