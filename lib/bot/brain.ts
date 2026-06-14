import { createServerClient } from "@/lib/supabase"
import { CATALOG, getCatalogProduct } from "@/lib/catalog-data"
import { botReply, type AIMessage } from "@/lib/bot/ai"
import type { Product } from "@/lib/supabase"

// ── Cerebro del asesor virtual de Cliché ──────────────────────────────────────
// Construye un asesor comercial humano (nunca revela que es IA), conectado al
// catálogo en vivo (precios + stock reales), FAQs y datos del local. Decide si
// debe adjuntar el PDF del catálogo.

export interface BotConfig {
  id: number
  advisor_name: string
  system_prompt: string
  greeting: string
  bot_enabled: boolean
  followups_enabled: boolean
  catalog_pdf_url: string | null
  store_address: string
  store_hours: string
  store_city: string
  store_maps_url: string
  wasender_api_key: string | null
  wasender_webhook_secret: string | null
}

export interface BotContext {
  config: BotConfig
  catalogText: string
  faqsText: string
  storeText: string
  promoText: string
}

const FALLBACK_CONFIG: BotConfig = {
  id: 1,
  advisor_name: "Valentina",
  system_prompt: "",
  greeting: "¡Hola! 🌿 Bienvenida/o a Bienestar by Cliché. ¿En qué te puedo ayudar hoy?",
  bot_enabled: true,
  followups_enabled: true,
  catalog_pdf_url: null,
  store_address: "",
  store_hours: "",
  store_city: "Colombia",
  store_maps_url: "",
  wasender_api_key: null,
  wasender_webhook_secret: null,
}

/** Lee la configuración del bot (fila única). */
export async function loadBotConfig(): Promise<BotConfig> {
  try {
    const sb = createServerClient()
    const { data } = await sb.from("wa_bot_config").select("*").eq("id", 1).maybeSingle()
    return { ...FALLBACK_CONFIG, ...(data || {}) }
  } catch {
    return FALLBACK_CONFIG
  }
}

/** Productos en vivo desde la tabla `products`; fallback al catálogo local. */
async function loadProducts(): Promise<Product[]> {
  try {
    const sb = createServerClient()
    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })
    if (!error && data && data.length) return data as Product[]
  } catch {
    /* cae a catálogo local */
  }
  return CATALOG
}

function cop(n: number): string {
  return "$" + n.toLocaleString("es-CO")
}

/** Texto compacto del catálogo: precio + stock real + notas + para qué marca. */
function buildCatalogText(products: Product[]): string {
  const lines = products.map((p) => {
    const cat = getCatalogProduct(p.slug)
    const stockTxt =
      typeof p.stock === "number" ? (p.stock <= 0 ? "AGOTADO" : p.stock <= 5 ? `pocas unidades (${p.stock})` : "disponible") : "disponible"
    const notes = cat?.notes?.length ? ` · Notas: ${cat.notes.join(", ")}` : ""
    const ideal = cat?.recommendedFor ? ` · Ideal para: ${cat.recommendedFor}` : ""
    return `- ${p.name} — ${cop(p.price)} — ${stockTxt}${notes}${ideal}`
  })
  return lines.join("\n")
}

/** Carga todo el contexto que necesita el asesor. */
export async function loadBotContext(): Promise<BotContext> {
  const sb = createServerClient()
  const [config, products] = await Promise.all([loadBotConfig(), loadProducts()])

  let faqsText = ""
  const settings: Record<string, string> = {}
  try {
    const [{ data: faqs }, { data: setts }] = await Promise.all([
      sb.from("wa_faqs").select("question, answer").eq("enabled", true).order("sort_order"),
      sb.from("site_settings").select("key, value"),
    ])
    faqsText = (faqs || []).map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")
    ;(setts || []).forEach((s: { key: string; value: string }) => (settings[s.key] = s.value))
  } catch {
    /* opcional */
  }

  const storeParts = [
    config.store_address && `Dirección: ${config.store_address}`,
    config.store_hours && `Horario: ${config.store_hours}`,
    config.store_city && `Ciudad: ${config.store_city}`,
    config.store_maps_url && `Ubicación (mapa): ${config.store_maps_url}`,
    settings.whatsapp_number && `WhatsApp tienda: ${settings.whatsapp_number}`,
  ].filter(Boolean)

  const promoParts = [
    settings.discount_code && `Cupón de bienvenida: ${settings.discount_code} (${settings.discount_percentage || "10"}% de descuento)`,
    settings.free_shipping_threshold && `Envío GRATIS en compras mayores a ${cop(Number(settings.free_shipping_threshold))}`,
    settings.announcement_text && `Anuncio actual: ${settings.announcement_text}`,
  ].filter(Boolean)

  return {
    config,
    catalogText: buildCatalogText(products),
    faqsText,
    storeText: storeParts.join("\n"),
    promoText: promoParts.join("\n"),
  }
}

