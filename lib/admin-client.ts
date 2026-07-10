"use client"

/**
 * Helper del panel admin. La autorización ya NO viaja en un header con
 * contraseña: la prueba de acceso es la cookie httpOnly `cliche_admin`
 * (emitida por /api/admin/otp/verify tras el código de 4 dígitos), que el
 * navegador adjunta automáticamente en cada petición al mismo origen.
 */

/**
 * fetch para las APIs del admin. Misma firma que fetch(). Solo garantiza
 * el Content-Type en peticiones con body JSON.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(input, { ...init, headers })
}
