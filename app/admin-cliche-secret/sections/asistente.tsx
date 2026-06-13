"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  MessageCircle, Settings, Smartphone, RefreshCw, Send, Save, Upload, Plus, Trash2,
  Bot, User, Pause, Play, FileText, CheckCircle2, AlertCircle, Power,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-client"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Conversation {
  phone: string
  name: string | null
  profile_pic_url: string | null
  handoff: boolean
  unread: number
  last_seen: string
  last_message: string
  last_direction: string
  last_at: string
}
interface Message {
  id: string
  direction: "in" | "out"
  role: string
  body: string
  media_url: string | null
  media_type: string | null
  created_at: string
}
interface BotConfig {
  advisor_name: string
  system_prompt: string
  greeting: string
  bot_enabled: boolean
  followups_enabled: boolean
  catalog_pdf_url: string | null
  store_address: string
  store_hours: string
  store_city: string
  store_maps_url: string
  wasender_api_key: string | null
  wasender_webhook_secret: string | null
}
interface Faq {
  id: string
  question: string
  answer: string
  enabled: boolean
  sort_order: number
}

type Tab = "conversaciones" | "configuracion" | "conexion"

const BROWN = "#2D1A14"
const ACCENT = "#A67163"

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function AsistenteSection() {
  const [tab, setTab] = useState<Tab>("conversaciones")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: BROWN }}>Asistente WhatsApp</h2>
        <p className="text-sm mt-0.5" style={{ color: `${BROWN}80` }}>
          Tu asesora virtual responde, recomienda y vende por WhatsApp — conectada al catálogo en vivo.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl border w-fit" style={{ borderColor: `${BROWN}14`, background: "white" }}>
        {([
          ["conversaciones", "Conversaciones", MessageCircle],
          ["configuracion", "Configuración", Settings],
          ["conexion", "Número conectado", Smartphone],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={tab === id ? { background: BROWN, color: "white" } : { color: `${BROWN}99` }}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "conversaciones" && <ConversacionesTab />}
      {tab === "configuracion" && <ConfiguracionTab />}
      {tab === "conexion" && <ConexionTab />}
    </div>
  )
}