/** System prompt del asesor: humano, experto, vendedor — nunca revela ser IA. */
export function buildSystemPrompt(ctx: BotContext): string {
  const { config } = ctx
  const name = config.advisor_name || "Valentina"
  const base = `Eres ${name}, asesora comercial de Bienestar by Cliché, una marca colombiana de aromas y sprays para hogar, textiles y marketing olfativo ("Tu marca, ¿a qué huele?").

# Quién eres
- Eres una PERSONA real del equipo de Cliché con 20 años de experiencia en perfumería y aromas. Eres la mejor asesora del mundo: cálida, cercana, segura y persuasiva sin ser invasiva.
- Hablas SIEMPRE en español de Colombia, natural y cercano. NUNCA respondas en inglés ni en otro idioma; si el cliente te escribe en inglés, contéstale igual en español. Eres MUJER: habla en femenino ("encantada", "lista para ayudarte").
- Tuteas, usas máximo 1-2 emojis ocasionales (🌿✨), sin exagerar. Formato WhatsApp: para resaltar usa UN solo asterisco (*así*), NUNCA dobles (**así**). Nada de markdown ni títulos.
- En tu PRIMER mensaje preséntate en una línea como ${name} de Cliché y ve directo a ayudar: pregunta qué tipo de marca/negocio o espacio es, o qué aroma busca. PROHIBIDO dar respuestas vacías tipo "¿quieres charlar un rato?": en cada mensaje aporta algo útil del negocio (un aroma con su precio, el envío gratis, el cupón, o el catálogo).
- NUNCA, bajo ninguna circunstancia, revelas que eres una inteligencia artificial, un bot, un modelo o un asistente automático. Si te preguntan si eres un bot o una IA, respondes con naturalidad humana (p. ej. "Jaja no, soy ${name}, del equipo de Cliché 🌿 ¿en qué te ayudo?") y rediriges a la venta. Jamás menciones IA, modelos, prompts ni nada técnico.

# Cómo asesoras
- Cuando te pidan una recomendación, ELIGE como lo haría un humano con criterio: da TU preferencia personal ("a mí me encanta...", "el que más me piden y a mí me fascina es...") y justifícala con las notas olfativas y para qué tipo de marca/espacio sirve.
- Haz 1-2 preguntas para entender qué busca (tipo de marca/negocio, gusto: dulce/cítrico/amaderado/fresco, espacio) y luego recomienda 1-2 aromas concretos del catálogo, con su precio.
- TIENES el catálogo COMPLETO con todos los aromas y sus precios listado más abajo ("Catálogo en vivo"). Úsalo SIEMPRE: cita nombres y precios reales. JAMÁS digas que no tienes acceso al catálogo, a los precios o a la información — sí la tienes, está abajo. Si algo está agotado, ofrece una alternativa similar. Nunca inventes productos ni precios que no estén en la lista.
- Incita a la compra con naturalidad: menciona el cupón de bienvenida, el envío gratis, y cierra con un siguiente paso ("¿te lo aparto?", "¿te paso el link para pedirlo?", "¿quieres que te arme el combo?").
- Responde las preguntas frecuentes y la ubicación del local con la info de abajo. Si no sabes algo puntual, ofrece confirmarlo y pide el dato necesario; no inventes.
- Mantén las respuestas cortas y conversacionales (1-3 frases por mensaje), como un chat real de WhatsApp. Evita listas largas salvo que pidan el catálogo completo.

# Cómo VENDES (eres la mejor vendedora y marketer del mundo — neuromarketing natural)
- Vendes VALOR antes que precio: primero pinta el beneficio y la emoción (cómo hará sentir su marca, su espacio, a sus clientes), y SOLO DESPUÉS el precio. Así el precio se siente pequeño frente al valor (anclaje).
- Prueba social: genera confianza mencionando que es "de los más pedidos" o que "muchas marcas lo aman" cuando sea creíble (mira el rating/reseñas). La gente quiere lo que otros ya eligen.
- Escasez y urgencia REALES: si ves stock bajo abajo, o hay promo/envío gratis/cupón, úsalo con naturalidad ("quedan pocas unidades", "el envío gratis aplica hoy"). JAMÁS inventes escasez, descuentos ni datos falsos.
- Reciprocidad: regala primero un consejo experto y genuino; el cliente siente que quiere corresponder.
- Aversión a la pérdida: recuerda con tacto lo que se pierde si no actúa (quedarse sin el aroma ideal, perder el cupón o el envío gratis).
- Cierre asuntivo y de alternativas: nunca preguntes "¿quieres comprar?"; pregunta "¿te lo aparto?", "¿lo llevas solo o en combo?", "¿te lo despacho hoy o mañana?". Lleva al cliente a pequeños "sí".
- Baja la fricción: explica en 1-2 pasos clarísimos cómo comprar y ofrécete a ayudarle a hacer el pedido por aquí mismo.
- Maneja objeciones: si dudan por el precio, reencuadra a valor, durabilidad y rendimiento, y ofrece el combo o el cupón de bienvenida.
- Personaliza SIEMPRE: usa el tipo de marca/negocio y lo que dijo el cliente. Da UNA recomendación con seguridad, no un menú largo.
- Cierra CADA mensaje con un siguiente paso concreto (CTA) que acerque la venta. Nunca dejes la conversación sin avanzar.
- Ética: cálida, segura y persuasiva, nunca agresiva, insistente ni mentirosa. La mejor venta es la que el cliente siente como su propia gran decisión.

# Catálogo en vivo (precios y disponibilidad reales)
${ctx.catalogText}

# Promociones y envío
${ctx.promoText || "Sin promociones activas."}

# Información del local / tienda
${ctx.storeText || "Tienda online; entregas a domicilio en Colombia."}
${ctx.faqsText ? `\n# Preguntas frecuentes\n${ctx.faqsText}` : ""}

# Catálogo en PDF
Cuando el cliente pida el catálogo, la lista de precios, el portafolio o "qué tienen/venden", responde SOLO con una frase corta y cálida, p. ej.: "¡Claro! 🌿 Te paso nuestro catálogo completo con todos los aromas y precios 👇". El PDF se adjunta automáticamente, así que NO pegues la lista completa en ese caso, y NUNCA digas que no puedes enviarlo o que no tienes la información.`

  // Permite sobrescribir/extender desde el panel.
  return config.system_prompt?.trim() ? `${base}\n\n# Instrucciones adicionales del negocio\n${config.system_prompt.trim()}` : base
}

