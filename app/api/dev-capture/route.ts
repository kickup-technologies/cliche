import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

/**
 * dev-capture — recibe un dataURL PNG y lo guarda en public/renders/.
 * Herramienta de desarrollo para capturar renders del frasco 3D
 * (window.__renderBottle). Deshabilitada por completo en producción.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 })
  }
  const { name, dataUrl } = (await req.json()) as { name?: string; dataUrl?: string }
  if (!name || !dataUrl?.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 })
  }
  const safe = name.replace(/[^a-z0-9-_]/gi, "")
  const dir = path.join(process.cwd(), "public", "renders")
  await mkdir(dir, { recursive: true })
  const buf = Buffer.from(dataUrl.split(",")[1], "base64")
  const file = path.join(dir, `${safe}.png`)
  await writeFile(file, buf)
  return NextResponse.json({ ok: true, file: `/renders/${safe}.png`, bytes: buf.length })
}