// ── Pestaña: Conversaciones ─────────────────────────────────────────────────────
function ConversacionesTab() {
  const [convos, setConvos] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConvos = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/bot/conversations")
      const { conversations } = await res.json()
      setConvos(conversations || [])
    } catch { /* noop */ } finally { setLoading(false) }
  }, [])

  const loadMessages = useCallback(async (phone: string) => {
    try {
      const res = await adminFetch(`/api/admin/bot/messages?phone=${phone}`)
      const { messages } = await res.json()
      setMessages(messages || [])
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50)
    } catch { /* noop */ }
  }, [])

  useEffect(() => { loadConvos() }, [loadConvos])
  useEffect(() => {
    if (!selected) return
    loadMessages(selected)
    const t = setInterval(() => { loadMessages(selected); loadConvos() }, 15000)
    return () => clearInterval(t)
  }, [selected, loadMessages, loadConvos])

  const current = convos.find((c) => c.phone === selected)

  async function sendReply() {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      await adminFetch("/api/admin/bot/messages", { method: "POST", body: JSON.stringify({ phone: selected, text: reply.trim() }) })
      setReply("")
      await loadMessages(selected)
      await loadConvos()
    } finally { setSending(false) }
  }

  async function toggleHandoff() {
    if (!current) return
    await adminFetch("/api/admin/bot/messages", { method: "PATCH", body: JSON.stringify({ phone: current.phone, handoff: !current.handoff }) })
    await loadConvos()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[600px]">
      {/* Lista */}
      <div className="bg-white rounded-2xl border flex flex-col overflow-hidden" style={{ borderColor: `${BROWN}14` }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: `${BROWN}10` }}>
          <p className="font-semibold text-sm" style={{ color: BROWN }}>Conversaciones</p>
          <button onClick={loadConvos} className="p-1.5 rounded-lg hover:bg-[#FAF8F5]"><RefreshCw className="w-3.5 h-3.5" style={{ color: `${BROWN}80` }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: ACCENT }} /></div>
          ) : convos.length === 0 ? (
            <p className="p-6 text-center text-xs" style={{ color: `${BROWN}60` }}>Aún no hay conversaciones. Aparecerán aquí cuando alguien escriba al WhatsApp.</p>
          ) : convos.map((c) => (
            <button
              key={c.phone}
              onClick={() => setSelected(c.phone)}
              className="w-full text-left px-4 py-3 border-b flex items-start gap-3 hover:bg-[#FAF8F5] transition-colors"
              style={{ borderColor: `${BROWN}08`, background: selected === c.phone ? "#FAF8F5" : "white" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${ACCENT}22` }}>
                <User className="w-4 h-4" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: BROWN }}>{c.name || `+${c.phone}`}</p>
                  {c.unread > 0 && <span className="text-[10px] font-bold text-white px-1.5 rounded-full" style={{ background: ACCENT }}>{c.unread}</span>}
                </div>
                <p className="text-xs truncate" style={{ color: `${BROWN}70` }}>{c.last_message || "—"}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {c.handoff
                    ? <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "#fde68a", color: "#92400e" }}>Humano</span>
                    : <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: `${ACCENT}1a`, color: ACCENT }}><Bot className="w-2.5 h-2.5" /> Bot</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white rounded-2xl border flex flex-col overflow-hidden" style={{ borderColor: `${BROWN}14` }}>
        {!current ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="w-10 h-10 mb-3" style={{ color: `${BROWN}30` }} />
            <p className="text-sm" style={{ color: `${BROWN}60` }}>Selecciona una conversación para ver los mensajes</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: `${BROWN}10` }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: BROWN }}>{current.name || `+${current.phone}`}</p>
                <p className="text-[11px]" style={{ color: `${BROWN}60` }}>+{current.phone}</p>
              </div>
              <button
                onClick={toggleHandoff}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={current.handoff ? { borderColor: ACCENT, color: ACCENT } : { borderColor: `${BROWN}20`, color: `${BROWN}80` }}
              >
                {current.handoff ? <><Play className="w-3.5 h-3.5" /> Reanudar bot</> : <><Pause className="w-3.5 h-3.5" /> Pausar bot</>}
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "#FAF8F5" }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words"
                    style={m.direction === "out"
                      ? { background: BROWN, color: "white", borderBottomRightRadius: 4 }
                      : { background: "white", color: BROWN, border: `1px solid ${BROWN}12`, borderBottomLeftRadius: 4 }}
                  >
                    {m.media_type === "document" && <span className="flex items-center gap-1.5 text-xs opacity-80 mb-1"><FileText className="w-3.5 h-3.5" /> Documento</span>}
                    {m.body}
                    <div className="text-[9px] mt-1 opacity-50">{fmtTime(m.created_at)}{m.role === "agent" ? " · tú" : m.direction === "out" ? " · bot" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: `${BROWN}10` }}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                placeholder="Escribe una respuesta… (toma el control del bot)"
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${BROWN}20`, background: "#FAF8F5", color: BROWN }}
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
                style={{ background: BROWN }}
              >
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Pestaña: Configuración ───────────────────────────────────────────────────────
function ConfiguracionTab() {
  const [cfg, setCfg] = useState<BotConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" })
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [c, f] = await Promise.all([
      adminFetch("/api/admin/bot/config").then((r) => r.json()),
      adminFetch("/api/admin/bot/faqs").then((r) => r.json()),
    ])
    setCfg(c.config)
    setFaqs(f.faqs || [])
  }, [])
  useEffect(() => { load() }, [load])

  function set<K extends keyof BotConfig>(k: K, v: BotConfig[K]) {
    setCfg((p) => (p ? { ...p, [k]: v } : p))
  }

  async function save() {
    if (!cfg) return
    setSaving(true)
    try {
      await adminFetch("/api/admin/bot/config", { method: "POST", body: JSON.stringify(cfg) })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  async function uploadCatalog(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await adminFetch("/api/admin/bot/catalog", { method: "POST", body: fd })
      const { url, error } = await res.json()
      if (url) set("catalog_pdf_url", url)
      else alert(error || "No se pudo subir el PDF")
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = "" }
  }

  async function regenerate() {
    setGenerating(true)
    try {
      const res = await adminFetch("/api/admin/bot/catalog/generate", { method: "POST" })
      const { url, error } = await res.json()
      if (url) set("catalog_pdf_url", url)
      else alert(error || "No se pudo generar el catálogo")
    } finally { setGenerating(false) }
  }

  async function addFaq() {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return
    await adminFetch("/api/admin/bot/faqs", { method: "POST", body: JSON.stringify(newFaq) })
    setNewFaq({ question: "", answer: "" })
    const f = await adminFetch("/api/admin/bot/faqs").then((r) => r.json())
    setFaqs(f.faqs || [])
  }
  async function delFaq(id: string) {
    await adminFetch(`/api/admin/bot/faqs?id=${id}`, { method: "DELETE" })
    setFaqs((p) => p.filter((x) => x.id !== id))
  }

  if (!cfg) return <div className="p-6"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: ACCENT }} /></div>

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
  const inputStyle = { borderColor: `${BROWN}26`, background: "#FAF8F5", color: BROWN } as const
  const labelCls = "text-xs font-semibold uppercase tracking-widest mb-1.5 block"
  const card = "bg-white rounded-2xl border p-6 space-y-5"

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toggles principales */}
      <div className={card} style={{ borderColor: `${BROWN}14` }}>
        <h3 className="text-sm font-semibold" style={{ color: BROWN }}>Estado del asistente</h3>
        {[
          ["bot_enabled", "Bot activo", "El asesor responde automáticamente los mensajes entrantes"],
          ["followups_enabled", "Follow-ups", "Re-engancha a quienes no responden (~24h después)"],
        ].map(([key, label, desc]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: BROWN }}>{label}</p>
              <p className="text-xs" style={{ color: `${BROWN}60` }}>{desc}</p>
            </div>
            <button
              onClick={() => set(key as keyof BotConfig, !cfg[key as "bot_enabled"] as never)}
              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
              style={{ background: cfg[key as "bot_enabled"] ? ACCENT : `${BROWN}26` }}
            >
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: cfg[key as "bot_enabled"] ? "translateX(20px)" : "none" }} />
            </button>
          </div>
        ))}
      </div>

      {/* Personalidad del asesor */}
      <div className={card} style={{ borderColor: `${BROWN}14` }}>
        <h3 className="text-sm font-semibold" style={{ color: BROWN }}>La asesora</h3>
        <div>
          <label className={labelCls} style={{ color: `${BROWN}80` }}>Nombre del asesor/a</label>
          <input className={inputCls} style={inputStyle} value={cfg.advisor_name || ""} onChange={(e) => set("advisor_name", e.target.value)} placeholder="Valentina" />
        </div>
        <div>
          <label className={labelCls} style={{ color: `${BROWN}80` }}>Saludo inicial</label>
          <input className={inputCls} style={inputStyle} value={cfg.greeting || ""} onChange={(e) => set("greeting", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} style={{ color: `${BROWN}80` }}>Instrucciones adicionales (tono, reglas del negocio)</label>
          <textarea rows={4} className={inputCls} style={inputStyle} value={cfg.system_prompt || ""} onChange={(e) => set("system_prompt", e.target.value)} placeholder="Ej: enfatiza los aromas para marcas femeninas, ofrece el combo de 3 con descuento…" />
        </div>
      </div>

      {/* Local / tienda */}
      <div className={card} style={{ borderColor: `${BROWN}14` }}>
        <h3 className="text-sm font-semibold" style={{ color: BROWN }}>Información del local</h3>
        {([
          ["store_address", "Dirección del local"],
          ["store_hours", "Horario de atención"],
          ["store_city", "Ciudad"],
          ["store_maps_url", "Link de Google Maps"],
        ] as const).map(([k, label]) => (
          <div key={k}>
            <label className={labelCls} style={{ color: `${BROWN}80` }}>{label}</label>
            <input className={inputCls} style={inputStyle} value={(cfg[k] as string) || ""} onChange={(e) => set(k, e.target.value as never)} />
          </div>
        ))}
      </div>

      {/* Catálogo PDF */}
      <div className={card} style={{ borderColor: `${BROWN}14` }}>
        <h3 className="text-sm font-semibold" style={{ color: BROWN }}>Catálogo en PDF</h3>
        <p className="text-xs" style={{ color: `${BROWN}60` }}>El bot lo envía cuando alguien pide el catálogo o la lista de precios.</p>
        {cfg.catalog_pdf_url && (
          <a href={cfg.catalog_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium" style={{ color: ACCENT }}>
            <FileText className="w-4 h-4" /> Ver catálogo actual
          </a>
        )}
        <input ref={fileRef} type="file" accept="application/pdf" onChange={uploadCatalog} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <button onClick={regenerate} disabled={generating} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: ACCENT }}>
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generar catálogo con tus aromas
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-50" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Subir uno propio
          </button>
        </div>
      </div>

      {/* FAQs */}
      <div className={card} style={{ borderColor: `${BROWN}14` }}>
        <h3 className="text-sm font-semibold" style={{ color: BROWN }}>Preguntas frecuentes</h3>
        {faqs.map((f) => (
          <div key={f.id} className="flex items-start justify-between gap-3 py-2 border-b" style={{ borderColor: `${BROWN}08` }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: BROWN }}>{f.question}</p>
              <p className="text-xs" style={{ color: `${BROWN}70` }}>{f.answer}</p>
            </div>
            <button onClick={() => delFaq(f.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
          </div>
        ))}
        <div className="space-y-2 pt-2">
          <input className={inputCls} style={inputStyle} placeholder="Pregunta (ej: ¿Hacen envíos nacionales?)" value={newFaq.question} onChange={(e) => setNewFaq((p) => ({ ...p, question: e.target.value }))} />
          <textarea rows={2} className={inputCls} style={inputStyle} placeholder="Respuesta" value={newFaq.answer} onChange={(e) => setNewFaq((p) => ({ ...p, answer: e.target.value }))} />
          <button onClick={addFaq} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
            <Plus className="w-4 h-4" /> Agregar FAQ
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: BROWN }}>
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Cambios guardados" : "Guardar configuración"}
      </button>
    </div>
  )
}

