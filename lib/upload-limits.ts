/**
 * Límites de las imágenes de producto.
 *
 * Viven aquí (y no dentro de la ruta del API) para que el panel admin pueda
 * avisar ANTES de subir y con las mismas reglas que aplica el servidor: si los
 * dos lados se desincronizan, la dueña ve un error genérico después de esperar
 * la subida completa de una foto pesada.
 */

/**
 * Tope por foto: 4 MB.
 *
 * ⚠️ NO SUBIR ESTE NÚMERO POR ENCIMA DE ~4 MB ⚠️
 * Vercel corta el cuerpo de la petición en 4.5 MB antes de que llegue a
 * /api/admin/upload, y el envío multipart pesa un poco más que el archivo. Con
 * el tope anterior (5 MB) una foto de 4.6 MB pasaba la revisión del panel y
 * moría después en la plataforma, así que la dueña esperaba la subida entera
 * para ver un error genérico que no explicaba nada.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4 MB
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024)

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]

/** Extensiones que el navegador ofrece en el selector de archivos. */
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif"

/**
 * Los formatos aceptados, escritos para la dueña. Vive junto a
 * ALLOWED_IMAGE_TYPES para que el aviso del panel y lo que de verdad acepta el
 * servidor no se vuelvan a desincronizar (el panel decía «JPG, PNG o WebP»
 * pero GIF y AVIF también entraban).
 */
export const IMAGE_FORMATS_TEXTO = "JPG, PNG, WebP, GIF o AVIF"

/**
 * ¿Es una foto de iPhone en HEIC/HEIF? Es el caso más común de subida fallida:
 * el celular las guarda así por defecto y ningún navegador las muestra, así que
 * merece un mensaje que explique cómo resolverlo en vez de un "no se pudo".
 */
export function isHeic(name: string, type: string): boolean {
  return /\.(heic|heif)$/i.test(name) || type === "image/heic" || type === "image/heif"
}

/**
 * Revisa una imagen antes de subirla. Devuelve el motivo en español claro, o
 * null si está bien.
 */
export function imageProblem(file: { name: string; type: string; size: number }): string | null {
  const nombre = `«${file.name}»`
  if (isHeic(file.name, file.type)) {
    return `${nombre} es una foto de iPhone (formato HEIC) y los navegadores no la muestran. Solución rápida: envíatela por WhatsApp y sube la que llega, o cambia en el iPhone Ajustes → Cámara → Formatos → «Más compatible».`
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${nombre} no es una imagen que la tienda pueda mostrar. Usa ${IMAGE_FORMATS_TEXTO}.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `${nombre} pesa ${mb} MB y el máximo son ${MAX_IMAGE_MB} MB. Reduce la foto (o mándatela por WhatsApp, que la comprime) y vuelve a intentar.`
  }
  return null
}
