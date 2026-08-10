"use client"

/**
 * Botoncito «?» de ayuda: al pulsarlo abre una explicación corta, en español
 * claro y con ejemplos del nicho (aromas para el hogar).
 *
 * Se usa junto a la etiqueta de un campo:
 *   <label>Meta título</label> <Ayuda titulo="Meta título">…</Ayuda>
 *
 * O con un texto ya escrito del catálogo de abajo:
 *   <Ayuda tema="metaTitulo" />
 */

import { useEffect, useRef, useState, type ReactNode } from "react"
import { HelpCircle, X } from "lucide-react"

// ── Catálogo de explicaciones ────────────────────────────────────────────────
// Un solo lugar para editar los textos: si el dueño pide otro ejemplo, se
// cambia aquí y se actualiza en todo el panel.

export interface AyudaTema {
  titulo: string
  cuerpo: ReactNode
}

export const AYUDA_TEMAS = {
  seo: {
    titulo: "¿Qué es el SEO?",
    cuerpo: (
      <>
        <p>
          SEO es el texto con el que tu tienda aparece cuando alguien busca en Google. No cambia
          nada de lo que ve el cliente dentro de la página: cambia el anuncio que Google muestra.
        </p>
        <p>
          Aquí escribes dos cosas por página y por producto: el <strong>meta título</strong> (el
          renglón azul) y la <strong>meta descripción</strong> (el texto gris de abajo).
        </p>
        <p className="text-[#2D1A14]/50">
          Si dejas los campos vacíos usamos un texto por defecto, así que nunca queda en blanco.
        </p>
      </>
    ),
  },
  metaTitulo: {
    titulo: "Meta título",
    cuerpo: (
      <>
        <p>
          Es el renglón azul que se lee en Google. Piensa qué escribiría un cliente para encontrarte
          y usa esas mismas palabras.
        </p>
        <ul>
          <li>
            Largo ideal: <strong>unos 55 caracteres</strong>. Más largo y Google lo corta con «…».
          </li>
          <li>Pon lo importante al principio: el producto, no la marca.</li>
          <li>Un título distinto para cada página; repetirlos confunde a Google.</li>
        </ul>
        <p className="text-emerald-700">
          Ejemplo: «Difusor de aroma para sala — notas cálidas»
        </p>
        <p className="text-red-600">
          Evita: «Inicio», «Producto 1» o llenarlo de palabras sueltas separadas por comas.
        </p>
      </>
    ),
  },
  metaDescripcion: {
    titulo: "Meta descripción",
    cuerpo: (
      <>
        <p>
          Es el texto gris debajo del título. Google no lo usa para posicionarte, pero sí decide si
          la persona hace clic en ti o en la competencia. Escríbelo como una invitación.
        </p>
        <ul>
          <li>
            Largo ideal: <strong>entre 120 y 155 caracteres</strong>.
          </li>
          <li>Di qué gana el cliente y cierra con una llamada suave a la acción.</li>
          <li>Si aplica, suma un dato de confianza: envío a toda Colombia, hecho a mano.</li>
        </ul>
        <p className="text-emerald-700">
          Ejemplo: «Aromas que hacen que tu casa huela a hogar. Hechos en Colombia, envío a todo el
          país. Descubre tu favorito.»
        </p>
        <p className="text-red-600">Evita: repetir el título tal cual o copiar la misma frase en todos los productos.</p>
      </>
    ),
  },
  vistaPreviaGoogle: {
    titulo: "Vista previa en Google",
    cuerpo: (
      <>
        <p>
          Es un ensayo de cómo se vería tu página en los resultados de búsqueda: dirección arriba,
          título azul y descripción gris.
        </p>
        <p>
          Si ves «…» al final, el texto quedó largo y Google lo cortaría ahí. Acorta hasta que se
          lea completo.
        </p>
        <p className="text-[#2D1A14]/50">
          Google a veces muestra un texto distinto al tuyo; es normal y no es un error.
        </p>
      </>
    ),
  },
  generarSugerencia: {
    titulo: "Generar sugerencia",
    cuerpo: (
      <>
        <p>
          Rellena los dos campos con una propuesta hecha a partir del nombre de la página o del
          producto. Es un punto de partida, no algo definitivo.
        </p>
        <p>
          Léela, cámbiale lo que quieras con tus propias palabras y pulsa <strong>Guardar</strong>.
          Nada se publica hasta que guardes.
        </p>
      </>
    ),
  },
  contadorCaracteres: {
    titulo: "El contador de caracteres",
    cuerpo: (
      <>
        <p>Te avisa con colores si el texto tiene buen largo:</p>
        <ul>
          <li>
            <span className="text-amber-600 font-semibold">Ámbar</span>: se quedó corto, puedes
            aprovechar más espacio.
          </li>
          <li>
            <span className="text-emerald-600 font-semibold">Verde</span>: largo ideal.
          </li>
          <li>
            <span className="text-red-600 font-semibold">Rojo</span>: se pasó y Google lo cortará.
          </li>
        </ul>
        <p className="text-[#2D1A14]/50">
          En el título el contador ya incluye el remate de marca que se añade solo al final.
        </p>
      </>
    ),
  },
  tituloProducto: {
    titulo: "Título del producto",
    cuerpo: (
      <>
        <p>
          Es el nombre que ve el cliente en la tienda y el que buscan en Google. Corto, concreto y
          fácil de recordar.
        </p>
        <ul>
          <li>Nombre + qué es: ayuda a quien no conoce la línea.</li>
          <li>Sin MAYÚSCULAS sostenidas ni signos de más.</li>
        </ul>
        <p className="text-emerald-700">Ejemplo: «Aroma Tao — difusor de varillas»</p>
      </>
    ),
  },
  descripcionProducto: {
    titulo: "Descripción del producto",
    cuerpo: (
      <>
        <p>
          Cuenta a qué huele y para qué espacio sirve. El cliente no puede olerlo: tu texto es su
          nariz.
        </p>
        <ul>
          <li>Empieza por la sensación: «cálido», «fresco», «amaderado».</li>
          <li>Di dónde queda bien: sala, habitación, baño, oficina.</li>
          <li>Frases cortas. Dos o tres renglones bastan.</li>
        </ul>
        <p className="text-emerald-700">
          Ejemplo: «Notas cálidas de vainilla y madera. Ideal para la sala en las noches; llena el
          espacio sin cansar.»
        </p>
      </>
    ),
  },
  tituloDescripcion: {
    titulo: "Título arriba de la descripción",
    cuerpo: (
      <>
        <p>
          Un renglón opcional, con aire de frase bonita, que va justo encima de la descripción en la
          ficha del producto.
        </p>
        <p className="text-emerald-700">Ejemplo: «Un aroma que abraza tu casa».</p>
        <p className="text-[#2D1A14]/50">Si lo dejas vacío simplemente no aparece.</p>
      </>
    ),
  },
  precioAntes: {
    titulo: "Precio «antes» (tachado)",
    cuerpo: (
      <>
        <p>
          Es el precio anterior que se muestra tachado al lado del actual, para que se note el
          descuento.
        </p>
        <p>Solo llénalo si de verdad ese fue el precio: debe ser mayor al precio actual.</p>
        <p className="text-[#2D1A14]/50">Déjalo vacío si el producto no está en promoción.</p>
      </>
    ),
  },
  imagenesProducto: {
    titulo: "Imágenes del producto",
    cuerpo: (
      <>
        <p>
          La <strong>primera imagen es la principal</strong>: es la que sale en la parrilla de la
          tienda y en la vista previa. Puedes cambiarla con «Hacer principal».
        </p>
        <ul>
          <li>Fondo claro y el producto centrado.</li>
          <li>Cuadradas se ven mejor (por ejemplo 1000 × 1000).</li>
          <li>Suma una foto del producto en un espacio real: ayuda a imaginarlo en casa.</li>
        </ul>
      </>
    ),
  },
  stock: {
    titulo: "Stock",
    cuerpo: (
      <>
        <p>Unidades disponibles. Baja solo con cada venta pagada.</p>
        <p>
          En cero, el producto se muestra como agotado y no se puede comprar. Te llega un correo
          cuando algo se agota.
        </p>
      </>
    ),
  },
  visibleEnTienda: {
    titulo: "Visible en tienda",
    cuerpo: (
      <>
        <p>
          Si lo desmarcas, el producto desaparece de la tienda pero no se borra: sus datos y su
          historial de ventas quedan intactos.
        </p>
        <p className="text-[#2D1A14]/50">
          Útil para productos de temporada o mientras terminas de subir las fotos.
        </p>
      </>
    ),
  },
} satisfies Record<string, AyudaTema>

