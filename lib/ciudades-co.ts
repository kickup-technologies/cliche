/**
 * Ciudades y municipios para el selector del formulario de pedido. Elegir la
 * ciudad llena el departamento solo (un campo menos que escribir) y deja el
 * nombre bien escrito para quien despacha: "Medellín, Antioquia" y no
 * "medellin". Quien no encuentre su municipio elige "Otra ciudad o municipio"
 * y lo escribe a mano, con el departamento en su lista.
 *
 * Sin "use client" a propósito: son datos, los puede leer el servidor.
 * Los departamentos se escriben IGUAL que en DEPARTAMENTOS (al final de este
 * archivo). Traído de Bienestar by Cliché (7-nov-2026).
 */

export type CiudadCO = { ciudad: string; departamento: string }

/** Las que más piden: van primero en el selector. */
export const CIUDADES_PRINCIPALES: CiudadCO[] = [
  { ciudad: "Bogotá", departamento: "Bogotá D.C." },
  { ciudad: "Medellín", departamento: "Antioquia" },
  { ciudad: "Cali", departamento: "Valle del Cauca" },
  { ciudad: "Barranquilla", departamento: "Atlántico" },
  { ciudad: "Cartagena", departamento: "Bolívar" },
  { ciudad: "Bucaramanga", departamento: "Santander" },
  { ciudad: "Pereira", departamento: "Risaralda" },
  { ciudad: "Manizales", departamento: "Caldas" },
  { ciudad: "Santa Marta", departamento: "Magdalena" },
  { ciudad: "Cúcuta", departamento: "Norte de Santander" },
  { ciudad: "Ibagué", departamento: "Tolima" },
  { ciudad: "Villavicencio", departamento: "Meta" },
]

/** Áreas metropolitanas, capitales de departamento y municipios grandes. */
const OTRAS: CiudadCO[] = [
  // Antioquia
  { ciudad: "Envigado", departamento: "Antioquia" },
  { ciudad: "Itagüí", departamento: "Antioquia" },
  { ciudad: "Bello", departamento: "Antioquia" },
  { ciudad: "Sabaneta", departamento: "Antioquia" },
  { ciudad: "La Estrella", departamento: "Antioquia" },
  { ciudad: "Caldas", departamento: "Antioquia" },
  { ciudad: "Copacabana", departamento: "Antioquia" },
  { ciudad: "Girardota", departamento: "Antioquia" },
  { ciudad: "Rionegro", departamento: "Antioquia" },
  { ciudad: "La Ceja", departamento: "Antioquia" },
  { ciudad: "El Retiro", departamento: "Antioquia" },
  { ciudad: "Marinilla", departamento: "Antioquia" },
  { ciudad: "El Carmen de Viboral", departamento: "Antioquia" },
  { ciudad: "Guarne", departamento: "Antioquia" },
  { ciudad: "Apartadó", departamento: "Antioquia" },
  { ciudad: "Turbo", departamento: "Antioquia" },
  { ciudad: "Caucasia", departamento: "Antioquia" },
  { ciudad: "Santa Fe de Antioquia", departamento: "Antioquia" },
  // Cundinamarca
  { ciudad: "Soacha", departamento: "Cundinamarca" },
  { ciudad: "Chía", departamento: "Cundinamarca" },
  { ciudad: "Cajicá", departamento: "Cundinamarca" },
  { ciudad: "Zipaquirá", departamento: "Cundinamarca" },
  { ciudad: "Mosquera", departamento: "Cundinamarca" },
  { ciudad: "Funza", departamento: "Cundinamarca" },
  { ciudad: "Madrid", departamento: "Cundinamarca" },
  { ciudad: "Facatativá", departamento: "Cundinamarca" },
  { ciudad: "Fusagasugá", departamento: "Cundinamarca" },
  { ciudad: "Girardot", departamento: "Cundinamarca" },
  { ciudad: "Cota", departamento: "Cundinamarca" },
  { ciudad: "Tocancipá", departamento: "Cundinamarca" },
  { ciudad: "Sopó", departamento: "Cundinamarca" },
  { ciudad: "La Calera", departamento: "Cundinamarca" },
  // Valle del Cauca
  { ciudad: "Palmira", departamento: "Valle del Cauca" },
  { ciudad: "Jamundí", departamento: "Valle del Cauca" },
  { ciudad: "Yumbo", departamento: "Valle del Cauca" },
  { ciudad: "Tuluá", departamento: "Valle del Cauca" },
  { ciudad: "Buga", departamento: "Valle del Cauca" },
  { ciudad: "Cartago", departamento: "Valle del Cauca" },
  { ciudad: "Buenaventura", departamento: "Valle del Cauca" },
  // Costa
  { ciudad: "Soledad", departamento: "Atlántico" },
  { ciudad: "Malambo", departamento: "Atlántico" },
  { ciudad: "Puerto Colombia", departamento: "Atlántico" },
  { ciudad: "Turbaco", departamento: "Bolívar" },
  { ciudad: "Magangué", departamento: "Bolívar" },
  { ciudad: "Ciénaga", departamento: "Magdalena" },
  { ciudad: "Montería", departamento: "Córdoba" },
  { ciudad: "Cereté", departamento: "Córdoba" },
  { ciudad: "Lorica", departamento: "Córdoba" },
  { ciudad: "Sahagún", departamento: "Córdoba" },
  { ciudad: "Sincelejo", departamento: "Sucre" },
  { ciudad: "Corozal", departamento: "Sucre" },
  { ciudad: "Valledupar", departamento: "Cesar" },
  { ciudad: "Aguachica", departamento: "Cesar" },
  { ciudad: "Riohacha", departamento: "La Guajira" },
  { ciudad: "Maicao", departamento: "La Guajira" },
  { ciudad: "San Andrés", departamento: "San Andrés y Providencia" },
  // Santanderes
  { ciudad: "Floridablanca", departamento: "Santander" },
  { ciudad: "Girón", departamento: "Santander" },
  { ciudad: "Piedecuesta", departamento: "Santander" },
  { ciudad: "Barrancabermeja", departamento: "Santander" },
  { ciudad: "San Gil", departamento: "Santander" },
  { ciudad: "Villa del Rosario", departamento: "Norte de Santander" },
  { ciudad: "Los Patios", departamento: "Norte de Santander" },
  { ciudad: "Ocaña", departamento: "Norte de Santander" },
  { ciudad: "Pamplona", departamento: "Norte de Santander" },
  // Eje cafetero
  { ciudad: "Dosquebradas", departamento: "Risaralda" },
  { ciudad: "Santa Rosa de Cabal", departamento: "Risaralda" },
  { ciudad: "Villamaría", departamento: "Caldas" },
  { ciudad: "La Dorada", departamento: "Caldas" },
  { ciudad: "Armenia", departamento: "Quindío" },
  { ciudad: "Calarcá", departamento: "Quindío" },
  // Centro y sur
  { ciudad: "Espinal", departamento: "Tolima" },
  { ciudad: "Neiva", departamento: "Huila" },
  { ciudad: "Pitalito", departamento: "Huila" },
  { ciudad: "Garzón", departamento: "Huila" },
  { ciudad: "Acacías", departamento: "Meta" },
  { ciudad: "Tunja", departamento: "Boyacá" },
  { ciudad: "Duitama", departamento: "Boyacá" },
  { ciudad: "Sogamoso", departamento: "Boyacá" },
  { ciudad: "Chiquinquirá", departamento: "Boyacá" },
  { ciudad: "Paipa", departamento: "Boyacá" },
  { ciudad: "Popayán", departamento: "Cauca" },
  { ciudad: "Santander de Quilichao", departamento: "Cauca" },
  { ciudad: "Pasto", departamento: "Nariño" },
  { ciudad: "Ipiales", departamento: "Nariño" },
  { ciudad: "Tumaco", departamento: "Nariño" },
  // Capitales de la Orinoquía, la Amazonía y el Pacífico
  { ciudad: "Yopal", departamento: "Casanare" },
  { ciudad: "Arauca", departamento: "Arauca" },
  { ciudad: "Florencia", departamento: "Caquetá" },
  { ciudad: "Mocoa", departamento: "Putumayo" },
  { ciudad: "Quibdó", departamento: "Chocó" },
  { ciudad: "Leticia", departamento: "Amazonas" },
  { ciudad: "San José del Guaviare", departamento: "Guaviare" },
  { ciudad: "Inírida", departamento: "Guainía" },
  { ciudad: "Mitú", departamento: "Vaupés" },
  { ciudad: "Puerto Carreño", departamento: "Vichada" },
]

