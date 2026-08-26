// Prueba one-off del cerebro del asesor con el catálogo y config reales.
// Uso: npx -y tsx scripts/test-brain.ts
import fs from "fs"
import path from "path"

const envFile = path.join(process.cwd(), ".env.local")
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const { generateAdvisorReply, loadBotContext } = await import("@/lib/bot/brain")
  const ctx = await loadBotContext()

  // 1) Primer contacto → debe presentarse
  const r1 = await generateAdvisorReply([{ role: "user", content: "Hola" }], ctx)
  console.log("\n[1] Primer 'Hola':", JSON.stringify(r1.text))

  await wait(35000) // respetar el TPM del tier gratuito

  // 2) Ficha de un aroma específico → notas, precio, link
  const h2 = [
    { role: "user" as const, content: "Hola" },
    { role: "assistant" as const, content: r1.text },
    { role: "user" as const, content: "cuéntame todo sobre el aroma Luxury" },
  ]
  const r2 = await generateAdvisorReply(h2, ctx)
  console.log("\n[2] Ficha Luxury:", JSON.stringify(r2.text))

  await wait(35000)

  // 3) Intención de compra → debe dar el link directo del producto
  const h3 = [...h2, { role: "assistant" as const, content: r2.text }, { role: "user" as const, content: "listo, lo quiero comprar, ¿cómo hago el pedido?" }]
  const r3 = await generateAdvisorReply(h3, ctx)
  console.log("\n[3] Compra:", JSON.stringify(r3.text))
}

main().then(() => process.exit(0)).catch((e) => { console.error("FALLO:", e); process.exit(1) })
