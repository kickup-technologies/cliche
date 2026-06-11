import { readFile, stat } from "fs/promises"
import path from "path"

/**
 * Sirve el video de la intro con soporte de Range.
 * Workaround del bug del dev server (Turbopack) que deja "stalled"
 * los videos servidos directamente desde /public. Funciona igual en prod.
 */
const VIDEO = path.join(process.cwd(), "public", "videos", "intro-silk.mp4")

export async function GET(req: Request) {
  const { size } = await stat(VIDEO)
  const file = await readFile(VIDEO)
  const range = req.headers.get("range")

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/)
    const start = m ? parseInt(m[1], 10) : 0
    const end = m && m[2] ? parseInt(m[2], 10) : size - 1
    return new Response(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Cache-Control": "public, max-age=3600",
      },
    })
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
