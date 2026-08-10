import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Chat de ayuda del panel admin.
 *
 * Responde dudas de la dueña sobre cómo usar el panel, ideas de SEO, redactar
 * descripciones, etc. Usa Google Gemini en su capa GRATUITA (gemini-2.5-flash,
 * con gemini-2.0-flash como respaldo). La clave va SOLO por variable de
 * entorno: GEMINI_API_KEY. Sin clave, el chat lo dice con claridad.
 */

export const runtime = "nodejs"

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
const MAX_HISTORY = 12
const MAX_CHARS = 2000

const SIN_CLAVE = "Todavía no tengo activada mi conexión de inteligencia artificial. Pídele a Andrés activar la clave gratuita de Gemini (GEMINI_API_KEY) y vuelvo a funcionar."

const SYSTEM_PROMPT = `Eres «Ayudante de Cliché», el asistente del panel de administración de la tienda Bienestar by Cliché (clichecolombia.com), una tienda colombiana de aromas y ambientadores para el hogar.

Hablas con la dueña de la tienda, que NO es técnica. Reglas de tu forma de responder:
- Siempre en español de Colombia, cercano y amable, tuteando.
- Respuestas CORTAS: máximo 6 u 8 renglones. Si algo es paso a paso, usa una lista numerada breve.
- Nada de jerga técnica (no digas "endpoint", "deploy", "API", "base de datos"). Habla de "el panel", "la tienda", "la página del producto".
- Si te piden textos (títulos, descripciones, ideas), entrega el texto listo para copiar y pegar, sin explicaciones largas.
- Si no sabes algo o depende de un cambio en el código, dilo claro y sugiere escribirle a Andrés (el programador).

Qué hay en el panel (por si preguntan dónde está algo):
- Resumen: cómo va la tienda hoy.
- Ventas, Tráfico, Productos, Mapas de Calor: analíticas.
- Pedidos: pedidos pagados, cambiar estado, guía y transportadora.
- Clientes: base de clientes (CRM).
- Códigos de descuento: crear y desactivar códigos. El descuento nunca aplica al costo de envío.
- Inventario: crear, editar y eliminar productos, fotos, precios y stock.
- SEO: meta título y meta descripción de cada página y de cada producto (lo que se ve en Google).
- Asistente WhatsApp: la asesora virtual que responde por WhatsApp.

Consejos de SEO que puedes dar (nicho aromas para el hogar en Colombia):
- Meta título: ~55 caracteres, lo importante primero, incluir el tipo de producto y a veces "Colombia".
- Meta descripción: ~150 caracteres, que invite al clic, con un beneficio y una invitación ("Envíos a todo el país").
- No repetir el mismo título en varias páginas ni amontonar palabras clave.`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null
  const out: ChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== "object") return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== "user" && role !== "assistant") return null
    if (typeof content !== "string" || !content.trim()) continue
    out.push({ role, content: content.slice(0, MAX_CHARS) })
  }
  if (out.length === 0) return null
  if (out[out.length - 1].role !== "user") return null
  return out.slice(-MAX_HISTORY)
}

/** Llama a Gemini con un modelo concreto. Devuelve el texto o lanza error. */
async function askGemini(model: string, key: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(25000),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`${model} ${res.status} ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim()
  if (!text) throw new Error(`${model} respondió vacío`)
  return text
}

/** POST /api/admin/assistant — body: { messages: [{ role, content }] } */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const limited = rateLimit(req, { id: "admin-assistant", limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ error: SIN_CLAVE, needsKey: true }, { status: 503 })
  }

  let messages: ChatMessage[] | null = null
  try {
    const body = await req.json()
    messages = parseMessages((body as { messages?: unknown })?.messages)
  } catch {
    messages = null
  }
  if (!messages) {
    return NextResponse.json({ error: "Escribe una pregunta para poder ayudarte." }, { status: 400 })
  }

  let lastError = ""
  for (const model of MODELS) {
    try {
      const reply = await askGemini(model, key, messages)
      return NextResponse.json({ reply })
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.warn("[admin/assistant]", lastError)
    }
  }

  return NextResponse.json(
    { error: "No pude responder en este momento. Intenta de nuevo en un minuto." },
    { status: 502 }
  )
}
