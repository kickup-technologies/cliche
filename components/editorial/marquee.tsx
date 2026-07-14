"use client"

/**
 * Marquee — banda de texto en scroll infinito (estilo editorial renesme).
 * Repite los items con separadores y se desplaza horizontalmente en bucle.
 */
interface MarqueeProps {
  items?: string[]
  /** segundos por ciclo completo — mayor = más lento */
  speed?: number
  className?: string
  dark?: boolean
}

const DEFAULT_ITEMS = [
  "Marketing olfativo",
  "Aromas artesanales",
  "Hecho en Colombia",
  "No mancha textiles",
  "Marcas que confían",
]

export function Marquee({
  items = DEFAULT_ITEMS,
  speed = 30,
  className = "",
  dark = false,
}: MarqueeProps) {
  // Duplicamos la lista para un bucle continuo sin saltos
  const loop = [...items, ...items, ...items, ...items]

  return (
    <div
      className={`relative overflow-hidden border-y py-4 ${
        dark
          ? "bg-foreground text-background border-foreground"
          : "bg-secondary text-foreground border-border"
      } ${className}`}
    >
      <div
        className="flex w-max animate-[marquee_var(--marquee-speed)_linear_infinite] whitespace-nowrap"
        style={{ ["--marquee-speed" as string]: `${speed}s` }}
      >
        {loop.map((item, i) => (
          <span
            key={i}
            className="mx-6 inline-flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.25em]"
          >
            {item}
            <span className="opacity-40">✦</span>
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-25%);
          }
        }
      `}</style>
    </div>
  )
}
