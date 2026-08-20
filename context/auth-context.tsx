"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { navigateWithCurtain } from "@/components/page-transition"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data, error }: { data: { user: User | null }; error: { status?: number } | null }) => {
      if (!data.user) {
        try {
          if (error && [400, 401, 403].includes(error.status ?? 0)) {
            // Rechazo DEFINITIVO (token de refresco muerto): purgar la cookie
            // vieja. Sin esto queda una "sesión fantasma": el menú saluda por
            // nombre pero el servidor trata como anónimo.
            const { data: s } = await supabase.auth.getSession()
            if (s.session) {
              try { await supabase.auth.signOut({ scope: "local" }) } catch { /* cookie ya inválida */ }
            }
            setUser(null)
          } else {
            // Fallo TRANSITORIO (sin red, Supabase caído): mostrar la sesión
            // en caché en vez de "desloguear" visualmente a un usuario válido;
            // TOKEN_REFRESHED/SIGNED_OUT posteriores la corrigen.
            const { data: s } = await supabase.auth.getSession()
            setUser(s.session?.user ?? null)
          }
        } catch {
          setUser(null)
        }
      } else {
        setUser(data.user)
      }
      setLoading(false)
    }).catch(async () => {
      // Fallo raro (storage/LockManager, red caída a mitad): no dejar la app
      // colgada en loading. Se muestra lo que haya en la sesión local en caché;
      // los eventos posteriores (TOKEN_REFRESHED/SIGNED_OUT) la corrigen.
      try {
        const { data: s } = await supabase.auth.getSession()
        setUser(s.session?.user ?? null)
      } catch {
        setUser(null)
      }
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      // INITIAL_SESSION viene de la caché local sin validar contra el servidor;
      // la decisión inicial la toma getUser() (validado) arriba.
      if (event === "INITIAL_SESSION") return
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await getSupabaseBrowser().auth.signOut()
    setUser(null)
    // Cortina de transición hacia el inicio (misma animación que abrir un producto)
    navigateWithCurtain("/")
  }, [])

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
