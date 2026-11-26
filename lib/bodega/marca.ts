import { CARRIERS } from "@/lib/carriers"

export const MARCA = {
  nombre: "Cliché",
  corto: "cliche",
  logo: "/images/logo-cliche.png",
  panel: "/admin-cliche-secret",
  transportadoras: CARRIERS.map((c) => [c.id, c.name] as [string, string]),
}
