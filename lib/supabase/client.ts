"use client"

import { createBrowserClient } from "@supabase/ssr"

/**
 * Cliente Supabase para el NAVEGADOR (sesión del usuario, cookies). Lo usan
 * el contexto de auth, el carrito por usuario y la página de cuenta. Respeta
 * RLS con el JWT del usuario → cada quien solo ve SUS datos.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
