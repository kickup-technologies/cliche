import { createClient } from "@supabase/supabase-js"

// Cliente público (frontend)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cliente de servidor con permisos completos (solo en API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  image_url: string
  badge: string | null
  badge_color: string | null
  stock: number
  rating: number
  reviews: number
  is_active: boolean
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

export interface Order {
  id: string
  stripe_session_id: string
  customer_email: string
  customer_name: string
  total: number
  status: "pending" | "paid" | "shipped" | "cancelled"
  items: CartItem[]
  discount_code: string | null
  created_at: string
}
