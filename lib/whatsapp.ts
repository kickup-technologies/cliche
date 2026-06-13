// ── WhatsApp vía WaSenderAPI ──────────────────────────────────────────────────
// Docs: https://wasenderapi.com/api-docs
// Auth: Authorization: Bearer {SESSION_API_KEY}
//
// Single-tenant (solo Cliché): la API key de la sesión se lee de wa_bot_config
// y se pasa explícitamente a cada función; si falta, cae a WASENDER_API_KEY.
// Adaptado de kickuptech/lib/whatsapp.ts.

const WASENDER_BASE = "https://www.wasenderapi.com"

// ── Helpers anti-ban ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simula velocidad de tipeo humana: ~15 chars/seg, 1.5s–4.5s, con jitter. */
function typingDelay(text: string): number {
  const base = (text.length / 15) * 1000
  const clamped = Math.max(1500, Math.min(4500, base))
  return clamped + Math.random() * 600
}

/** Divide un mensaje en trozos naturales de ≤ maxChars (párrafos → frases). */
function chunkMessage(text: string, maxChars = 320): string[] {
  if (text.length <= maxChars) return [text]
  const result: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ""
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (current && (current + "\n\n" + trimmed).length > maxChars) {
      result.push(current.trim())
      current = trimmed
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed
    }
  }
  if (current.trim()) result.push(current.trim())

  const finalResult: string[] = []
  for (const chunk of result) {
    if (chunk.length <= maxChars) {
      finalResult.push(chunk)
      continue
    }
    const sentences = chunk.split(/(?<=[.!?])\s+/)
    let cur = ""
    for (const sent of sentences) {
      if (cur && (cur + " " + sent).length > maxChars) {
        finalResult.push(cur.trim())
        cur = sent
      } else {
        cur = cur ? cur + " " + sent : sent
      }
    }
    if (cur.trim()) finalResult.push(cur.trim())
  }
  return finalResult.length > 0 ? finalResult : [text]
}

function toE164(raw: string): string {
  if (raw.includes("@")) return raw
  const cleaned = raw.replace(/[\s\-().]/g, "")
  if (cleaned.startsWith("+")) return cleaned
  if (cleaned.length >= 11) return `+${cleaned}`
  return `+57${cleaned}` // Colombia por defecto
}

function resolveKey(apiKey?: string): string {
  return apiKey || process.env.WASENDER_API_KEY || ""
}

function wasenderHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
}

/** Ejecuta un fetch; reintenta una vez si WaSenderAPI responde 429. */
async function fetchWithRateRetry(url: string, init: RequestInit, label: string): Promise<boolean> {
  const attempt = () => fetch(url, init)
  let res = await attempt()
  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as { retry_after?: number }
    const wait = ((data.retry_after ?? 5) + 1) * 1000
    console.warn(`[WA] ${label} 429 — espera ${wait}ms y reintenta`)
    await sleep(wait)
    res = await attempt()
  }
  if (!res.ok) {
    console.error(`[WA] ${label} error`, res.status, await res.text().catch(() => ""))
    return false
  }
  return true
}

// ── Presencia (escribiendo…) ─────────────────────────────────────────────────

