import type { Product } from "@/lib/supabase"

/**
 * Catálogo Cliché — 22 aromas de línea ("Tu marca, ¿a qué huele?").
 * Fuente: documento de distribuidores (notas olfativas + mercado objetivo).
 * Fotos: imagen individual (frasco solo) de cada carpeta del Drive del cliente.
 * Descripciones premium redactadas para generar intención de compra.
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
    "Un estallido luminoso de toronja rosa y bergamota que despierta optimismo, suavizado por madera de lima y fresia amarilla. Dulce, delicado y purificador: el aroma cítrico que vuelve inolvidable cada espacio femenino e infantil.",
    ["Toronja rosa", "Madera de lima", "Fresia amarilla", "Bergamota"],
    "Marcas infantiles y femeninas · aroma cítrico",
    "Más vendido", "bg-primary",
  ),
  make(
    2, "Vientos de Lino", "vientos-de-lino", "png",
    "Romance floral y sereno",
    "Lirio del valle y jazmín acuático tejen un aroma romántico y elegante, anclado en un sándalo cálido que invita a la calma. Notas marinas le dan un frescor ligero: la fragancia de la feminidad y la confianza.",
    ["Lirio del valle", "Jazmín acuático", "Sándalo", "Notas marinas"],
    "Marcas femeninas, accesorios y boutiques · suave y dulce",
  ),
  make(
    3, "Eternamente Índigo", "eternamente-indigo", "png",
    "Energía amaderada y fresca",
    "Bergamota y limón vibran con vitalidad mientras las perlas de almizcle y la cumarina aportan calidez sensual y carácter. Un aroma amaderado y fresco, lleno de energía, que se queda en la memoria de tu marca.",
    ["Notas marinas", "Bergamota", "Perlas de almizcle", "Cumarina", "Limón"],
    "Marcas unisex, deportivas y masculinas · amaderado fresco",
    "Más vendido", "bg-primary",
  ),
  make(
    4, "Sello de Dios", "sello-de-dios", "png",
    "Pureza que serena",
    "El aroma puro y luminoso de las rosas blancas, símbolo de inocencia y calma. Eleva el ambiente de spas, centros de bienestar y hogares con una sensación de paz y armonía que invita a respirar profundo.",
    ["Rosas blancas"],
    "Spa, yoga, bienestar y hogar · suave y neutro",
  ),
  make(
    5, "Brillos de Seda", "brillos-de-seda", "png",
    "Vitalidad cítrica y elegante",
    "Frutas frescas y lima naranja explotan en vitalidad, equilibradas por un fondo woody elegante y un toque ambery cálido. Un aroma carismático que regala energía y distinción a cada espacio.",
    ["Notas frutales", "Lima naranja", "Woody", "Ambery"],
    "Marcas femeninas, deportivas y accesorios · cítrico frutal",
  ),
  make(
    6, "Calor de Lana", "calor-de-lana", "png",
    "Dulzura cálida y envolvente",
    "Grosellas negras y chabacano jugoso se funden con vainilla y haba tonka para un aroma reconfortante, dulce y sensual. La calidez que hace sentir como en casa desde el primer instante.",
    ["Grosellas negras", "Chabacano", "Vainilla", "Haba tonka"],
    "Marcas femeninas, infantiles y ropa íntima · suave y dulce",
  ),
  make(
    7, "Índigo Profundo", "indigo-profundo", "png",
    "Carácter amaderado masculino",
    "Cítricos enérgicos abren paso a artemisa y lavanda serena, sobre un ámbar gris cálido y magnético. Un aroma profundo y masculino que proyecta éxito y seguridad.",
    ["Cítricos", "Artemisa", "Ámbar gris", "Lavanda"],
    "Marcas masculinas y unisex · amaderado",
  ),
  make(
    8, "Tierra", "tierra", "png",
    "Elegancia soleada y delicada",
    "Clementina soleada y chabacano fresco se visten de violeta discreta y de buen gusto. Un aroma alegre y elegante que invita a tus clientes a quedarse más tiempo.",
    ["Clementina", "Chabacano", "Violeta"],
    "Boutiques, hoteles y Airbnb · suave y elegante",
  ),
  make(
    9, "Agua", "agua", "png",
    "Frescura cítrica cristalina",
    "Bergamota de Italia y cáscara de lima destellan frescura mientras el lirio acuático aporta un corazón floral cristalino. El aroma limpio y enérgico para espacios que inspiran confianza.",
    ["Bergamota de Italia", "Lirio acuático", "Cáscara de lima"],
    "Hoteles, spas, oficinas y hogar · cítrico fresco",
    "Más vendido", "bg-primary",
  ),
  make(
    10, "Aire", "aire", "png",
    "Aire limpio y revitalizante",
    "Bergamota y limón llenan de alegría y vitalidad, con un corazón de jazmín seductor y elegante. Un frescor herbal que renueva el ánimo de cualquier ambiente.",
    ["Bergamota", "Limón", "Jazmín"],
    "Hoteles, spas, hogar y consultorios · herbal fresco",
  ),
  make(
    11, "Best Friends", "best-friends", "webp",
    "Suavidad de algodón limpio",
    "Toronja rosa y lirio acuático sobre un fondo de almizcle suave y jazmín: la sensación de algodón recién lavado. Pensado con cariño para los espacios y productos de tus mascotas.",
    ["Toronja rosa", "Lirio acuático", "Jazmín", "Almizcle"],
    "Marcas de mascotas · suave, algodón",
  ),
  make(
    12, "Lycra de Verano", "lycra-de-verano", "png",
    "Floral de ropa recién estrenada",
    "Notas verdes y acuosas frescas envuelven un corazón de flores blancas puras. El aroma inconfundible de la ropa nueva: vital, limpio y femenino.",
    ["Notas verdes", "Flores blancas", "Notas acuosas"],
    "Marcas femeninas y ropa deportiva · floral, ropa nueva",
  ),
  make(
    13, "Mahai", "mahai", "jpg",
    "Tropical, dulce y luminoso",
    "Fresia delicada y fruta de la pasión jugosa sobre un ámbar cálido y luminoso. Un aroma playero y tropical que evoca un verano eterno.",
    ["Fresia", "Fruta de la pasión", "Ámbar"],
    "Marcas playeras, vestidos de baño y calzado · tropical y dulce",
  ),
  make(
    14, "Tāo", "tao", "webp",
    "Floral cálido con alma",
    "Musgo de roble fresco y rosa serena, abrazados por un ámbar dorado y reconfortante. Un aroma floral cálido que transmite calma y buena energía.",
    ["Musgo de roble", "Rosa", "Ámbar"],
    "Marcas femeninas, infantiles y playeras · floral",
    "Más vendido", "bg-primary",
  ),
  make(
    15, "Romeo y Julieta", "romeo-y-julieta", "webp",
    "Romance floral y dulce",
    "Bergamota alegre, jazmín seductor y vainilla envolvente: un aroma profundamente romántico y memorable. La fragancia del amor para tu marca.",
    ["Bergamota", "Jazmín", "Vainilla"],
    "Bolsos, accesorios y calzado · floral",
  ),
  make(
    16, "Frescura de Lino", "frescura-de-lino", "jpeg",
    "Limpieza cítrica y serena",
    "Hojas de manzano y mandarina italiana destellan un frescor cítrico, suavizadas por fresia y almizcle. La sensación inconfundible de lino limpio y recién planchado.",
    ["Hojas de manzano", "Mandarina italiana", "Fresia", "Almizcle"],
    "Marcas femeninas, accesorios y calzado · cítrico herbal",
  ),
  make(
    17, "Seda del Lejano Oriente", "seda-del-lejano-oriente", "jpeg",
    "Sofisticación oriental",
    "Vainilla cremosa y cedro elegante con un toque especiado de cardamomo y un fondo de almizcle envolvente. Un aroma sofisticado que transporta al lejano oriente.",
    ["Vainilla", "Cedro", "Almizcle", "Cardamomo"],
    "Marcas femeninas, bolsos y accesorios · fresco y floral",
  ),
  make(
    18, "Luxury", "luxury", "webp",
    "Lujo amaderado y fresco",
    "Bergamota y lavanda abren con un frescor noble; violeta y ámbar blanco aportan elegancia, sellados por un almizcle de alta gama. El aroma de la ropa nueva premium: puro lujo.",
    ["Bergamota", "Lavanda", "Violeta", "Ámbar blanco", "Almizcle"],
    "Marcas luxury, streetwear y unisex · amaderado y fresco",
    "Premium", "bg-foreground",
  ),
  make(
    19, "Hilos de Seda", "hilos-de-seda", "png",
    "Femenino fresco y sedoso",
    "Frutos de la pasión jugosos y fresia delicada sobre ámbar y almizcle suaves. Un aroma fresco y femenino, sedoso desde el primer encuentro.",
    ["Frutos de la pasión", "Ámbar", "Almizcle", "Fresia"],
    "Ropa interior, accesorios, calzado y bolsos · fresco femenino",
  ),
  make(
    20, "Coconut", "coconut", "png",
    "Dulce tropical de coco",
    "Coco cremoso, almendra y piña con un fondo goloso de tonka y almizcle. El aroma 'coconut sugar pop' que endulza vestidos de baño, marcas playeras e infantiles.",
    ["Coco", "Almendra", "Piña", "Tonka", "Almizcle"],
    "Vestidos de baño, playeras e infantiles · coco dulce",
    "Nuevo", "bg-accent",
  ),
  make(
    21, "Watermelon", "watermelon", "png",
    "Sandía candy muy dulce",
    "Sandía jugosa en su versión más golosa y divertida — candy puro. Un aroma alegre y dulce, irresistible para marcas infantiles.",
    ["Sandía", "Candy dulce"],
    "Marcas infantiles · sandía, candy dulce",
    "Nuevo", "bg-accent",
  ),
  make(
    22, "Air Fresh", "air-fresh", "png",
    "Limpio y fresco al instante",
    "La sensación de recién limpio, fresca y neutra, que neutraliza y renueva el ambiente al instante. Ideal para los espacios y productos de mascotas.",
    ["Notas limpias", "Frescor neutro"],
    "Marcas de mascotas · aroma a limpio",
  ),
]

export const CATALOG_AS_PRODUCTS: Product[] = CATALOG

export function getCatalogProduct(slug: string): CatalogProduct | undefined {
  return CATALOG.find((p) => p.slug === slug)
}
