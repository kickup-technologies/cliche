"use client"

/**
 * Helper del panel admin: añade la credencial `x-admin-password` a cada
 * petición. La contraseña se guarda en sessionStorage al iniciar sesión
 * (se borra al cerrar el navegador/pestaña).
 */
const PW_KEY = "cliche_admin_pw"

export function setAdminPw(pw: string) {
  try { sessionStorage.setItem(PW_KEY, pw) } catch {}
}

export function getAdminPw(): string {
  try { return sessionStorage.getItem(PW_KEY) || "" } catch { return "" }
}

export function clearAdminPw() {
  try { sessionStorage.removeItem(PW_KEY) } catch {}
}

/**
 * fetch con la cabecera de admin inyectada. Misma firma que fetch().
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  headers.set("x-admin-password", getAdminPw())
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(input, { ...init, headers })
}
