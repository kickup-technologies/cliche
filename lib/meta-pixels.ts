/**
 * Píxeles de Meta que reciben TODOS los eventos del sitio (navegador + CAPI).
 *
 * - 1083378614065362 "Cliché Web - Píxel": el histórico (cuenta de Andrés).
 * - 1193836337717040 "Píxel de Cliché OFICIAL": portafolio de Cliché, lo pidió
 *   la agencia para las campañas de noviembre-2026 ("junto al que ya tienen").
 *
 * En el navegador basta con hacer fbq('init') de cada uno: fbq('track') envía
 * el evento a todos los píxeles inicializados con el MISMO eventID, y el
 * servidor (lib/meta-capi) manda ese mismo event_id a cada píxel → Meta
 * deduplica por píxel. Los ids no son secretos; los tokens sí (solo env).
 */
export const META_PIXEL_IDS = ["1083378614065362", "1193836337717040"] as const
