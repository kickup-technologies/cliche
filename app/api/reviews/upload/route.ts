import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

// POST /api/reviews/upload
// Recibe multipart/form-data con files[] y devuelve URLs públicas.
//
// SEGURIDAD: este endpoint es público (lo usa cualquier visitante que deja una
// reseña), por eso valida estrictamente para que NO se pueda usar como hosting
// de archivos arbitrarios en nuestro dominio:
//   - Solo imágenes/vídeo de tipos permitidos (nada de HTML/SVG/JS → evita XSS
//     servido desde nuestra URL ni ejecutables).
//   - Tamaño máximo por archivo y nº máximo de archivos (evita abuso de almacenamiento/coste).
//   - Extensión derivada del tipo MIME validado (no del nombre que envía el cliente).
//   - Rate limit por IP.
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB por archivo
const MAX_FILES = 6
// MIME permitido → extensión segura controlada por nosotros
const TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
}

export async function POST(req: NextRequest) {
  // Anti-abuso: máx. 10 subidas por IP cada 10 minutos
  const limited = rateLimit(req, { id: "reviews-upload", limit: 10, windowMs: 10 * 60_000 })
  if (limited) return limited

  try {
    const formData = await req.formData()
    const files = (formData.getAll("files") as File[]).filter((f) => f instanceof File)

    if (!files.length) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos` }, { status: 400 })
    }

    const db = createServerClient()
    const urls: string[] = []

    for (const file of files) {
      const ext = TYPE_EXT[file.type]
      if (!ext) {
        return NextResponse.json(
          { error: "Tipo de archivo no permitido (solo imágenes o vídeo)" },
          { status: 400 }
        )
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Archivo demasiado grande (máx 8MB)" }, { status: 400 })
      }

      // Nombre 100% controlado por el servidor: nada del nombre original entra.
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error } = await db.storage
        .from("review-media")
        .upload(path, buffer, {
          // contentType validado contra el allowlist, no el que dice el cliente
          contentType: file.type,
          upsert: false,
        })

      if (error) {
        console.error("[reviews/upload] storage error:", error)
        continue
      }

      const { data } = db.storage.from("review-media").getPublicUrl(path)
      urls.push(data.publicUrl)
    }

    return NextResponse.json({ urls })
  } catch (err) {
    console.error("[reviews/upload]", err)
    return NextResponse.json({ error: "Error al subir archivos" }, { status: 500 })
  }
}
