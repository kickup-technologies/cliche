import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Newspaper } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnnouncementBar } from "@/components/announcement-bar"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { supabase, isSupabaseConfigured, type BlogPost } from "@/lib/supabase"
import { withSeoOverride } from "@/lib/seo"

// ISR + revalidación al instante desde el panel (revalidateBlogPages).
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/blog", {
    title: "Blog",
    description:
      "Historias, guías y consejos de aromas para el hogar y la ropa. El blog de Cliché Colombia: marketing olfativo, aromaterapia y bienestar.",
    alternates: { canonical: "/blog" },
  })
}

const fechaLarga = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : ""

async function getPosts(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_url, author, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
  return (data as BlogPost[]) || []
}

export default async function BlogPage() {
  const posts = await getPosts()
  const [featured, ...rest] = posts

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Cabecera de la sección */}
          <div className="mb-10 lg:mb-14">
            <p className="eyebrow text-primary mb-3">Cliché Colombia</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              El Blog
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Historias, guías y consejos sobre aromas, bienestar y marketing olfativo.
            </p>
          </div>

          {!featured ? (
            <div className="py-24 text-center">
              <Newspaper className="w-10 h-10 text-foreground/20 mx-auto mb-4" />
              <p className="font-serif text-2xl text-foreground/60">Muy pronto publicaremos nuestro primer artículo</p>
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
              {/* Artículo destacado (el más reciente) */}
              <Link
                href={`/blog/${featured.slug}`}
                className="group lg:col-span-2 block"
              >
                {featured.cover_url && (
                  <div className="overflow-hidden rounded-2xl shadow-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featured.cover_url}
                      alt={featured.title}
                      className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="mt-6">
                  <p className="eyebrow text-primary">{fechaLarga(featured.published_at || featured.created_at)}</p>
                  <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="mt-3 text-lg text-muted-foreground leading-relaxed line-clamp-3">
                      {featured.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Leer artículo
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>

              {/* Rail lateral: los demás artículos */}
              <aside className="lg:border-l lg:border-border lg:pl-10">
                <p className="eyebrow text-foreground/50 mb-6">Más artículos</p>
                {rest.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este es nuestro primer artículo — pronto habrá más.
                  </p>
                ) : (
                  <div className="space-y-7">
                    {rest.map((p) => (
                      <Link key={p.id} href={`/blog/${p.slug}`} className="group flex gap-4">
                        {p.cover_url && (
                          <div className="w-24 h-20 flex-shrink-0 overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.cover_url}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {fechaLarga(p.published_at || p.created_at)}
                          </p>
                          <h3 className="mt-1 font-serif text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-3">
                            {p.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
