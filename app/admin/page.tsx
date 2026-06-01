import { redirect } from "next/navigation"

// El panel de administración fue unificado en /admin-cliche-secret.
// Esta ruta antigua queda como redirección para evitar dos paneles divergentes.
export default function AdminLegacyRedirect() {
  redirect("/admin-cliche-secret")
}
