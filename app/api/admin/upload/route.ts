import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { imageProblem } from "@/lib/upload-limits"

/** Extensión del archivo guardado, deducida del tipo real de la imagen. */
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No llegó ninguna imagen" }, { status: 400 })

    // Mismas reglas que ve el panel antes de subir, con el motivo exacto en
    // español: tipo no soportado (HEIC de iPhone, PDF…) o demasiado pesada.
    const problema = imageProblem({ name: file.name, type: file.type, size: file.size })
    if (problema) return NextResponse.json({ error: problema }, { status: 400 })

    const supabase = createServerClient()
    // De la extensión escrita no nos fiamos (un "foto" sin punto se guardaba
    // con el nombre entero de extensión): manda el tipo real.
    const ext = EXT_BY_TYPE[file.type] || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (error) {
      console.error("[admin/upload]", error.message)
      return NextResponse.json({ error: "No se pudo guardar la imagen. Intenta de nuevo." }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: "No se pudo subir la imagen. Revisa tu conexión e intenta otra vez." }, { status: 500 })
  }
}