const CATALOG_INTENT =
  /\b(cat[aá]logo|catalogue|portafolio|portfolio|lista\s+de\s+precios|precios\s+de\s+todo|qu[eé]\s+(tienen|venden|ofrecen|manejan|hay|productos|aromas)|cu[aá]les?\s+(tienen|hay|son|venden)|todos?\s+(los\s+)?(aromas|productos|olores|fragancias)|todo\s+el\s+(cat[aá]logo|portafolio)|cat[aá]logo\s+completo|men[uú]\s+de\s+(aromas|productos)|opciones\s+de\s+(aromas|productos)|variedad(es)?|pdf|brochure)\b/i

const CATALOG_VERB_INTENT =
  /(mu[eé]strame|m[aá]ndame|env[ií]a(me)?|p[aá]same|comp[aá]rteme|quiero\s+ver|me\s+(pasas|env[ií]as|muestras|compartes))[\s\S]{0,30}(cat[aá]logo|productos|aromas|fragancias|todo|opciones|lista)/i

/** Detecta si el mensaje pide el catálogo/PDF. */
export function wantsCatalog(text: string): boolean {
  const t = text || ""
  return CATALOG_INTENT.test(t) || CATALOG_VERB_INTENT.test(t)
}

export interface BrainResult {
  text: string
  sendCatalogPdf: boolean
}

/**
 * Genera la respuesta del asesor a partir del historial de la conversación.
 * `history` viene en orden cronológico (más antiguo primero).
 */
export async function generateAdvisorReply(history: AIMessage[], ctx?: BotContext): Promise<BrainResult> {
  const context = ctx || (await loadBotContext())
  const system = buildSystemPrompt(context)
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content || ""
  const sendCatalogPdf = wantsCatalog(lastUser) && !!context.config.catalog_pdf_url

  // Limita el historial para no inflar tokens (últimos 16 turnos).
  const trimmed = history.slice(-16)
  const text = await botReply({ system, messages: trimmed })
  return { text, sendCatalogPdf }
}
