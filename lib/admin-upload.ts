"use client"

/**
 * Subir una foto desde el panel admin, con mensajes que la dueña entienda.
 *
 * Vive aquí (y no dentro de cada sección) porque el panel sube imágenes desde
 * dos sitios —el inventario y «Personalizar»— y antes cada uno explicaba los
 * fallos a su manera: uno decía el motivo exacto y el otro solo «No se pudo
 * subir la imagen». Ahora los dos cuentan lo mismo y con la misma solución.
 *
 * Devuelve `{ url }` si salió bien, o `{ error }` con el motivo en español.
 * Nunca lanza: quien la llama solo tiene que mirar cuál de las dos llegó.
 */

import { imageProblem, MAX_IMAGE_MB } from "@/lib/upload-limits"

export type SubidaResultado = { url: string } | { error: string }

export async function subirImagen(file: File): Promise<SubidaResultado> {
  // Se revisa ANTES de subir: si la foto no sirve (HEIC del iPhone, pesada de
  // más), no tiene sentido esperar la subida entera para enterarse.
  const problema = imageProblem(file)
  if (problema) return { error: problema }

  const fd = new FormData()
  fd.append("file", file)

  try {
    const res = await fetch("/api/gestion/upload", { method: "POST", body: fd })

    if (res.status === 401) {
      return { error: "La sesión del panel expiró. Vuelve a entrar y sube la foto de nuevo." }
    }
    // 413: la plataforma cortó la subida por peso antes de que llegara al
    // servidor. No devuelve JSON, así que sin este caso el mensaje quedaba en
    // el genérico «intenta de nuevo» y la dueña reintentaba en vano.
    if (res.status === 413) {
      return {
        error: `«${file.name}» pesa demasiado para subirla de una. El máximo son ${MAX_IMAGE_MB} MB: reduce la foto (o mándatela por WhatsApp, que la comprime) y vuelve a intentar.`,
      }
    }

    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (!res.ok || !data.url) {
      return { error: data.error || `No se pudo subir «${file.name}». Intenta de nuevo.` }
    }
    return { url: data.url }
  } catch {
    return { error: `Se cortó la conexión al subir «${file.name}». Revisa tu internet e intenta otra vez.` }
  }
}
