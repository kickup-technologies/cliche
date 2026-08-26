"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  MessageCircle, Settings, Smartphone, RefreshCw, Send, Save, Upload, Plus, Trash2,
  Bot, User, Pause, Play, FileText, CheckCircle2, AlertCircle, Power, QrCode,
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
  wasender_personal_token: string | null
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
  const [botEnabled, setBotEnabled] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  // Estado de la vinculación: sin número conectado, la sección completa se
  // reemplaza por la pantalla de conexión (ConnectGate).
  const [conn, setConn] = useState<"loading" | "connected" | "offline">("loading")

  useEffect(() => {
    let alive = true
    adminFetch("/api/admin/bot/status")
      .then((r) => r.json())
      .then(({ status, configured }) => {
        if (alive) setConn(configured && status === "connected" ? "connected" : "offline")
      })
      .catch(() => { if (alive) setConn("offline") })
    adminFetch("/api/admin/bot/config")
      .then((r) => r.json())
      .then(({ config }) => { if (alive && config) setBotEnabled(!!config.bot_enabled) })
      .catch(() => { /* noop */ })
    return () => { alive = false }
  }, [])

  // Vigila la sesión mientras está conectada: si el número se desvincula, la
  // sección vuelve sola a la pantalla de conexión. Se exigen 2 lecturas
  // seguidas sin conexión para no expulsar por un fallo transitorio de red.
  const offlineStrikes = useRef(0)
  useEffect(() => {
    if (conn !== "connected") return
    offlineStrikes.current = 0
    const t = setInterval(async () => {
      try {
        const { status, configured } = await adminFetch("/api/admin/bot/status").then((r) => r.json())
        if (configured && status === "connected") {
          offlineStrikes.current = 0
        } else if (["disconnected", "logged_out", "expired", "need_scan"].includes(status) || !configured) {
          // Desconexión confirmada por WaSenderAPI → volver a la pantalla de conexión.
          setConn("offline")
        } else {
          // status null/desconocido (p. ej. WaSender no respondió): tolerar 2 veces.
          offlineStrikes.current += 1
          if (offlineStrikes.current >= 2) setConn("offline")
        }
      } catch {
        /* error de red del navegador: no cambiar nada */
      }
    }, 20000)
    return () => clearInterval(t)
  }, [conn])

  // Interruptor maestro: apaga/enciende las respuestas automáticas sin tocar
  // la conexión de WhatsApp. Apagado, los mensajes se siguen guardando.
  async function toggleBot() {
    if (botEnabled === null || toggling) return
    const next = !botEnabled
    setToggling(true)
    setBotEnabled(next)
    try {
      const res = await adminFetch("/api/admin/bot/config", { method: "POST", body: JSON.stringify({ bot_enabled: next }) })
      if (!res.ok) setBotEnabled(!next)
    } catch {
      setBotEnabled(!next)
    } finally { setToggling(false) }
  }

  if (conn === "loading") {
    return (
      <div className="p-10 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    )
  }

  if (conn === "offline") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: BROWN }}>Asistente WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: `${BROWN}80` }}>
            Tu asesora virtual responde, recomienda y vende por WhatsApp — conectada al catálogo en vivo.
          </p>
        </div>
        <ConnectGate onConnected={() => { setConn("connected"); setTab("conversaciones") }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: BROWN }}>Asistente WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: `${BROWN}80` }}>
            Tu asesora virtual responde, recomienda y vende por WhatsApp — conectada al catálogo en vivo.
          </p>
        </div>
        {botEnabled !== null && (
          <button
            onClick={toggleBot}
            disabled={toggling}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-colors disabled:opacity-60"
            style={botEnabled
              ? { borderColor: "#16a34a40", background: "#f0fdf4" }
              : { borderColor: `${BROWN}20`, background: "white" }}
            title={botEnabled ? "Pulsa para apagar las respuestas automáticas" : "Pulsa para encender las respuestas automáticas"}
          >
            <Power className="w-4 h-4" style={{ color: botEnabled ? "#16a34a" : "#dc2626" }} />
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight" style={{ color: BROWN }}>
                {botEnabled ? "Asistente encendido" : "Asistente apagado"}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: `${BROWN}60` }}>
                {botEnabled ? "Responde automáticamente" : "Los mensajes se guardan, nadie recibe respuesta"}
              </p>
            </div>
            <div className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: botEnabled ? "#16a34a" : `${BROWN}26` }}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: botEnabled ? "translateX(20px)" : "none" }} />
            </div>
          </button>
        )}
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
      {tab === "conexion" && <ConexionTab onConnected={() => setTab("conversaciones")} />}
    </div>
  )
}

