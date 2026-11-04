import { Cormorant_Garamond, Manrope } from "next/font/google"

/**
 * Tipografías premium de las landings B2B (/empresas): display Cormorant
 * Garamond (con itálicas para los acentos) + texto/UI Manrope. Se sirven desde
 * el propio dominio (next/font) y solo se aplican dentro del contenedor de la
 * landing mediante variables CSS; el resto del sitio sigue con Playfair + Inter.
 * next/font genera fuentes de respaldo con métricas ajustadas → sin saltos.
 */
export const empDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-emp-display",
})

export const empSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-emp-sans",
  preload: false, // solo se precarga la display (la del titular del héroe)
})

export const empFontVars = `${empDisplay.variable} ${empSans.variable}`
