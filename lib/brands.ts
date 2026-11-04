/**
 * Marcas reales que ya trabajan con Cliché (logos oficiales de
 * clichecolombia.com). Vive fuera de components/editorial/brand-logos.tsx
 * porque ese archivo es "use client": un componente de SERVIDOR que importa
 * una constante de un módulo cliente recibe una referencia opaca, no el
 * arreglo, y las landings (/empresas) arman la franja de logos en el servidor.
 */
export const BRANDS = [
  { src: "/images/brands/agua-bendita.webp", alt: "Agua Bendita" },
  { src: "/images/brands/seven-seven.webp", alt: "Seven Seven" },
  { src: "/images/brands/entreaguas.webp", alt: "Entreaguas" },
  { src: "/images/brands/clemont.webp", alt: "Clemont" },
  { src: "/images/brands/wild-and-pacific.webp", alt: "Wild & Pacific" },
  { src: "/images/brands/action-wear.webp", alt: "Action Wear" },
  { src: "/images/brands/ancora.png", alt: "Áncora" },
] as const