/** El resto, en orden alfabético (como se lee en el selector). */
export const CIUDADES_RESTO: CiudadCO[] = [...OTRAS].sort((a, b) => a.ciudad.localeCompare(b.ciudad, "es"))

const TODAS: CiudadCO[] = [...CIUDADES_PRINCIPALES, ...CIUDADES_RESTO]

/** Valor de la opción "Otra ciudad o municipio" del selector. */
export const OTRA_CIUDAD = "__otra"

/** Valor de una opción del selector: ciudad y departamento juntos, porque
 *  hay nombres que se repiten (Caldas es municipio de Antioquia y también un
 *  departamento). */
export const claveCiudad = (c: CiudadCO) => `${c.ciudad}|${c.departamento}`

/** Texto de la opción: "Envigado · Antioquia"; Bogotá va sola. */
export const etiquetaCiudad = (c: CiudadCO) =>
  c.departamento === "Bogotá D.C." ? "Bogotá D.C." : `${c.ciudad} · ${c.departamento}`

export const ciudadPorClave = (clave: string) => TODAS.find(c => claveCiudad(c) === clave)

/** ¿Esta ciudad y departamento están en la lista? */
export const enLista = (ciudad: string, departamento: string) =>
  TODAS.find(c => c.ciudad === ciudad && c.departamento === departamento)

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/**
 * Para la ciudad guardada en la cuenta, que se escribió a mano ("medellin",
 * "Medellín, Antioquia"): la de la lista que corresponda, si es una sola.
 */
export function buscarCiudad(texto: string): CiudadCO | undefined {
  const [crudo, dep] = String(texto || "").split(",").map(normal)
  // "Bogotá D.C." y "Bogota DC" son Bogotá.
  const nombre = (crudo || "").replace(/\s*d\.?\s*c\.?$/, "")
  if (!nombre) return undefined
  const hallazgos = TODAS.filter(c => normal(c.ciudad) === nombre && (!dep || normal(c.departamento) === dep))
  return hallazgos.length === 1 ? hallazgos[0] : undefined
}

/** Los 32 departamentos y Bogotá D.C., para "Otra ciudad o municipio". */
export const DEPARTAMENTOS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
  "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima",
  "Valle del Cauca", "Vaupés", "Vichada",
] as const
