import type { SupabaseClient } from "@supabase/supabase-js"

// ── Seguridad del bot: anti-ban de WhatsApp + anti-abuso ──────────────────────
// Filosofía: NO cortar conversaciones legítimas. Los límites son altos y solo
// frenan cuando el uso ya es claramente abuso (spam, inundación de mensajes,
// uso del canal para fines ajenos al negocio).

// Umbrales (generosos a propósito):
const FLOOD_WINDOW_MIN = 15 // ventana de control de inundación
const FLOOD_MAX = 35 // > 35 mensajes en 15 min de un mismo contacto = abuso
const DAILY_MAX = 250 // > 250 mensajes/día de un mismo contacto = abuso
const GLOBAL_SEND_PER_MIN = 45 // tope global de envíos salientes por minuto (anti-ban)

export interface AbuseResult {
  blocked: boolean
  reason?: string
}

/**
 * Detecta abuso por VOLUMEN de un contacto (inundación/spam). Solo bloquea ante
 * cifras altas que ningún cliente real alcanzaría en una asesoría normal.
 */
export async function checkContactAbuse(sb: SupabaseClient, phone: string): Promise<AbuseResult> {
  try {
    const since15 = new Date(Date.now() - FLOOD_WINDOW_MIN * 60 * 1000).toISOString()
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ count: recent }, { count: daily }] = await Promise.all([
      sb.from("wa_messages").select("id", { count: "exact", head: true }).eq("contact_phone", phone).eq("direction", "in").gte("created_at", since15),
      sb.from("wa_messages").select("id", { count: "exact", head: true }).eq("contact_phone", phone).eq("direction", "in").gte("created_at", since24),
    ])

    if ((recent ?? 0) > FLOOD_MAX) return { blocked: true, reason: `inundación (${recent} msgs/${FLOOD_WINDOW_MIN}min)` }
    if ((daily ?? 0) > DAILY_MAX) return { blocked: true, reason: `volumen diario alto (${daily} msgs/24h)` }
    return { blocked: false }
  } catch {
    return { blocked: false } // ante error, no bloquear (falla abierta para no perder clientes)
  }
}

/**
 * Salvaguarda global anti-ban: si el bot ya envió demasiados mensajes salientes
 * en el último minuto (señal de envío masivo), conviene frenar.
 */
export async function overGlobalSendRate(sb: SupabaseClient): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString()
    const { count } = await sb
      .from("wa_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "out")
      .gte("created_at", since)
    return (count ?? 0) > GLOBAL_SEND_PER_MIN
  } catch {
    return false
  }
}

/** Espera humana extra y aleatoria antes de responder a un contacto nuevo. */
export function humanDelayMs(isFirstContact: boolean): number {
  const base = isFirstContact ? 2500 : 1200
  return base + Math.floor(Math.random() * 2500)
}
