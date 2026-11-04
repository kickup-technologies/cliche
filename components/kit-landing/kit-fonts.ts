import { Cormorant_Garamond, Manrope } from "next/font/google"

/**
 * Tipografías premium SOLO de las landings de Cliché (/arma-tu-kit y
 * /empresas): display Cormorant Garamond + texto/UI Manrope. Se sirven desde
 * el propio dominio (next/font) y se aplican como variables en el contenedor
 * de la landing; el layout raíz sigue con Playfair + Inter.
 * Solo se precarga la display (es la del titular del héroe).
 */
export const kitDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-kit-display",
  preload: true,
})

export const kitSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-kit-sans",
  preload: false,
})

/** Clases para el contenedor de la landing (variables + familia base). */
export const kitFontClass = `${kitDisplay.variable} ${kitSans.variable} kit-fonts`
