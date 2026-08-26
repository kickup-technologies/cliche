// Prueba de carga: ¿cuántas conversaciones DISTINTAS puede responder el
// cerebro en paralelo con los buckets gratuitos de Groq (3 modelos + retry)?
// Uso: npx -y tsx scripts/load-test-brain.ts
import fs from "fs"
import path from "path"

const envFile = path.join(process.cwd(), ".env.local")
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const PREGUNTAS = [
  "Hola, busco un aroma para mi marca de ropa deportiva",
  "buenas! tienen algo para spa?",
  "hola, cuanto vale el kit de 3?",
  "necesito un aroma para mi tienda de mascotas",
  "hola quiero algo dulce para marca infantil",
  "que me recomiendas para un hotel boutique?",
  "hola, hacen envios a Medellin?",
  "busco algo tipo luxury para streetwear",
  "cual es el mas vendido?",
  "hola, tienen catalogo?",
]

async function main() {
  const { generateAdvisorReply, loadBotContext } = await import("@/lib/bot/brain")
  const ctx = await loadBotContext() // contexto compartido: 1 sola carga de BD
  const t0 = Date.now()

  const results = await Promise.all(
    PREGUNTAS.map(async (q, i) => {
      const start = Date.now()
      try {
        const r = await generateAdvisorReply([{ role: "user", content: q }], ctx)
        return { i: i + 1, ok: true, secs: Math.round((Date.now() - start) / 100) / 10, preview: r.text.slice(0, 60) }
      } catch (e) {
        return { i: i + 1, ok: false, secs: Math.round((Date.now() - start) / 100) / 10, preview: (e as Error).message.slice(0, 60) }
      }
    }),
  )

  const okCount = results.filter((r) => r.ok).length
  console.log(`\n=== ${okCount}/10 respondidos · total ${Math.round((Date.now() - t0) / 1000)}s ===`)
  for (const r of results.sort((a, b) => a.secs - b.secs)) {
    console.log(`${r.ok ? "OK " : "FAIL"} #${r.i} ${r.secs}s :: ${JSON.stringify(r.preview)}`)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