// ── Pestaña: Número conectado ───────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: "Conectado", color: "#16a34a", bg: "#dcfce7" },
  connecting: { label: "Conectando…", color: "#ca8a04", bg: "#fef9c3" },
  need_scan: { label: "Falta escanear QR", color: "#ca8a04", bg: "#fef9c3" },
  disconnected: { label: "Desconectado", color: "#dc2626", bg: "#fee2e2" },
  logged_out: { label: "Sesión cerrada", color: "#dc2626", bg: "#fee2e2" },
  expired: { label: "Sesión expirada", color: "#dc2626", bg: "#fee2e2" },
}

function ConexionTab() {
  const [cfg, setCfg] = useState<BotConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const checkStatus = useCallback(async () => {
    setChecking(true)
    try {
      const { status } = await adminFetch("/api/admin/bot/status").then((r) => r.json())
      setStatus(status)
    } catch { setStatus(null) } finally { setChecking(false) }
  }, [])

  useEffect(() => {
    adminFetch("/api/admin/bot/config").then((r) => r.json()).then((d) => { setCfg(d.config); if (d.config?.wasender_api_key) checkStatus() })
    if (typeof window !== "undefined") setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp`)
  }, [checkStatus])

  async function save() {
    if (!cfg) return
    setSaving(true)
    try {
      await adminFetch("/api/admin/bot/config", {
        method: "POST",
        body: JSON.stringify({ wasender_api_key: cfg.wasender_api_key, wasender_webhook_secret: cfg.wasender_webhook_secret }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  if (!cfg) return <div className="p-6"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: ACCENT }} /></div>

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 font-mono"
  const inputStyle = { borderColor: `${BROWN}26`, background: "#FAF8F5", color: BROWN } as const
  const hasKey = !!cfg.wasender_api_key
  const st = status ? STATUS_LABEL[status] : null
  const tone = st ? st : hasKey ? { label: "Pulsa «Probar conexión»", color: "#ca8a04", bg: "#fef9c3" } : { label: "Sin conectar", color: "#dc2626", bg: "#fee2e2" }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl border p-6 flex items-center gap-4" style={{ borderColor: `${BROWN}14` }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tone.bg }}>
          <Power className="w-6 h-6" style={{ color: tone.color }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: BROWN }}>WhatsApp · {tone.label}</p>
          <p className="text-xs" style={{ color: `${BROWN}60` }}>{status === "connected" ? "El bot puede enviar y recibir mensajes." : hasKey ? "Verifica el estado en vivo de la sesión." : "Pega la API key de la sesión de WaSenderAPI para activarlo."}</p>
        </div>
        {hasKey && (
          <button onClick={checkStatus} disabled={checking} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-50" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
            {checking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Probar conexión
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: `${BROWN}14` }}>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: `${BROWN}80` }}>API Key de la sesión (WaSenderAPI)</label>
          <input className={inputCls} style={inputStyle} value={cfg.wasender_api_key || ""} onChange={(e) => setCfg({ ...cfg, wasender_api_key: e.target.value })} placeholder="wasender_..." />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: `${BROWN}80` }}>Webhook secret (opcional)</label>
          <input className={inputCls} style={inputStyle} value={cfg.wasender_webhook_secret || ""} onChange={(e) => setCfg({ ...cfg, wasender_webhook_secret: e.target.value })} placeholder="opcional" />
        </div>
        <button onClick={save} disabled={saving} className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: BROWN }}>
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Guardado" : "Guardar conexión"}
        </button>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}10` }}>
        <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" style={{ color: ACCENT }} /><p className="text-sm font-semibold" style={{ color: BROWN }}>Cómo conectar el WhatsApp de Cliché</p></div>
        <ol className="text-xs space-y-1.5 list-decimal pl-4" style={{ color: `${BROWN}90` }}>
          <li>En <span className="font-mono">wasenderapi.com/dashboard</span>, conecta el número de Cliché escaneando el QR.</li>
          <li>Copia la <b>API key</b> de esa sesión y pégala arriba.</li>
          <li>En la configuración del webhook de esa sesión, pega esta URL:</li>
        </ol>
        <code className="block mt-2 px-3 py-2 rounded-lg text-[11px] break-all" style={{ background: "white", color: BROWN, border: `1px solid ${BROWN}14` }}>{webhookUrl}</code>
        <p className="text-[11px] mt-2" style={{ color: `${BROWN}70` }}>Activa los eventos <b>messages.received</b> y <b>session.status</b>.</p>
      </div>
    </div>
  )
}
