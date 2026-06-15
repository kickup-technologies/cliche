import Jimp from "jimp"
import fs from "fs"
import path from "path"

/**
 * Recorta el fondo de los renders de producto con flood-fill desde los bordes.
 * El fondo es una región uniforme conectada a los bordes; expandimos desde el
 * borde quitando píxeles parecidos al color de fondo (con tolerancia), sin tocar
 * zonas claras internas (etiquetas) que no están conectadas al borde.
 * Salida: public/images/products/cutout/<slug>.png (transparente).
 */
const SRC = path.join(process.cwd(), "public", "images", "products")
const OUT = path.join(SRC, "cutout")
const TOL = 38 // tolerancia de color (0-441)
const FEATHER = 22 // suaviza el borde para evitar halos duros

function dist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

async function processFile(file: string) {
  const slug = file.replace(/\.(png|jpe?g)$/i, "")
  const img = await Jimp.read(path.join(SRC, file))
  const { width: w, height: h, data } = img.bitmap

  // color de fondo = promedio de las 4 esquinas
  const corners = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
  ].map(([x, y]) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]] })
  const bg = [0, 1, 2].map((k) => Math.round(corners.reduce((s, c) => s + c[k], 0) / 4))

  const visited = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (visited[p]) return
    const i = p * 4
    if (dist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2]) <= TOL) {
      visited[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w, y = (p / w) | 0
    data[p * 4 + 3] = 0 // transparente
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }

  // feather: píxeles aún opacos pero parecidos al fondo → alpha proporcional
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (data[i + 3] === 0) continue
    const d = dist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2])
    if (d < TOL + FEATHER) {
      data[i + 3] = Math.round((d - TOL) / FEATHER * 255 < 0 ? 0 : Math.min(255, (d - TOL) / FEATHER * 255))
    }
  }

  fs.mkdirSync(OUT, { recursive: true })
  await img.writeAsync(path.join(OUT, `${slug}.png`))
  console.log(`✓ ${slug}`)
}

async function main() {
  const files = fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f) && !f.startsWith("coconut-2"))
  for (const f of files) {
    try { await processFile(f) } catch (e) { console.error(`✗ ${f}:`, String(e)) }
  }
  console.log("Listo →", OUT)
}

main()
