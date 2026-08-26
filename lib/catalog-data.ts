import type { Product } from "@/lib/supabase"

/**
 * Catálogo Cliché — 22 aromas de línea ("Tu marca, ¿a qué huele?").
 * Fuente: documento de distribuidores (notas olfativas + mercado objetivo).
 * Fotos: imagen individual (frasco solo) de cada carpeta del Drive del cliente.
 * Descripciones premium redactadas para generar deseo e intención de compra.
 *
 * Sirve como:
 *  - fallback de /api/products cuando Supabase no está configurado (local)
 *  - fuente de notas olfativas y propuesta de valor en la ficha de producto
 */
export interface CatalogProduct extends Product {
  /** frase corta evocadora para tarjetas/encabezados */
  tagline: string
  /** notas olfativas individuales */
  notes: string[]
  /** mercado / tipo de marca recomendada */
  recommendedFor: string
}

const PRICE = 78000
const BASE = new Date("2026-01-01T00:00:00Z").getTime()

function make(
  i: number,
  name: string,
  slug: string,
  ext: "jpeg" | "jpg" | "png" | "webp",
  tagline: string,
  description: string,
  notes: string[],
  recommendedFor: string,
  badge: string | null = null,
  badgeColor: string | null = null,
): CatalogProduct {
  const img = `/images/products/${slug}.${ext}`
  return {
    id: slug,
    name,
    slug,
    price: PRICE,
    original_price: null,
    description,
    image_url: img,
    image_urls: [img],
    badge,
    badge_color: badgeColor,
    stock: 25,
    rating: 4.9,
    reviews: 40 + ((i * 7) % 110),
    is_active: true,
    created_at: new Date(BASE + i * 60000).toISOString(),
    tagline,
    notes,
    recommendedFor,
  }
}

