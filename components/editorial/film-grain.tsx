/**
 * FilmGrain — grano de película sutil sobre todo el sitio. Textura
 * procedural (SVG feTurbulence en data-URI, sin assets ni requests).
 * El grano rompe los degradados digitales "perfectos" y da tacto
 * fotográfico/análogo — el detalle que separa una web premium de una
 * plantilla. pointer-events-none: invisible para la interacción.
 */
const NOISE_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`

export function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] opacity-[0.035]"
      style={{ backgroundImage: `url("${NOISE_SVG}")`, backgroundSize: "160px 160px" }}
    />
  )
}