// ── Pantalla de conexión (sin número vinculado) ────────────────────────────────
// Reemplaza toda la sección hasta que el WhatsApp de la tienda quede conectado:
// mensaje profesional → botón → QR → confirmación → interfaz completa.
function ConnectGate({ onConnected }: { onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrSession, setQrSession] = useState<{ id: number; name: string | null; phone_number: string | null } | null>(null)
  const [justConnected, setJustConnected] = useState(false)
  const [needToken, setNeedToken] = useState(false)
  const [token, setToken] = useState("")
  const [savingToken, setSavingToken] = useState(false)

  const handleConnected = useCallback(() => {
    setQr(null)
    setJustConnected(true)
    setTimeout(onConnected, 1800)
  }, [onConnected])

  const fetchQr = useCallback(async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const res = await adminFetch("/api/admin/bot/qr", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setQr(null)
        setQrError(data.error || "No se pudo obtener el código QR")
        if (data.needToken) setNeedToken(true)
        return
      }
      setQrSession(data.session || null)
      if (data.status === "connected") { handleConnected(); return }
      setQr(data.qr)
    } catch {
      setQr(null); setQrError("Error de red obteniendo el código QR")
    } finally { setQrLoading(false) }
  }, [handleConnected])

  // QR visible: renovarlo cada 30s y vigilar cada 4s si ya fue escaneado.
  useEffect(() => {
    if (!qr) return
    const renew = setInterval(fetchQr, 30000)
    const watch = setInterval(async () => {
      try {
        const { status } = await adminFetch("/api/admin/bot/status").then((r) => r.json())
        if (status === "connected") handleConnected()
      } catch { /* noop */ }
    }, 4000)
    return () => { clearInterval(renew); clearInterval(watch) }
  }, [qr, fetchQr, handleConnected])

  async function saveToken() {
    if (!token.trim()) return
    setSavingToken(true)
    try {
      await adminFetch("/api/admin/bot/config", { method: "POST", body: JSON.stringify({ wasender_personal_token: token.trim() }) })
      setNeedToken(false)
      setQrError(null)
      await fetchQr()
    } finally { setSavingToken(false) }
  }

  if (justConnected) {
    return (
      <div className="bg-white rounded-2xl border p-10 flex flex-col items-center text-center gap-3" style={{ borderColor: "#16a34a40", background: "#f0fdf4" }}>
        <CheckCircle2 className="w-10 h-10" style={{ color: "#16a34a" }} />
        <p className="font-serif text-xl font-bold" style={{ color: "#166534" }}>¡WhatsApp conectado!</p>
        <p className="text-sm" style={{ color: "#166534" }}>Tu asistente ya está en línea. Abriendo las conversaciones…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border p-8 sm:p-12 flex flex-col items-center text-center" style={{ borderColor: `${BROWN}14` }}>
      {!qr ? (
        <>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${ACCENT}1a` }}>
            <Smartphone className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h3 className="font-serif text-xl font-bold mb-2" style={{ color: BROWN }}>Conecta el WhatsApp de tu tienda</h3>
          <p className="text-sm max-w-md mb-6" style={{ color: `${BROWN}70` }}>
            Vincula el número de la tienda para activar a tu asesora virtual: atiende, recomienda
            y vende por ti las 24 horas, conectada al catálogo y los precios en vivo.
          </p>
          <button
            onClick={fetchQr}
            disabled={qrLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: BROWN }}
          >
            {qrLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            {qrLoading ? "Preparando código…" : "Conectar mi número"}
          </button>
        </>
      ) : (
        <>
          <h3 className="font-serif text-xl font-bold mb-1" style={{ color: BROWN }}>Escanea el código</h3>
          <p className="text-xs mb-4 max-w-md" style={{ color: `${BROWN}70` }}>
            En el celular con el número de la tienda: <b>WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo</b>.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR para vincular WhatsApp" className="w-64 h-64 rounded-xl border" style={{ borderColor: `${BROWN}14` }} />
          {qrSession && (
            <p className="text-xs mt-3" style={{ color: `${BROWN}70` }}>
              Sesión: <b>{qrSession.name || `#${qrSession.id}`}</b>{qrSession.phone_number ? ` · ${qrSession.phone_number}` : ""}
            </p>
          )}
          <p className="text-[11px] mt-2" style={{ color: `${BROWN}60` }}>
            El código se renueva solo. Al escanearlo, esta pantalla continuará automáticamente.
          </p>
          <button onClick={fetchQr} disabled={qrLoading} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-50" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? "animate-spin" : ""}`} /> Actualizar código
          </button>
        </>
      )}

      {qrError && (
        <p className="text-xs flex items-center gap-1.5 mt-4" style={{ color: "#dc2626" }}><AlertCircle className="w-3.5 h-3.5" /> {qrError}</p>
      )}

      {needToken && (
        <div className="mt-5 w-full max-w-md text-left space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest block" style={{ color: `${BROWN}80` }}>Token personal (WaSenderAPI)</label>
          <input
            className="w-full px-4 py-3 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2"
            style={{ borderColor: `${BROWN}26`, background: "#FAF8F5", color: BROWN }}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Se crea en wasenderapi.com → API Tokens"
          />
          <button onClick={saveToken} disabled={savingToken || !token.trim()} className="w-full h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: ACCENT }}>
            {savingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar y continuar
          </button>
        </div>
      )}
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

function ConexionTab({ onConnected }: { onConnected?: () => void }) {
  const [cfg, setCfg] = useState<BotConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrSession, setQrSession] = useState<{ id: number; name: string | null; phone_number: string | null } | null>(null)
  const [justConnected, setJustConnected] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [connectedPhone, setConnectedPhone] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    setChecking(true)
    try {
      const { status, phone } = await adminFetch("/api/admin/bot/status").then((r) => r.json())
      setStatus(status)
      setConnectedPhone(phone || null)
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
        body: JSON.stringify({
          wasender_api_key: cfg.wasender_api_key,
          wasender_webhook_secret: cfg.wasender_webhook_secret,
          wasender_personal_token: cfg.wasender_personal_token,
        }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const handleConnected = useCallback(() => {
    setQr(null)
    setStatus("connected")
    setJustConnected(true)
    // Deja ver la confirmación un momento y pasa directo a las conversaciones.
    setTimeout(() => onConnected?.(), 1800)
  }, [onConnected])

  const fetchQr = useCallback(async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const res = await adminFetch("/api/admin/bot/qr", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setQr(null)
        setQrError(data.error || "No se pudo obtener el QR")
        if (data.needToken) setShowAdvanced(true)
        return
      }
      setQrSession(data.session || null)
      if (data.status === "connected") {
        handleConnected()
        return
      }
      setQr(data.qr)
    } catch {
      setQr(null); setQrError("Error de red obteniendo el QR")
    } finally { setQrLoading(false) }
  }, [handleConnected])

  // Mientras el QR está visible: renovarlo cada 30s (caducan rápido) y
  // vigilar cada 4s si ya se escaneó para cerrar el flujo solo.
  useEffect(() => {
    if (!qr) return
    const renew = setInterval(fetchQr, 30000)
    const watch = setInterval(async () => {
      try {
        const { status } = await adminFetch("/api/admin/bot/status").then((r) => r.json())
        if (status === "connected") handleConnected()
      } catch { /* noop */ }
    }, 4000)
    return () => { clearInterval(renew); clearInterval(watch) }
  }, [qr, fetchQr, handleConnected])

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
          <p className="font-semibold text-sm" style={{ color: BROWN }}>
            WhatsApp · {tone.label}{status === "connected" && connectedPhone ? ` · +${connectedPhone}` : ""}
          </p>
          <p className="text-xs" style={{ color: `${BROWN}60` }}>{status === "connected" ? "El bot puede enviar y recibir mensajes." : hasKey ? "Verifica el estado en vivo de la sesión." : "Pulsa «Conectar WhatsApp» y escanea el código con el celular de la tienda."}</p>
        </div>
        {hasKey && (
          <button onClick={checkStatus} disabled={checking} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-50" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
            {checking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Probar conexión
          </button>
        )}
      </div>

      {/* Confirmación al escanear */}
      {justConnected && (
        <div className="bg-white rounded-2xl border p-6 flex items-center gap-3" style={{ borderColor: "#16a34a40", background: "#f0fdf4" }}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#16a34a" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#166534" }}>¡WhatsApp conectado!</p>
            <p className="text-xs" style={{ color: "#166534" }}>Abriendo las conversaciones del asistente…</p>
          </div>
        </div>
      )}

      {/* Vincular por QR */}
      {status !== "connected" && (
        <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: `${BROWN}14` }}>
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: ACCENT }} />
            <h3 className="text-sm font-semibold" style={{ color: BROWN }}>Conectar el WhatsApp de la tienda</h3>
          </div>
          {qr ? (
            <div className="flex flex-col items-center gap-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Código QR para vincular WhatsApp" className="w-64 h-64 rounded-xl border" style={{ borderColor: `${BROWN}14` }} />
              {qrSession && (
                <p className="text-xs" style={{ color: `${BROWN}70` }}>
                  Sesión: <b>{qrSession.name || `#${qrSession.id}`}</b>{qrSession.phone_number ? ` · ${qrSession.phone_number}` : ""}
                </p>
              )}
              <div className="text-[11px] text-center space-y-1" style={{ color: `${BROWN}70` }}>
                <p>En el celular con la SIM de la tienda: <b>WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo</b> y escanea este código.</p>
                <p>El código se renueva solo. Al escanearlo, esta pantalla te llevará a las conversaciones.</p>
              </div>
              <button onClick={fetchQr} disabled={qrLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border disabled:opacity-50" style={{ borderColor: `${BROWN}20`, color: BROWN }}>
                <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? "animate-spin" : ""}`} /> Actualizar QR
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs" style={{ color: `${BROWN}60` }}>
                Pulsa el botón, escanea el código con el celular del número de la tienda y listo — el asistente queda funcionando solo.
              </p>
              <button
                onClick={fetchQr}
                disabled={qrLoading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: ACCENT }}
              >
                {qrLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {qrLoading ? "Preparando código…" : "Conectar WhatsApp"}
              </button>
            </>
          )}
          {qrError && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "#dc2626" }}><AlertCircle className="w-3.5 h-3.5" /> {qrError}</p>
          )}
        </div>
      )}

      {/* Configuración avanzada (solo para soporte técnico) */}
      <div className="bg-white rounded-2xl border" style={{ borderColor: `${BROWN}14` }}>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-sm font-semibold" style={{ color: BROWN }}>Configuración avanzada</span>
          <span className="text-xs" style={{ color: `${BROWN}60` }}>{showAdvanced ? "Ocultar" : "Mostrar"}</span>
        </button>
        {showAdvanced && (
          <div className="px-6 pb-6 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: `${BROWN}80` }}>Token personal (WaSenderAPI)</label>
              <input className={inputCls} style={inputStyle} value={cfg.wasender_personal_token || ""} onChange={(e) => setCfg({ ...cfg, wasender_personal_token: e.target.value })} placeholder="Se crea en wasenderapi.com → API Tokens" />
              <p className="text-[11px] mt-1" style={{ color: `${BROWN}60` }}>Permite generar el QR desde este panel. Se configura una sola vez.</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: `${BROWN}80` }}>API Key de la sesión (WaSenderAPI)</label>
              <input className={inputCls} style={inputStyle} value={cfg.wasender_api_key || ""} onChange={(e) => setCfg({ ...cfg, wasender_api_key: e.target.value })} placeholder="Se guarda sola al conectar por QR" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: `${BROWN}80` }}>Webhook secret (opcional)</label>
              <input className={inputCls} style={inputStyle} value={cfg.wasender_webhook_secret || ""} onChange={(e) => setCfg({ ...cfg, wasender_webhook_secret: e.target.value })} placeholder="Se guarda solo al conectar por QR" />
            </div>
            <div>
              <p className="text-[11px] mb-1" style={{ color: `${BROWN}60` }}>Webhook del bot (se configura solo al conectar):</p>
              <code className="block px-3 py-2 rounded-lg text-[11px] break-all" style={{ background: "#FAF8F5", color: BROWN, border: `1px solid ${BROWN}14` }}>{webhookUrl}</code>
            </div>
            <button onClick={save} disabled={saving} className="w-full h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: BROWN }}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Guardado" : "Guardar conexión"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