export const CATALOG: CatalogProduct[] = [
  make(
    1, "Dulce Lana", "dulce-lana", "png",
    "Frescura cítrica que abraza",
    "Imagina entrar y que un estallido de toronja rosa y bergamota te reciba con una sonrisa. Dulce Lana envuelve tus prendas y espacios en un aire cítrico, luminoso y delicado que permanece todo el día —sin manchar y 100% natural— convirtiendo tu marca en ese recuerdo feliz que tus clientes quieren volver a vivir.",
    ["Toronja rosa", "Madera de lima", "Fresia amarilla", "Bergamota"],
    "Marcas infantiles y femeninas · aroma cítrico",
    "Más vendido", "bg-primary",
  ),
  make(
    2, "Vientos de Lino", "vientos-de-lino", "png",
    "Romance floral y sereno",
    "Hay aromas que se sienten como un abrazo. Vientos de Lino une lirio del valle y jazmín acuático sobre un sándalo cálido para crear una sensación romántica y elegante que perdura horas en tus textiles. Es la fragancia que hace que tu marca se asocie para siempre con delicadeza, confianza y buen gusto.",
    ["Lirio del valle", "Jazmín acuático", "Sándalo", "Notas marinas"],
    "Marcas femeninas, accesorios y boutiques · suave y dulce",
  ),
  make(
    3, "Eternamente Índigo", "eternamente-indigo", "png",
    "Energía amaderada y fresca",
    "Energía que no se olvida. Bergamota y limón despiertan los sentidos mientras el almizcle y la cumarina dejan una estela cálida y magnética que dura todo el día. Eternamente Índigo le regala a tu marca ese carácter fresco y amaderado que tus clientes recuerdan… y que los hace querer volver.",
    ["Notas marinas", "Bergamota", "Perlas de almizcle", "Cumarina", "Limón"],
    "Marcas unisex, deportivas y masculinas · amaderado fresco",
    "Más vendido", "bg-primary",
  ),
  make(
    4, "Sello de Dios", "sello-de-dios", "png",
    "Pureza que serena",
    "Respira hondo: rosas blancas puras que serenan el alma. Sello de Dios transforma spas, estudios de yoga y hogares en refugios de calma, con un aroma suave que se mantiene flotando en el ambiente. Es el detalle invisible que hace que cada persona se sienta en paz apenas cruza tu puerta.",
    ["Rosas blancas"],
    "Spa, yoga, bienestar y hogar · suave y neutro",
  ),
  make(
    5, "Brillos de Seda", "brillos-de-seda", "png",
    "Vitalidad cítrica y elegante",
    "Vitalidad que se siente al instante. Frutas frescas y lima naranja estallan en energía sobre un fondo woody elegante, dejando tus espacios y prendas con un aire carismático que dura horas. Brillos de Seda viste tu marca de frescura y distinción —de esas que se notan y se recuerdan.",
    ["Notas frutales", "Lima naranja", "Woody", "Ambery"],
    "Marcas femeninas, deportivas y accesorios · cítrico frutal",
  ),
  make(
    6, "Calor de Lana", "calor-de-lana", "png",
    "Dulzura cálida y envolvente",
    "El aroma de sentirse en casa. Grosellas negras y chabacano jugoso se funden con vainilla y haba tonka en una dulzura cálida y envolvente que abraza tus textiles durante horas. Calor de Lana convierte cada prenda en una caricia que tus clientes no van a querer quitarse.",
    ["Grosellas negras", "Chabacano", "Vainilla", "Haba tonka"],
    "Marcas femeninas, infantiles y ropa íntima · suave y dulce",
  ),
  make(
    7, "Índigo Profundo", "indigo-profundo", "png",
    "Carácter amaderado masculino",
    "Para marcas con carácter. Cítricos vibrantes abren paso a un ámbar gris magnético y lavanda serena, dejando una estela profundamente masculina que perdura. Índigo Profundo proyecta éxito, seguridad y elegancia —el aroma que convierte a tu marca en una declaración de identidad.",
    ["Cítricos", "Artemisa", "Ámbar gris", "Lavanda"],
    "Marcas masculinas y unisex · amaderado",
  ),
  make(
    8, "Tierra", "tierra", "png",
    "Elegancia soleada y delicada",
    "Elegancia que invita a quedarse. Clementina soleada y violeta de buen gusto crean un aroma alegre, sofisticado y delicado que envuelve hoteles, boutiques y espacios con calidez. Tierra hace que tus clientes prolonguen su visita… y se lleven tu marca grabada en la memoria.",
    ["Clementina", "Chabacano", "Violeta"],
    "Boutiques, hoteles y Airbnb · suave y elegante",
  ),
  make(
    9, "Agua", "agua", "png",
    "Frescura cítrica cristalina",
    "Frescura que limpia el aire y la mente. Bergamota de Italia y cáscara de lima destellan sobre un lirio acuático cristalino, dejando una sensación impecable que inspira confianza al instante. Agua es el aroma de los espacios que se sienten cuidados —el sello invisible de una marca que piensa en cada detalle.",
    ["Bergamota de Italia", "Lirio acuático", "Cáscara de lima"],
    "Hoteles, spas, oficinas y hogar · cítrico fresco",
    "Más vendido", "bg-primary",
  ),
  make(
    10, "Aire", "aire", "png",
    "Aire limpio y revitalizante",
    "Como abrir la ventana a un día perfecto. Bergamota y limón llenan el ambiente de alegría, con un corazón de jazmín que aporta elegancia. Aire renueva el ánimo de cualquier espacio con un frescor herbal que se queda contigo —para que cada visita a tu marca se sienta ligera, fresca y feliz.",
    ["Bergamota", "Limón", "Jazmín"],
    "Hoteles, spas, hogar y consultorios · herbal fresco",
  ),
  make(
    11, "Best Friends", "best-friends", "webp",
    "Suavidad de algodón limpio",
    "Suave como algodón recién lavado. Toronja rosa y lirio acuático sobre un almizcle tierno crean un aroma limpio y acogedor, pensado con amor para tus mascotas y sus espacios. Best Friends cuida lo que más quieres con una caricia de frescura que dura todo el día —sin irritar y 100% seguro.",
    ["Toronja rosa", "Lirio acuático", "Jazmín", "Almizcle"],
    "Marcas de mascotas · suave, algodón",
  ),
  make(
    12, "Lycra de Verano", "lycra-de-verano", "png",
    "Floral de ropa recién estrenada",
    "El irresistible aroma de estrenar. Notas verdes y acuosas envuelven un corazón de flores blancas que recrea esa sensación inconfundible de ropa nueva, fresca y vital. Lycra de Verano hace que cada prenda de tu marca se sienta —y huela— recién salida de la tienda.",
    ["Notas verdes", "Flores blancas", "Notas acuosas"],
    "Marcas femeninas y ropa deportiva · floral, ropa nueva",
  ),
  make(
    13, "Mahai", "mahai", "jpg",
    "Tropical, dulce y luminoso",
    "Un viaje a la playa en cada inhalación. Fresia delicada y fruta de la pasión jugosa sobre un ámbar dorado crean un aroma tropical, dulce y luminoso que evoca verano eterno. Mahai llena tus prendas y espacios de esa buena vibra que enamora y se queda en el recuerdo.",
    ["Fresia", "Fruta de la pasión", "Ámbar"],
    "Marcas playeras, vestidos de baño y calzado · tropical y dulce",
  ),
  make(
    14, "Tāo", "tao", "webp",
    "Floral cálido con alma",
    "Calma con alma. Musgo de roble y rosa serena, abrazados por un ámbar cálido, crean un aroma floral reconfortante que transmite paz y buena energía. Tāo hace que tus clientes se sientan cuidados, especiales y en armonía —con una estela que perdura horas.",
    ["Musgo de roble", "Rosa", "Ámbar"],
    "Marcas femeninas, infantiles y playeras · floral",
    "Más vendido", "bg-primary",
  ),
  make(
    15, "Romeo y Julieta", "romeo-y-julieta", "webp",
    "Romance floral y dulce",
    "El aroma de enamorarse. Bergamota alegre, jazmín seductor y vainilla envolvente tejen una fragancia profundamente romántica e inolvidable. Romeo y Julieta convierte cada bolso, accesorio o prenda de tu marca en una pequeña historia de amor que se queda en la memoria.",
    ["Bergamota", "Jazmín", "Vainilla"],
    "Bolsos, accesorios y calzado · floral",
  ),
  make(
    16, "Frescura de Lino", "frescura-de-lino", "jpeg",
    "Limpieza cítrica y serena",
    "Lino limpio, recién planchado. Hojas de manzano y mandarina italiana destellan frescura cítrica, suavizadas por fresia y almizcle, dejando una sensación impecable y serena. Frescura de Lino le da a tu marca ese aroma pulcro que transmite cuidado en cada detalle —y que dura todo el día.",
    ["Hojas de manzano", "Mandarina italiana", "Fresia", "Almizcle"],
    "Marcas femeninas, accesorios y calzado · cítrico herbal",
  ),
  make(
    17, "Seda del Lejano Oriente", "seda-del-lejano-oriente", "jpeg",
    "Sofisticación oriental",
    "Sofisticación que transporta. Vainilla cremosa y cedro elegante con un toque especiado de cardamomo crean un aroma envolvente y misterioso, de esos que detienen el paso. Seda del Lejano Oriente viste tu marca de lujo sensorial —exótico, memorable e irresistible.",
    ["Vainilla", "Cedro", "Almizcle", "Cardamomo"],
    "Marcas femeninas, bolsos y accesorios · fresco y floral",
  ),
  make(
    18, "Luxury", "luxury", "webp",
    "Lujo amaderado y fresco",
    "El aroma del lujo de verdad. Bergamota y lavanda nobles, violeta y ámbar blanco sellados con un almizcle de alta gama: la estela exacta de la ropa premium recién estrenada. Luxury eleva tu marca a otra categoría —esa que se huele antes de verse y que nunca se olvida.",
    ["Bergamota", "Lavanda", "Violeta", "Ámbar blanco", "Almizcle"],
    "Marcas luxury, streetwear y unisex · amaderado y fresco",
    "Premium", "bg-foreground",
  ),
  make(
    19, "Hilos de Seda", "hilos-de-seda", "png",
    "Femenino fresco y sedoso",
    "Femenino, fresco y sedoso. Frutos de la pasión y fresia delicada sobre ámbar y almizcle suaves crean una caricia aromática que envuelve la piel y las prendas. Hilos de Seda es el detalle íntimo que hace que tu marca se sienta especial desde el primer encuentro.",
    ["Frutos de la pasión", "Ámbar", "Almizcle", "Fresia"],
    "Ropa interior, accesorios, calzado y bolsos · fresco femenino",
  ),
  make(
    20, "Coconut", "coconut", "png",
    "Dulce tropical de coco",
    "Verano dulce en cada puf. Coco cremoso, almendra y piña con un fondo goloso de tonka: el irresistible aroma 'coconut sugar pop' que despierta antojo y alegría. Coconut llena tus prendas playeras e infantiles de buena vibra tropical —de esa que enamora a la primera olida.",
    ["Coco", "Almendra", "Piña", "Tonka", "Almizcle"],
    "Vestidos de baño, playeras e infantiles · coco dulce",
    "Nuevo", "bg-accent",
  ),
  make(
    21, "Watermelon", "watermelon", "png",
    "Sandía candy muy dulce",
    "Pura diversión dulce. Sandía jugosa en su versión más golosa y candy: un aroma alegre e irresistible que arranca sonrisas. Watermelon es el favorito de las marcas infantiles —porque la felicidad también se huele, y esta dura todo el día.",
    ["Sandía", "Candy dulce"],
    "Marcas infantiles · sandía, candy dulce",
    "Nuevo", "bg-accent",
  ),
  make(
    22, "Air Fresh", "air-fresh", "png",
    "Limpio y fresco al instante",
    "La sensación de recién limpio, al instante. Un aroma fresco y neutro que neutraliza, renueva y deja el ambiente impecable. Air Fresh cuida los espacios y productos de tus mascotas con una frescura discreta que transmite higiene y cariño en cada detalle.",
    ["Notas limpias", "Frescor neutro"],
    "Marcas de mascotas · aroma a limpio",
  ),
]

export const CATALOG_AS_PRODUCTS: Product[] = CATALOG

export function getCatalogProduct(slug: string): CatalogProduct | undefined {
  // La tabla `products` usa slugs con prefijo "aroma-" (p. ej. "aroma-dulce-lana");
  // este catálogo local no. Se aceptan ambas formas.
  const norm = slug.replace(/^aroma-/, "")
  return CATALOG.find((p) => p.slug === slug || p.slug === norm)
}
