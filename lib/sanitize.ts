import sanitizeHtml from "sanitize-html"

/**
 * Sanitizado del HTML que producen los editores del panel (blog y contenido
 * libre de las fichas) ANTES de guardarlo: el sitio lo renderiza con
 * dangerouslySetInnerHTML, así que nada peligroso puede llegar a la BD.
 *
 * Se usa sanitize-html (JS puro) y NO DOMPurify/jsdom: jsdom no carga en las
 * funciones serverless de Vercel y tumbaba las rutas con un 500 al importar.
 */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "p", "br", "hr", "blockquote", "pre", "code",
      "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "del", "mark",
      "a", "img", "span", "figure", "figcaption", "table", "thead", "tbody",
      "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "class"],
      "*": ["style", "class"],
    },
    // Los estilos que generan los editores (color, fuente, alineación…);
    // cualquier otra propiedad CSS se descarta.
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "font-family": [/^[\w\s,'"()\\-]+$/],
        "font-size": [/^[\d.]+(?:px|em|rem|%)$/],
        "text-align": [/^(?:left|right|center|justify)$/],
        "text-decoration": [/^[\w\s-]+$/],
      },
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    // data: solo para imágenes (respaldo del import de .docx cuando la subida
    // a Storage falla).
    allowedSchemesByTag: { img: ["https", "http", "data"] },
    allowProtocolRelative: false,
  })
}
