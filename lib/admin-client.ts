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
  // Se pide por el alias /api/gestion/* (rewrite interno a /api/admin/*):
  // los adblockers/antivirus filtran URLs con "admin" y rompían el panel.
  if (input.startsWith("/api/admin/")) {
    input = input.replace("/api/admin/", "/api/gestion/")
  }
  const headers = new Headers(init.headers || {})
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(input, { ...init, headers })

  // Sesión vencida a mitad de trabajo: el token de la cookie dura 8h y una
  // pestaña abierta de un día para otro sigue pintando el panel, pero toda
  // escritura respondía 401 con un alert "No autorizado" sin salida. Aquí se
  // confirma contra whoami que de verdad es la sesión (y no un 401 ajeno,
  // p. ej. la llave peer de la tienda hermana) y se devuelve al login con un
  // mensaje claro. whoami además renueva la cookie si aún era válida.
  if (res.status === 401 && !input.includes("/whoami")) {
    const who = await fetch("/api/gestion/whoami", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null)
    if (who && who.unlocked === false) {
      try {
        sessionStorage.setItem("cliche_admin_unlocked", "0")
        sessionStorage.setItem("cliche_admin_expired", "1")
      } catch {}
      // El alert del llamador (si lo hay) muestra este mensaje; al aceptarlo
      // la página ya está recargando hacia el login.
      setTimeout(() => window.location.reload(), 50)
      return new Response(JSON.stringify({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
  }
  return res
}
