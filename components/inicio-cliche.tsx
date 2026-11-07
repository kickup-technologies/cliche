import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA } from "@/lib/entrega"

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
