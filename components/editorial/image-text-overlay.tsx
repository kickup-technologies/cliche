import Image from "next/image"
import Link from "next/link"
import { SplitText } from "@/components/editorial/split-text"
import { Magnetic } from "@/components/magnetic"

/**
 * ImageTextOverlay — banda full-bleed con imagen de fondo y texto superpuesto
 * (estilo renesme "image-with-text-overlay"). Editorial y de alto impacto.
 */
interface ImageTextOverlayProps {
  image: string
  eyebrow?: string
  title: string
  text?: string
  cta?: { label: string; href: string }
  align?: "center" | "left"
  height?: "tall" | "medium"
}

export function ImageTextOverlay({
  image,
  eyebrow,
  title,
  text,
  cta,
  align = "center",
  height = "medium",
}: ImageTextOverlayProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${
        height === "tall" ? "h-[80vh] min-h-[520px]" : "h-[60vh] min-h-[420px]"
      }`}
    >
      <Image src={image} alt={title} fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={`absolute inset-0 flex flex-col justify-center px-6 ${
          align === "left" ? "items-start text-left md:px-24" : "items-center text-center"
        }`}
      >
        <div className="max-w-xl">
          {eyebrow && (
            <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-white/85">
              {eyebrow}
            </p>
          )}
          <SplitText
            text={title}
            as="h2"
            className="font-serif text-3xl font-medium leading-tight text-white md:text-5xl"
          />
          {text && (
            <p className="mt-5 text-base font-light leading-relaxed text-white/90 md:text-lg">
              {text}
            </p>
          )}
          {cta && (
            <Magnetic className="mt-8">
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center border border-white px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white hover:text-foreground"
              >
                {cta.label}
              </Link>
            </Magnetic>
          )}
        </div>
      </div>
    </section>
  )
}
