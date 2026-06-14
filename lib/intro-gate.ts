/**
 * Decide si la animación de intro debe reproducirse.
 *
 * `entryPath` se captura UNA sola vez por carga de documento (al evaluar el
 * módulo). La navegación SPA de Next no re-evalúa módulos, así que:
 *   - Carga directa / refresh de "/"        → entryPath === "/"  → reproduce
 *   - Entró por otra página y va a "/" (SPA) → entryPath !== "/" → NO reproduce
 *   - Volver al landing por logo / back (SPA) → consumed/entryPath → NO reproduce
 *
 * `consumed` garantiza que solo se evalúe una vez por documento.
 */
const entryPath = typeof window !== "undefined" ? window.location.pathname : ""
let consumed = false

export function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return false
  if (consumed) return false
  consumed = true
  return entryPath === "/" || entryPath === ""
}
