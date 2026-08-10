import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"
import { botReply, hasAnyAIProvider, type AIMessage } from "@/lib/bot/ai"
import { PANEL_CONTEXT } from "@/lib/admin-assistant-context"

/**
 * Chat de ayuda del panel admin.
 *
 * Responde dudas de la dueña sobre cómo usar el panel, ideas de SEO, redactar
 * descripciones, etc.
 *
 * Usa la MISMA cadena de proveedores de IA que ya alimenta al asesor de
 * WhatsApp (lib/bot/ai.ts: Groq, Cerebras, Together…), así no hay que
 * configurar ni pagar nada nuevo. Las conversaciones NO se cruzan: el bot de
 * WhatsApp y este chat comparten solo el "motor"; cada uno manda su propio
 * system prompt y su propio historial, y nada se guarda entre los dos.
 *
 * Gemini queda como respaldo opcional: si existe GEMINI_API_KEY se intenta
 * cuando la cadena principal falla. Ninguna clave vive en el código.
 */

export const runtime = "nodejs"

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
const MAX_HISTORY = 12
const MAX_CHARS = 2000

const SIN_PROVEEDOR = "Todavía no tengo activada mi conexión de inteligencia artificial. Pídele a Andrés que revise la clave del asistente (la misma que usa el bot de WhatsApp) y vuelvo a funcionar."

const SYSTEM_PROMPT = `Eres «Ayudante de Cliché», el asistente del panel de administración de la tienda Bienestar by Cliché (clichecolombia.com), una tienda colombiana de aromas y ambientadores para el hogar.

Hablas con la dueña de la tienda, que NO es técnica. Reglas de tu forma de responder:
- Siempre en español de Colombia, cercano y amable, tuteando.
- Respuestas CORTAS: máximo 6 u 8 renglones. Si algo es paso a paso, usa una lista numerada breve.
- Nada de jerga técnica (no digas "endpoint", "deploy", "API", "base de datos"). Habla de "el panel", "la tienda", "la página del producto".
- Si te piden textos (títulos, descripciones, ideas), entrega el texto listo para copiar y pegar, sin explicaciones largas.
- Si no sabes algo o depende de un cambio en el código, dilo claro y sugiere escribirle a Andrés (el programador).

Cuando pregunte CÓMO hacer algo del panel, respóndele con los pasos concretos: en qué sección del menú entrar, qué botón pulsar y qué campo llenar, con los nombres exactos que aparecen en pantalla. Usa únicamente lo que dice el manual de abajo; si algo no está ahí, di que no estás seguro y que le pregunte a Andrés, en vez de inventarte un botón que no existe.

────────────── MANUAL DEL PANEL ──────────────
${PANEL_CONTEXT}
──────────────────────────────────────────────

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

  // Al recortar el historial, el primer mensaje puede quedar siendo una
  // respuesta del ayudante. Gemini rechaza una conversación que empieza así
  // (400), y para el resto de proveedores tampoco aporta: se descartan esas
  // respuestas sueltas del principio hasta que la charla arranque con una
  // pregunta de la dueña.
  const recortado = out.slice(-MAX_HISTORY)
  const inicio = recortado.findIndex((m) => m.role === "user")
  return recortado.slice(inicio)
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

  const geminiKey = process.env.GEMINI_API_KEY
  if (!hasAnyAIProvider() && !geminiKey) {
    return NextResponse.json({ error: SIN_PROVEEDOR, needsKey: true }, { status: 503 })
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

  // 1) Cadena principal: los mismos proveedores del asesor de WhatsApp.
  if (hasAnyAIProvider()) {
    try {
      const reply = await botReply({
        system: SYSTEM_PROMPT,
        messages: messages as AIMessage[],
        maxOutputTokens: 700,
        temperature: 0.7,
      })
      return NextResponse.json({ reply })
    } catch (err) {
      console.warn("[admin/assistant] cadena principal:", err instanceof Error ? err.message : err)
    }
  }

  // 2) Respaldo opcional: Gemini, solo si hay clave configurada.
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const reply = await askGemini(model, geminiKey, messages)
        return NextResponse.json({ reply })
      } catch (err) {
        console.warn("[admin/assistant] gemini:", err instanceof Error ? err.message : err)
      }
    }
  }

  return NextResponse.json(
    { error: "No pude responder en este momento. Intenta de nuevo en un minuto." },
    { status: 502 }
  )
}
