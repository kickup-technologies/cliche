import { createClient } from "@supabase/supabase-js"

// Fallbacks para que createClient NO lance al importar el módulo cuando faltan
// las variables de entorno (p. ej. en local sin .env.local). Sin esto, cualquier
// route que importe este archivo respondería un 500 HTML y el frontend rompería
// al hacer r.json(). Con placeholders, el módulo carga y las consultas fallan de
// forma controlada (los routes ya las envuelven en try/catch y devuelven JSON).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

// true cuando hay credenciales reales. Permite saltar consultas (y su timeout
// de ~7s) cuando se corre en local sin .env.local y usar el catálogo local.
export const isSupabaseConfigured = !SUPABASE_URL.includes("placeholder")

// Cliente público (frontend)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Cliente de servidor con permisos completos (solo en API routes)
export function createServerClient() {
  return createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  )
}

// Tipos
export interface Product {
  id: string
  name: string
  slug: string
  price: number
  original_price: number | null
  description: string | null
  // Título opcional que el admin puede mostrar arriba de la descripción
  description_title?: string | null
  image_url: string
  image_urls: string[]
  category?: string | null
  badge: string | null
  badge_color: string | null
  stock: number
  rating: number
  reviews: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Promotion {
  id: string
  code: string
  discount_percent: number
  end_time: string | null
  is_active: boolean
  description: string | null
}

export interface CartItem {
  id: string
  session_id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Review {
  id: string
  product_id: string
  reviewer_name: string
  rating: number
  comment: string | null
  is_approved: boolean
  media_urls: string[]
  created_at: string
}

export interface Order {
  id: string
  stripe_session_id: string
  customer_email: string
  customer_name: string
  total: number
  status: "pending" | "confirmed" | "preparing" | "paid" | "shipped" | "delivered" | "cancelled"
  items: CartItem[]
  discount_code: string | null
  created_at: string
}
