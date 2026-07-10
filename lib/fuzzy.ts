// Búsqueda "inteligente" de productos por nombre, tolerante a errores de tipeo.
// Maneja: acentos, mayúsculas, substrings, transposiciones ("idnigo" → "indigo")
// y errores de 1–2 letras (inserción/borrado/sustitución) según el largo de la
// consulta. No requiere ninguna dependencia externa.

/** Minúsculas + quita acentos/diacríticos + deja solo [a-z0-9] y espacios. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Distancia de Levenshtein (inserción, borrado, sustitución = coste 1). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

/** Ordena los caracteres (para detectar transposiciones: "idnigo" ~ "indigo"). */
function sortedChars(s: string): string {
  return s.replace(/\s/g, "").split("").sort().join("")
}

/** Distancia de tipeo permitida según el largo de la consulta. */
function maxTypoDistance(len: number): number {
  if (len <= 3) return 1
  if (len <= 7) return 2
  return 3
}

/**
 * Puntúa qué tan bien "query" coincide con "name".
 * 0 = sin coincidencia. Cuanto mayor, más relevante.
 */
export function scoreMatch(query: string, name: string): number {
  const q = normalize(query)
  const n = normalize(name)
  if (!q || !n) return 0

  if (n === q) return 1000
  if (n.startsWith(q)) return 900 - (n.length - q.length)
  if (n.includes(q)) return 780

  const words = n.split(" ").filter(Boolean)
  if (words.some((w) => w.startsWith(q))) return 720
  if (words.some((w) => w.includes(q))) return 640

  // Tolerancia a errores de tipeo: contra el nombre completo y cada palabra.
  const maxDist = maxTypoDistance(q.length)
  let best = Infinity
  for (const cand of [n, ...words]) {
    // Solo comparamos con candidatos de largo parecido (evita falsos positivos).
    if (Math.abs(cand.length - q.length) > maxDist + 1) continue
    best = Math.min(best, levenshtein(q, cand))
  }
  if (best <= maxDist) return 560 - best * 60

  // Transposiciones y anagramas cercanos (misma bolsa de letras).
  const qs = sortedChars(q)
  if (words.some((w) => sortedChars(w) === qs)) return 520
  if (sortedChars(n) === qs) return 500

  return 0
}

export interface Searchable {
  name: string
  [key: string]: unknown
}

/** Devuelve los items que coinciden, ordenados por relevancia. */
export function smartSearch<T extends Searchable>(query: string, items: T[], limit = 8): T[] {
  const q = query.trim()
  if (!q) return []
  return items
    .map((item) => ({ item, score: scoreMatch(q, item.name) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item)
}
