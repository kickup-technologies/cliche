// Mapa canónico slug (sin prefijo "aroma-") → modelo 3D real (GLB de Meshy).
// Fuente única de verdad: la usa el detalle de producto y el carrusel de gracias.
export const PRODUCT_MODELS: Record<string, string> = {
  "calor-de-lana": "/models/calor-de-lana.glb",
  "coconut": "/models/coconut.glb",
  "watermelon": "/models/watermelon.glb",
  "air-fresh": "/models/air-fresh.glb",
  "tao": "/models/tao.glb",
  "romeo-y-julieta": "/models/romeo-y-julieta.glb",
  "frescura-de-lino": "/models/frescura-de-lino.glb",
  "seda-del-lejano-oriente": "/models/seda-del-lejano-oriente.glb",
  "luxury": "/models/luxury.glb",
  "hilos-de-seda": "/models/hilos-de-seda.glb",
  "indigo-profundo": "/models/indigo-profundo.glb",
  "tierra": "/models/tierra.glb",
  "agua": "/models/agua.glb",
  "aire": "/models/aire.glb",
  "best-friends": "/models/best-friends.glb",
  "lycra-de-verano": "/models/lycra-de-verano.glb",
  "mahai": "/models/mahai.glb",
  "dulce-lana": "/models/dulce-lana.glb",
  "vientos-de-lino": "/models/vientos-de-lino.glb",
  "eternamente-indigo": "/models/eternamente-indigo.glb",
  "sello-de-dios": "/models/sello-de-dios.glb",
  "brillos-seda": "/models/brillos-de-seda.glb",
  "happiness": "/models/happiness.glb",
  "navidad": "/models/navidad.glb",
}

/** Devuelve la URL del modelo 3D para un slug (tolera el prefijo "aroma-"). */
export function modelForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null
  return PRODUCT_MODELS[slug.replace(/^aroma-/, "")] ?? null
}
