import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Solo refrescamos la sesión server-side donde IMPORTA (zonas con cuenta).
  // La autenticación de la UI es client-side (auth-context), y el navegador
  // refresca el token solo. Así el middleware NO corre en las páginas públicas
  // de alto tráfico (inicio, catálogo, productos…) → menos latencia por request
  // y cero carga a Supabase Auth en el grueso de las visitas (anónimas).
  matcher: ["/cuenta/:path*", "/checkout/:path*", "/favoritos/:path*", "/auth/:path*"],
}
