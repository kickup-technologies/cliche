"use client"

/**
 * Burbuja flotante de ayuda del panel admin.
 *
 * Abajo a la derecha aparece un botoncito con forma de mensaje. Al pulsarlo se
 * abre un chat compacto donde la dueña puede preguntar cualquier cosa: cómo usar
 * el panel, ideas de SEO, cómo redactar la descripción de un aroma…
 *
 * Habla con /api/admin/assistant (Google Gemini, capa gratuita). Si la clave no
 * está configurada, el chat lo dice con claridad en vez de fallar en silencio.
 */

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, RefreshCw, Sparkles } from "lucide-react"
import { adminFetch } from "@/lib/admin-client"

const BROWN = "#2D1A14"
const ACCENT = "#A67163"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SALUDO: ChatMessage = {
  role: "assistant",
  content:
    "¡Hola! Soy tu ayudante del panel. Pregúntame lo que necesites: cómo publicar un producto, qué escribir en el SEO, ideas para describir un aroma… Te respondo en cortito.",
}

const SUGERENCIAS = [
  "¿Cómo subo un producto nuevo?",
  "Escríbeme una descripción para un aroma a vainilla",
  "¿Qué pongo en el meta título de la página de catálogo?",
]

export function ChatAyuda() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([SALUDO])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Bajar siempre al último mensaje
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Escape cierra el chat
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  async function send(text: string) {
    const pregunta = text.trim()
    if (!pregunta || sending) return

    const historial = [...messages, { role: "user" as const, content: pregunta }]
    setMessages(historial)
    setInput("")
    setSending(true)

    try {
      const res = await adminFetch("/api/admin/assistant", {
        method: "POST",
        // El saludo inicial no se manda: no aporta y gasta cupo gratuito.
        body: JSON.stringify({ messages: historial.filter((m) => m !== SALUDO) }),
      })
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string }
      const reply =
        data.reply ||
        data.error ||
        "No pude responder en este momento. Intenta de nuevo en un minuto."
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Se cayó la conexión. Revisa tu internet e intenta otra vez." },
      ])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      {/* Botón burbuja */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar la ayuda" : "Abrir la ayuda"}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{ background: BROWN }}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Panel del chat */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] h-[min(30rem,calc(100vh-7rem))] bg-white rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{ borderColor: `${BROWN}1a` }}
        >
          {/* Encabezado */}
          <div
            className="px-4 py-3 flex items-center gap-2.5 flex-shrink-0"
            style={{ background: BROWN }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${ACCENT}` }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Ayudante del panel</p>
              <p className="text-[11px] text-white/60 leading-tight">Pregúntame lo que sea</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: "#FAF8F5" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                  style={
                    m.role === "user"
                      ? { background: BROWN, color: "white", borderBottomRightRadius: 4 }
                      : { background: "white", color: BROWN, border: `1px solid ${BROWN}12`, borderBottomLeftRadius: 4 }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-2xl flex items-center gap-2 text-[13px]"
                  style={{ background: "white", color: `${BROWN}80`, border: `1px solid ${BROWN}12` }}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pensando…
                </div>
              </div>
            )}

            {/* Sugerencias solo mientras no ha preguntado nada */}
            {messages.length === 1 && !sending && (
              <div className="pt-1 space-y-1.5">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left px-3 py-2 rounded-xl text-[12px] bg-white border hover:bg-[#FFFDFB] transition-colors"
                    style={{ borderColor: `${BROWN}14`, color: `${BROWN}99` }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Escribir */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="p-2.5 border-t flex items-center gap-2 flex-shrink-0"
            style={{ borderColor: `${BROWN}10` }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="flex-1 px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2"
              style={{ borderColor: `${BROWN}1f`, background: "#FAF8F5", color: BROWN }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
              style={{ background: BROWN }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