export async function sendPresenceUpdate(
  to: string,
  presence: "typing" | "recording" | "paused" | "available" | "unavailable",
  apiKey?: string,
): Promise<void> {
  const key = resolveKey(apiKey)
  if (!key) return
  try {
    await fetch(`${WASENDER_BASE}/api/send-presence-update`, {
      method: "POST",
      headers: wasenderHeaders(key),
      body: JSON.stringify({ to: toE164(to), presence }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* best-effort */
  }
}

// ── Envíos ──────────────────────────────────────────────────────────────────

export async function sendWhatsApp(to: string, text: string, apiKey?: string): Promise<boolean> {
  const key = resolveKey(apiKey)
  if (!key) {
    console.warn("[WA] sin API key — se omite envío")
    return false
  }
  if (!text.trim()) return false
  try {
    return await fetchWithRateRetry(
      `${WASENDER_BASE}/api/send-message`,
      { method: "POST", headers: wasenderHeaders(key), body: JSON.stringify({ to: toE164(to), text }) },
      "sendText",
    )
  } catch (e) {
    console.error("[WA] sendText falló:", e)
    return false
  }
}

/**
 * Envío "humano": espera proporcional a la longitud y parte mensajes largos en
 * trozos con pausas. Muestra el indicador "escribiendo…" entre trozos.
 */
export async function sendWhatsAppBotReply(to: string, text: string, apiKey?: string): Promise<void> {
  if (!text.trim()) return
  const chunks = chunkMessage(text)
  for (let i = 0; i < chunks.length; i++) {
    await sendPresenceUpdate(to, "typing", apiKey)
    await sleep(typingDelay(chunks[i]))
    await sendWhatsApp(to, chunks[i], apiKey)
    if (i < chunks.length - 1) await sleep(800 + Math.random() * 400)
  }
  await sendPresenceUpdate(to, "paused", apiKey)
}

export async function sendWhatsAppImage(to: string, imageUrl: string, caption = "", apiKey?: string): Promise<void> {
  const key = resolveKey(apiKey)
  if (!key) return
  try {
    await fetchWithRateRetry(
      `${WASENDER_BASE}/api/send-message`,
      {
        method: "POST",
        headers: wasenderHeaders(key),
        body: JSON.stringify({ to: toE164(to), imageUrl, ...(caption ? { text: caption } : {}) }),
      },
      "sendImage",
    )
  } catch (e) {
    console.error("[WA] sendImage falló:", e)
  }
}

export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  fileName: string,
  caption = "",
  apiKey?: string,
): Promise<void> {
  const key = resolveKey(apiKey)
  if (!key) return
  try {
    await fetchWithRateRetry(
      `${WASENDER_BASE}/api/send-message`,
      {
        method: "POST",
        headers: wasenderHeaders(key),
        body: JSON.stringify({ to: toE164(to), documentUrl, fileName, ...(caption ? { text: caption } : {}) }),
      },
      "sendDocument",
    )
  } catch (e) {
    console.error("[WA] sendDocument falló:", e)
  }
}

export async function sendWhatsAppLocation(
  to: string,
  location: { latitude: number; longitude: number; name?: string; address?: string },
  apiKey?: string,
): Promise<void> {
  const key = resolveKey(apiKey)
  if (!key) return
  try {
    await fetch(`${WASENDER_BASE}/api/send-message`, {
      method: "POST",
      headers: wasenderHeaders(key),
      body: JSON.stringify({ to: toE164(to), location }),
    })
  } catch (e) {
    console.error("[WA] sendLocation falló:", e)
  }
}

// ── Desencriptar media recibida ────────────────────────────────────────────────

export async function decryptWasenderMedia(
  messageId: string,
  mediaType: "imageMessage" | "audioMessage" | "videoMessage" | "documentMessage" | "stickerMessage",
  mediaInfo: Record<string, string>,
  apiKey?: string,
): Promise<string | null> {
  const key = resolveKey(apiKey)
  if (!key) return null
  try {
    const res = await fetch(`${WASENDER_BASE}/api/decrypt-media`, {
      method: "POST",
      headers: wasenderHeaders(key),
      body: JSON.stringify({ data: { messages: { key: { id: messageId }, message: { [mediaType]: mediaInfo } } } }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return (data?.publicUrl as string | null | undefined) ?? null
  } catch {
    return null
  }
}

// ── Info de contacto / perfil ──────────────────────────────────────────────────

export async function fetchWaContactInfo(
  phone: string,
  apiKey?: string,
): Promise<{ name: string | null; imgUrl: string | null } | null> {
  const key = resolveKey(apiKey)
  if (!key) return null
  const e164 = toE164(phone)
  const headers = { Authorization: `Bearer ${key}` }
  try {
    const [contactRes, picRes] = await Promise.allSettled([
      fetch(`${WASENDER_BASE}/api/contacts/${encodeURIComponent(e164)}`, { headers, signal: AbortSignal.timeout(6000) }),
      fetch(`${WASENDER_BASE}/api/contacts/profile-pic?phone=${encodeURIComponent(e164)}`, {
        headers,
        signal: AbortSignal.timeout(6000),
      }),
    ])
    const contactData =
      contactRes.status === "fulfilled" && contactRes.value.ok ? await contactRes.value.json().catch(() => null) : null
    const picData = picRes.status === "fulfilled" && picRes.value.ok ? await picRes.value.json().catch(() => null) : null
    const name = (contactData?.name ?? contactData?.displayName ?? contactData?.pushName ?? null) as string | null
    const imgUrl = (picData?.profilePicUrl ??
      picData?.picture ??
      picData?.url ??
      contactData?.profilePicUrl ??
      contactData?.picture ??
      null) as string | null
    if (!name && !imgUrl) return null
    return { name, imgUrl }
  } catch {
    return null
  }
}

/**
 * Estado de la sesión de WhatsApp (GET /api/status).
 * Devuelve: connecting | connected | disconnected | need_scan | logged_out | expired | null.
 */
export async function getSessionStatus(apiKey?: string): Promise<string | null> {
  const key = resolveKey(apiKey)
  if (!key) return null
  try {
    const res = await fetch(`${WASENDER_BASE}/api/status`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return (data?.status ?? data?.data?.status ?? null) as string | null
  } catch {
    return null
  }
}

/** Notifica al admin (número del dueño) — usa la key/ env por defecto. */
export async function waNotifyAdmin(text: string, apiKey?: string): Promise<void> {
  const admin = process.env.ADMIN_WHATSAPP
  if (!admin) return
  await sendWhatsApp(admin, text, apiKey)
}
