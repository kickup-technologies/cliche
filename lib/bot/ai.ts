// ── Router de IA multi-proveedor (llamada directa por fetch) ──────────────────
// Reusa las mismas claves que kickup. Encadena proveedores OpenAI-compatibles:
// si uno falla (cuota, caída, timeout) pasa al siguiente. Define al menos una
// API key. Se llama por fetch directo (sin AI SDK) para evitar que el `system`
// prompt se pierda y para máxima fiabilidad entre proveedores.

export interface AIMessage {
  role: "user" | "assistant"
  content: string
}

interface Provider {
  name: string
  key: string | undefined
  url: string
  model: string
  /** Campos extra específicos del proveedor (p. ej. control de razonamiento). */
  extra?: Record<string, unknown>
}

// Groq retiró los Llama de chat en 2026 (llama-3.3-70b-versatile daba 404 y el
// bot quedó mudo): gpt-oss-120b es su modelo general vigente, con qwen3.6 de
// respaldo en la misma cuenta. reasoning_effort/format evitan que el
// razonamiento del modelo se coma el presupuesto de tokens o aparezca en el chat.
function providerChain(): Provider[] {
  return [
    { name: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-120b", extra: { reasoning_effort: "low" } },
    { name: "groq-qwen", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "qwen/qwen3.6-27b", extra: { reasoning_format: "hidden" } },
    // Tercer bucket de rate limit en la MISMA cuenta gratuita: cada modelo de
    // Groq tiene su propio límite de 8k tokens/min, así que 20b suma capacidad
    // para picos de clientes simultáneos sin costo.
    { name: "groq-20b", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-20b", extra: { reasoning_effort: "low" } },
    { name: "cerebras", key: process.env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: "gpt-oss-120b" },
    { name: "together", key: process.env.TOGETHER_API_KEY, url: "https://api.together.xyz/v1/chat/completions", model: "openai/gpt-oss-120b" },
    { name: "openai", key: process.env.OPENAI_API_KEY, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
    { name: "mistral", key: process.env.MISTRAL_API_KEY, url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  ]
}

export function hasAnyAIProvider(): boolean {
  return providerChain().some((p) => !!p.key)
}

/**
 * Genera la respuesta del asesor. El system prompt va como primer mensaje
 * (rol "system") del array, seguido del historial de la conversación.
 */
export async function botReply(opts: {
  system: string
  messages: AIMessage[]
  maxOutputTokens?: number
  temperature?: number
}): Promise<string> {
  // El presupuesto de salida incluye el razonamiento interno de los modelos
  // actuales: con 700 se quedaban sin tokens para la respuesta visible.
  const { system, messages, maxOutputTokens = 1500, temperature = 0.8 } = opts
  if (!hasAnyAIProvider()) throw new Error("No hay proveedor de IA configurado (define GROQ_API_KEY u otra).")

  const msgs = [{ role: "system", content: system }, ...messages]

  for (const p of providerChain()) {
    if (!p.key) continue
    // Hasta 2 intentos por proveedor: un 429 con espera corta (rate limit por
    // minuto del tier gratuito) se reintenta tras la pausa que pide el servidor.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(p.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: p.model, messages: msgs, temperature, max_tokens: maxOutputTokens, ...(p.extra || {}) }),
          signal: AbortSignal.timeout(25000),
        })
        if (res.status === 429 && attempt === 0) {
          const bodyText = await res.text().catch(() => "")
          const retryHeader = Number(res.headers.get("retry-after"))
          // Groq usa "try again in 18.3s" en carga normal y "try again in
          // 1m32.5s" bajo ráfaga — el formato con minutos rompía el parseo y
          // el reintento nunca se activaba (visto en prueba de carga 10x).
          const m = /try again in (?:(\d+)m)?(\d+(?:\.\d+)?)s/.exec(bodyText)
          const retryMsg = m ? Number(m[1] || 0) * 60 + Number(m[2]) : NaN
          const waitSec = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : retryMsg
          if (Number.isFinite(waitSec) && waitSec > 0 && waitSec <= 45) {
            console.warn(`[bot-ai] ${p.name} 429 — reintenta en ${waitSec}s`)
            await new Promise((r) => setTimeout(r, (waitSec + 1) * 1000))
            continue
          }
          console.warn(`[bot-ai] ${p.name} 429 sin espera corta`, bodyText.slice(0, 160))
          break
        }
        if (!res.ok) {
          console.warn(`[bot-ai] ${p.name} ${res.status}`, (await res.text().catch(() => "")).slice(0, 160))
          break
        }
        const data = await res.json().catch(() => null)
        const text = (data?.choices?.[0]?.message?.content as string | undefined)?.trim()
        if (text) return text
        console.warn(`[bot-ai] ${p.name} devolvió respuesta vacía`)
        break
      } catch (e) {
        console.warn(`[bot-ai] ${p.name} falló:`, (e as Error).message?.slice(0, 140))
        break
      }
    }
  }
  throw new Error("Todos los proveedores de IA fallaron o ninguno está configurado.")
}
