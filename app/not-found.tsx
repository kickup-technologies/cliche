import Link from "next/link"

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-[#FAF8F5] text-[#2D1A14]">
      <p className="text-sm tracking-[0.25em] uppercase text-[#C4958A] mb-4">Error 404</p>
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Página no encontrada</h1>
      <p className="text-[#2D1A14]/70 max-w-md mb-8">
        El aroma que buscas no está en esta dirección. Quizás se movió o ya no existe.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="px-6 py-3 rounded-full bg-[#2D1A14] text-[#FAF8F5] font-semibold hover:bg-[#6B3D30] transition-colors"
        >
          Volver al inicio
        </Link>
        <Link
          href="/#productos"
          className="px-6 py-3 rounded-full border border-[#2D1A14]/20 font-semibold hover:bg-[#2D1A14]/5 transition-colors"
        >
          Ver productos
        </Link>
      </div>
    </main>
  )
}
