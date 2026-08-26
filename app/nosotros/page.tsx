import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnnouncementBar } from "@/components/announcement-bar"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { ImageTextOverlay } from "@/components/editorial/image-text-overlay"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { SplitText } from "@/components/editorial/split-text"
import { Leaf, Sparkles, MapPin, HandHeart, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  alternates: { canonical: "/nosotros" },
  title: "Nuestra historia",
  description:
    "Somos Cliché: marketing olfativo hecho en Colombia. Aromas artesanales, 100% naturales, diseñados para transformar espacios en sensaciones y recuerdos.",
}

const VALUES = [
  {
    Icon: Leaf,
    title: "100% natural",
    text: "Sin tóxicos ni parabenos. Fórmulas de alta concentración que no manchan ni irritan, pensadas para vivir cerca de ti.",
  },
  {
    Icon: HandHeart,
    title: "Artesanal",
    text: "Cada frasco se compone a mano, en lotes pequeños, cuidando la proporción exacta de cada nota. Calidad antes que cantidad.",
  },
  {
    Icon: MapPin,
    title: "Hecho en Colombia",
    text: "Diseñado, producido y envasado aquí. Creemos en el talento local y en una cadena cercana, responsable y transparente.",
  },
  {
    Icon: Sparkles,
    title: "Marketing olfativo",
    text: "El olfato es el sentido que más memoria despierta. Lo usamos para que tu espacio —o tu marca— deje una huella imposible de olvidar.",
  },
]

const STATS = [
  { value: "B2B", label: "marcas y hogares que confían" },
  { value: "20+", label: "aromas en colección" },
  { value: "100%", label: "natural y artesanal" },
  { value: "8 h", label: "de duración por aplicación" },
]

export default function NosotrosPage() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <ImageTextOverlay
          image="/images/lifestyle-living.jpg"
          eyebrow="Cliché Colombia"
          title="El aroma también cuenta tu historia"
          text="Somos una casa de marketing olfativo hecha en Colombia. Convertimos espacios en sensaciones y momentos en recuerdos."
          height="tall"
        />

        {/* Manifiesto */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
              Quiénes somos
            </p>
            <SplitText
              text="Nacimos para transformar lo invisible"
              as="h2"
              className="font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl"
            />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>
                Cliché empezó con una idea simple: un espacio no se recuerda por cómo se ve,
                sino por cómo se siente. Y nada activa la memoria como un aroma.
              </p>
              <p>
                Por eso diseñamos fragancias artesanales, 100% naturales, que no buscan
                tapar olores sino crear atmósferas. Cada nota está pensada para acompañar
                un momento: el comienzo de la mañana, la calma de la noche, la primera
                impresión de quien cruza tu puerta.
              </p>
              <p className="font-serif text-xl italic text-foreground/80">
                “No vendemos perfume para el aire. Creamos recuerdos invisibles.”
              </p>
            </div>
          </div>
        </section>

        {/* Split — imagen + texto */}
        <section className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 pb-24 md:grid-cols-2 md:gap-16 md:pb-32">
          <ScrollReveal distance={40}>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/lifestyle-bedroom.jpg"
                alt="Momento de aroma en el hogar"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </ScrollReveal>
          <ScrollReveal distance={40} delay={120}>
            <div>
              <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
                Nuestra obsesión
              </p>
              <h3 className="font-serif text-2xl font-medium leading-snug text-foreground md:text-4xl">
                El detalle que se siente antes de entrar
              </h3>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                Trabajamos en lotes pequeños, ajustando cada fórmula hasta que rinde,
                dura y se siente justo como debe. Sin atajos, sin químicos agresivos,
                sin promesas vacías.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                El resultado son aromas que viven a la vista, en la repisa o la mesa de
                noche, y que se quedan contigo mucho después del último puf.
              </p>
              <Link
                href="/catalogo"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-primary"
              >
                Explorar la colección <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* Stats band */}
        <section className="bg-[#2D1A14]">
          <div className="container mx-auto grid grid-cols-2 gap-8 px-4 py-16 md:grid-cols-4 md:py-20">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-serif text-4xl font-medium text-white md:text-5xl">{s.value}</p>
                <p className="mx-auto mt-2 max-w-[160px] text-xs leading-relaxed text-white/50 md:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Valores */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="mb-14 text-center">
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
              Lo que nos mueve
            </p>
            <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
              Cuatro promesas que no negociamos
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ Icon, title, text }, i) => (
              <ScrollReveal key={title} delay={i * 100} distance={32}>
                <div className="flex h-full flex-col items-center rounded-2xl border border-foreground/[0.06] bg-secondary/40 px-6 py-8 text-center">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* B2B / marketing olfativo */}
        <ImageTextOverlay
          image="/images/hero-main.jpg"
          eyebrow="Para empresas y marcas"
          title="Diseñamos la identidad olfativa de tu marca"
          text="Hoteles, spas, tiendas y marcas deportivas confían en nosotros para crear un aroma exclusivo que se vuelve parte de su experiencia."
          cta={{ label: "Solicitar cotización", href: "/catalogo" }}
          align="left"
        />

        {/* CTA final */}
        <section className="container mx-auto px-4 py-24 text-center md:py-32">
          <SplitText
            text="Encuentra el aroma que cuenta tu historia"
            as="h2"
            className="mx-auto max-w-2xl font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl"
          />
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
            Más de 20 fragancias artesanales esperando transformar tu espacio.
          </p>
          <Link
            href="/catalogo"
            className="mt-9 inline-flex items-center justify-center gap-2 bg-[#A67163] px-10 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#8B5E52]"
          >
            Ver la colección <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
