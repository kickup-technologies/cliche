/**
 * Página temporal de comparación de fondos para la intro.
 * Ver en /intro-options y elegir A, B o C. Se elimina tras decidir.
 */
const OPTIONS = [
  { id: "A", label: "Niebla de aroma", img: "/images/intro/intro-a.png" },
  { id: "B", label: "Textil en movimiento", img: "/images/intro/intro-b.png" },
  { id: "C", label: "Luz y partículas", img: "/images/intro/intro-c.png" },
]

export default function IntroOptions() {
  return (
    <main className="bg-[#1a1a1a]">
      {OPTIONS.map((o) => (
        <section
          key={o.id}
          className="relative flex h-screen w-full items-center justify-center overflow-hidden"
          style={{
            backgroundImage: `url(${o.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/30" />

          {/* etiqueta de opción */}
          <span className="absolute left-6 top-6 z-10 rounded-full bg-[#FAF8F5] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#2D1A14]">
            Opción {o.id} · {o.label}
          </span>

          {/* wordmark de intro encima */}
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="font-serif text-6xl font-medium tracking-tight text-[#FAF8F5] drop-shadow md:text-8xl">
              Cliché
            </h1>
            <span className="mt-5 block h-px w-28 bg-[#C4958A]" />
            <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-[#FAF8F5]/80">
              Aromas que transforman
            </p>
          </div>
        </section>
      ))}
    </main>
  )
}