export type AyudaTemaKey = keyof typeof AYUDA_TEMAS

// ── Componente ───────────────────────────────────────────────────────────────

export function Ayuda({
  tema,
  titulo,
  children,
  align = "right",
}: {
  /** Texto del catálogo. Si se usa, no hace falta `titulo`/`children`. */
  tema?: AyudaTemaKey
  titulo?: string
  children?: ReactNode
  /** Hacia qué lado se abre el globo (por si el campo está pegado a un borde). */
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Cerrar al hacer clic fuera o con Escape: el dueño no debería quedar
  // atrapado con un globo abierto encima de un campo.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const t = tema ? AYUDA_TEMAS[tema] : undefined
  const heading = titulo || t?.titulo || "Ayuda"
  const body = children ?? t?.cuerpo

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`Ayuda: ${heading}`}
        title={`¿Cómo se usa? ${heading}`}
        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors ${
          open
            ? "bg-[#A67163] text-white"
            : "text-[#2D1A14]/30 hover:text-[#A67163] hover:bg-[#A67163]/10"
        }`}
      >
        <HelpCircle className="w-[14px] h-[14px]" />
      </button>

      {open && (
        <span
          role="dialog"
          aria-label={heading}
          className={`absolute top-6 z-50 w-[min(19rem,calc(100vw-3rem))] rounded-xl border border-[#2D1A14]/10 bg-white p-4 text-left shadow-xl shadow-[#2D1A14]/10 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <span className="flex items-start justify-between gap-3 mb-1.5">
            <strong className="block text-[13px] font-semibold text-[#2D1A14]">{heading}</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar ayuda"
              className="w-5 h-5 -mt-0.5 rounded-md flex items-center justify-center text-[#2D1A14]/30 hover:text-[#2D1A14] hover:bg-[#2D1A14]/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          <span className="block text-[12px] leading-relaxed text-[#2D1A14]/70 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ul>li]:mb-1">
            {body}
          </span>
        </span>
      )}
    </span>
  )
}
