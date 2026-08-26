import type { SupabaseClient } from "@supabase/supabase-js"

// ── Protección anti-ban de WhatsApp para flujo alto ───────────────────────────
// Los bans de WhatsApp casi siempre los disparan los mensajes PROACTIVOS
// (iniciados por el negocio): ráfagas, plantillas idénticas y horarios no
// humanos. Las respuestas reactivas (el cliente escribió primero) son de bajo
// riesgo. Estas utilidades las usan los crons de recuperación y follow-up.

/** Máximo de mensajes salientes (todos) por hora antes de pausar lo proactivo. */
export const PROACTIVE_HOURLY_CAP = 40

/** Mensajes salientes registrados en la última hora (bot + agente + proactivos). */
export async function outboundLastHour(sb: SupabaseClient): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await sb
      .from("wa_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "out")
      .gte("created_at", oneHourAgo)
    return count ?? 0
  } catch {
    // Si no se puede medir, se asume saturado: lo proactivo se salta la corrida.
    return Number.MAX_SAFE_INTEGER
  }
}

/**
 * ¿Es horario humano en Colombia? Los mensajes proactivos solo salen entre
 * 9am y 8pm hora de Bogotá: un negocio real no escribe a las 3am, y WhatsApp
 * pondera el patrón horario en sus señales de spam.
 */
export function isHumanHoursColombia(now = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(now),
  )
  return hour >= 9 && hour < 20
}

/** Variante aleatoria de una plantilla — texto idéntico masivo = huella de spam. */
export function pickVariant<T>(variants: T[]): T {
  return variants[Math.floor(Math.random() * variants.length)]
}

/** Pausa aleatoria entre envíos proactivos (además del tipeo simulado). */
export function jitter(minMs = 6000, maxMs = 15000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((r) => setTimeout(r, ms))
}
