import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnnouncementBar } from "@/components/announcement-bar"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { supabase, isSupabaseConfigured, type BlogPost } from "@/lib/supabase"
import { withSeoOverride } from "@/lib/seo"

// ISR: el panel revalida esta ruta al guardar (publicación inmediata).
export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from("blog_posts").select("slug").eq("published", true)
      if (data && data.length) return data.map((p) => ({ slug: p.slug }))
    }
  } catch {
    /* sin posts aún */
  }
  return []
}

interface Props {
  params: Promise<{ slug: string }>
}

const fechaLarga = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    : ""

async function getPost(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single()
  return (data as BlogPost) || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: "Artículo no encontrado" }

  return withSeoOverride(`/blog/${slug}`, {
    title: post.title,
    description: post.excerpt || `${post.title} — Blog de Cliché Colombia`,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt || "",
      type: "article",
      images: post.cover_url ? [{ url: post.cover_url }] : [],
    },
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const { data: othersData } = isSupabaseConfigured
    ? await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_url, published_at, created_at")
        .eq("published", true)
        .neq("slug", slug)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3)
    : { data: null }
  const others = (othersData as BlogPost[]) || []

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || "",
    image: post.cover_url ? [post.cover_url] : [],
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: { "@type": "Organization", name: post.author || "Cliché Colombia" },
    publisher: { "@type": "Organization", name: "Cliché Colombia" },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-20">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Cabecera editorial */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al blog
          </Link>
          <header className="mt-6">
            <p className="eyebrow text-primary">{fechaLarga(post.published_at || post.created_at)}</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-bold text-foreground leading-[1.1]">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-xl text-muted-foreground leading-relaxed">{post.excerpt}</p>
            )}
            {post.author && (
              <p className="mt-5 text-sm text-foreground/60">
                Por <span className="font-semibold text-foreground">{post.author}</span>
              </p>
            )}
          </header>

          {post.cover_url && (
            <div className="mt-8 overflow-hidden rounded-2xl shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_url} alt={post.title} className="w-full object-cover" />
            </div>
          )}

          {/* Cuerpo del artículo (HTML del editor, ya sanitizado al guardar) */}
          <div
            className="blog-content mt-10"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Otros artículos */}
        {others.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
            <div className="border-t border-border pt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Sigue leyendo</h2>
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary link-underline">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} className="group block hover-lift">
                    {p.cover_url && (
                      <div className="overflow-hidden rounded-2xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.cover_url}
                          alt=""
                          className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {fechaLarga(p.published_at || p.created_at)}
                    </p>
                    <h3 className="mt-1.5 font-serif text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
