import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

// ── Router de IA multi-proveedor (OpenAI-compatible) ──────────────────────────
// Reusa las mismas claves que kickuptech. Encadena proveedores: si uno falla
// (cuota, caída, timeout) pasa al siguiente. Define al menos una API key.
// Orden pensado para un asesor conversacional en español: Groq → Cerebras →
// Together → NVIDIA → Mistral → OpenAI.

const groq = createOpenAI({ apiKey: process.env.GROQ_API_KEY ?? "", baseURL: "https://api.groq.com/openai/v1" })
const cerebras = createOpenAI({ apiKey: process.env.CEREBRAS_API_KEY ?? "", baseURL: "https://api.cerebras.ai/v1" })
const together = createOpenAI({ apiKey: process.env.TOGETHER_API_KEY ?? "", baseURL: "https://api.together.xyz/v1" })
const mistral = createOpenAI({ apiKey: process.env.MISTRAL_API_KEY ?? "", baseURL: "https://api.mistral.ai/v1" })
const nvidia = createOpenAI({ apiKey: process.env.NVIDIA_API_KEY ?? "", baseURL: "https://integrate.api.nvidia.com/v1" })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" })

const M = {
  groq_70b: "llama-3.3-70b-versatile",
  cerebras_70b: "llama-3.3-70b",
  together_70b: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  mistral_small: "mistral-small-latest",
  nvidia_70b: "meta/llama-3.1-nemotron-70b-instruct",
  openai_mini: "gpt-4.1-mini",
} as const

export interface AIMessage {
  role: "user" | "assistant"
  content: string
}

function providers() {
  return {
    groq: !!process.env.GROQ_API_KEY,
    cerebras: !!process.env.CEREBRAS_API_KEY,
    together: !!process.env.TOGETHER_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    nvidia: !!process.env.NVIDIA_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  }
}

export function hasAnyAIProvider(): boolean {
  return Object.values(providers()).some(Boolean)
}

type ModelRef = Parameters<typeof generateText>[0]["model"]

async function tryModel(label: string, model: ModelRef, args: Record<string, unknown>): Promise<string | null> {
  try {
    const { text } = await generateText({ model, ...args } as Parameters<typeof generateText>[0])
    return text?.trim() || null
  } catch (err) {
    console.warn(`[bot-ai] ${label} falló:`, (err as Error).message?.slice(0, 140))
    return null
  }
}

/**
 * Genera la respuesta del asesor. Recibe el system prompt y el historial de
 * mensajes de la conversación. Devuelve texto plano listo para WhatsApp.
 */
export async function botReply(opts: {
  system: string
  messages: AIMessage[]
  maxOutputTokens?: number
  temperature?: number
}): Promise<string> {
  const { system, messages, maxOutputTokens = 700, temperature = 0.8 } = opts
  if (!hasAnyAIProvider()) throw new Error("No hay proveedor de IA configurado (define GROQ_API_KEY u otra).")

  const p = providers()
  // El system prompt se inyecta como primer mensaje de rol "system" dentro del
  // array (más robusto entre proveedores que el parámetro `system`, que algunos
  // ignoran). Usamos maxOutputTokens (nombre correcto en AI SDK v6).
  const fullMessages = [{ role: "system", content: system }, ...messages] as Array<{ role: string; content: string }>
  const base = { messages: fullMessages, maxOutputTokens }
  const withTemp = (supports: boolean) => (supports ? { ...base, temperature } : base)

  const chain: Array<[boolean, () => Promise<string | null>]> = [
    [p.groq, () => tryModel("Groq 70B", groq(M.groq_70b), withTemp(false))],
    [p.cerebras, () => tryModel("Cerebras 70B", cerebras(M.cerebras_70b), withTemp(false))],
    [p.together, () => tryModel("Together 70B", together(M.together_70b), withTemp(false))],
    [p.nvidia, () => tryModel("NVIDIA Nemotron", nvidia(M.nvidia_70b), withTemp(false))],
    [p.mistral, () => tryModel("Mistral Small", mistral(M.mistral_small), withTemp(true))],
    [p.openai, () => tryModel("OpenAI 4.1-mini", openai(M.openai_mini), withTemp(true))],
  ]

  for (const [available, call] of chain) {
    if (!available) continue
    const result = await call()
    if (result) return result
  }
  throw new Error("Todos los proveedores de IA fallaron o ninguno está configurado.")
}
