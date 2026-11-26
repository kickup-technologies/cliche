/**
 * Lo que anota la bodega se guarda en site_settings con claves que NO están en
 * la lista pública (solo el servidor las lee). Sin columnas ni tablas nuevas.
 */
import { createServerClient } from "@/lib/supabase"
import type { ConexionDropi } from "./dropi-mcp"
import type { EstadoBodega } from "./reglas"

const leer = (v: unknown) => { try { return typeof v === "string" ? JSON.parse(v) : v ?? null } catch { return null } }
async function valor(key: string) {
  const { data } = await createServerClient().from("site_settings").select("value").eq("key", key).maybeSingle()
  return leer(data?.value)
}
async function escribir(key: string, v: unknown) {
  const { error } = await createServerClient().from("site_settings").upsert({ key, value: JSON.stringify(v) }, { onConflict: "key" })
  if (error) throw new Error("No se pudo guardar: " + error.message)
}

export const leerEstado = async (id: string): Promise<EstadoBodega> => (await valor(`bodega:${id}`)) ?? {}
export async function leerEstados(ids: string[]): Promise<Map<string, EstadoBodega>> {
  const mapa = new Map<string, EstadoBodega>()
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await createServerClient().from("site_settings").select("key, value").in("key", ids.slice(i, i + 100).map((x) => `bodega:${x}`))
    for (const f of data ?? []) mapa.set(String(f.key).slice(7), leer(f.value) ?? {})
  }
  return mapa
}
export async function guardarEstado(id: string, cambios: EstadoBodega) {
  await escribir(`bodega:${id}`, { ...(await leerEstado(id)), ...cambios })
}
export const leerDropi = async (): Promise<ConexionDropi | null> => valor("bodega_dropi")
export const guardarDropi = (c: ConexionDropi) => escribir("bodega_dropi", c)
export const secreto = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ""
