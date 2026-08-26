// Prueba one-off del cerebro del asesor con el catálogo y config reales.
// Uso: npx -y tsx scripts/test-brain.ts
import fs from "fs"
import path from "path"

const envFile = path.join(process.cwd(), ".env.local")
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

async function main() {
  const { generateAdvisorReply } = await import("@/lib/bot/brain")
  const r1 = await generateAdvisorReply([{ role: "user", content: "Hola" }])
  console.log("— Respuesta a 'Hola':", JSON.stringify(r1.text))
  const r2 = await generateAdvisorReply([
    { role: "user", content: "Hola" },
    { role: "assistant", content: r1.text },
    { role: "user", content: "busco un aroma para mi marca de vestidos de baño, ¿cuál me recomiendas y cuánto vale?" },
  ])
  console.log("— Recomendación:", JSON.stringify(r2.text))
}

main().then(() => process.exit(0)).catch((e) => { console.error("FALLO:", e); process.exit(1) })
