import { readFile } from "fs/promises"
import path from "path"

/**
 * Ruta temporal de desarrollo: sirve la imagen base de la intro con CORS
 * abierto para poder inyectarla en herramientas externas (CF Studio)
 * desde el navegador. Eliminar tras generar el video.
 */
export async function OPTIONS() {
  // Chrome Private Network Access: preflight para https → localhost
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Private-Network": "true",
    },
  })
}

export async function GET() {
  const file = await readFile(
    path.join(process.cwd(), "public", "images", "intro", "intro-silk-clean.png"),
  )
  return new Response(file, {
    headers: {
      "Content-Type": "image/png",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
