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
}

function providerChain(): Provider[] {
  return [
    { name: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
    { name: "cerebras", key: process.env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.3-70b" },
    { name: "together", key: process.env.TOGETHER_API_KEY, url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { name: "openai", key: process.env.OPENAI_API_KEY, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
    { name: "mistral", key: process.env.MISTRAL_API_KEY, url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
    { name: "nvidia", key: process.env.NVIDIA_API_KEY, url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "meta/llama-3.1-nemotron-70b-instruct" },
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
  const { system, messages, maxOutputTokens = 700, temperature = 0.8 } = opts
  if (!hasAnyAIProvider()) throw new Error("No hay proveedor de IA configurado (define GROQ_API_KEY u otra).")

  const msgs = [{ role: "system", content: system }, ...messages]

  for (const p of providerChain()) {
    if (!p.key) continue
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages: msgs, temperature, max_tokens: maxOutputTokens }),
        signal: AbortSignal.timeout(25000),
      })
      if (!res.ok) {
        console.warn(`[bot-ai] ${p.name} ${res.status}`, (await res.text().catch(() => "")).slice(0, 160))
        continue
      }
      const data = await res.json().catch(() => null)
      const text = (data?.choices?.[0]?.message?.content as string | undefined)?.trim()
      if (text) return text
      console.warn(`[bot-ai] ${p.name} devolvió respuesta vacía`)
    } catch (e) {
      console.warn(`[bot-ai] ${p.name} falló:`, (e as Error).message?.slice(0, 140))
    }
  }
  throw new Error("Todos los proveedores de IA fallaron o ninguno está configurado.")
}
