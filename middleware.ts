import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Todas las rutas excepto estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|videos|models|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|glb)$).*)"],
}
