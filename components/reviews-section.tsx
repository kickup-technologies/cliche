"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Image from "next/image"
import {
  Star, MessageSquare, CheckCircle, BadgeCheck, ThumbsUp, ChevronDown,
  ImagePlus, X, Play, Loader2, ChevronLeft, ChevronRight, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Review } from "@/lib/supabase"
import { seededReviews } from "@/lib/seed-reviews"

const MAX_FILES = 6
// Vercel corta el cuerpo de la petición en ~4.5 MB, así que prometer más sería
// mentirle al visitante: esperaría la subida completa solo para ver un error.
// Cada archivo viaja en su propia petición para que el tope sea POR archivo.
const MAX_SIZE_MB = 4

interface Props {
  productId: string
  productName?: string
  productImage?: string | null
}

type SortKey = "rating" | "recent"

// ── Star picker (formulario) ──────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
        >
          <Star className={`w-6 h-6 transition-colors ${star <= (hovered || value) ? "fill-primary text-primary" : "fill-none text-foreground/25"}`} />
        </button>
      ))}
    </div>
  )
}

// ── Estrellas de solo lectura (oscuras, estilo editorial) ──────────────────────
function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={s <= Math.round(value) ? "fill-foreground text-foreground" : "fill-none text-foreground/20"}
        />
      ))}
    </div>
  )
}

// Separa la primera frase (titular en serif) del resto (cuerpo)
function splitComment(c: string) {
  const t = (c || "").trim()
  if (!t) return { title: "", body: "" }
  const idx = t.search(/[.!?]\s/)
  if (idx > 0 && idx < 80) {
    return { title: t.slice(0, idx + 1).trim(), body: t.slice(idx + 1).trim() }
  }
  if (t.length <= 70) return { title: t, body: "" }
  return { title: "", body: t }
}

// ── Media lightbox ───────────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const url = urls[idx]
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1))
      if (e.key === "ArrowRight") setIdx((i) => Math.min(urls.length - 1, i + 1))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [urls.length, onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={url} controls autoPlay className="w-full max-h-[80vh] rounded-xl object-contain" />
        ) : (
          <div className="relative w-full aspect-video">
            <Image src={url} alt="Media reseña" fill className="object-contain rounded-xl" />
          </div>
        )}
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(urls.length - 1, i + 1))}
              disabled={idx === urls.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-white/60 text-sm mt-3">{idx + 1} / {urls.length}</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Media grid dentro de una reseña ────────────────────────────────────────────
function MediaGrid({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!urls.length) return null

  return (
    <>
      <div className={`grid gap-2 ${urls.length === 1 ? "grid-cols-1 max-w-xs" : urls.length === 2 ? "grid-cols-2 max-w-sm" : "grid-cols-3 max-w-md"}`}>
        {urls.map((url, i) => {
          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)
          return (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted hover:opacity-90 transition-opacity group"
            >
              {isVideo ? (
                <>
                  <video src={url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </>
              ) : (
                <Image src={url} alt={`Media ${i + 1}`} fill className="object-cover" />
              )}
              {i === 2 && urls.length > 3 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                  +{urls.length - 3}
                </div>
              )}
            </button>
          )
        })}
      </div>
      {lightboxIdx !== null && (
        <Lightbox urls={urls} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  )
}

// ── Review card (layout editorial: meta izquierda · contenido derecha) ─────────
function ReviewCard({ review, productName, productImage, onDelete }: {
  review: Review; productName?: string; productImage?: string | null; onDelete: (id: string) => void
}) {
  const date = new Date(review.created_at).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric",
  })
  const urls = review.media_urls ?? []
  const { title, body } = splitComment(review.comment ?? "")
  const recommends = review.rating >= 4
  const isSeed = review.id.startsWith("seed-")
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" })
      if (res.ok) onDelete(review.id)
    } catch { /* silent */ }
    finally { setDeleting(false); setConfirming(false) }
  }

  return (
    <div className="group relative grid gap-5 border-b border-border py-8 md:grid-cols-[190px_1fr]">
      {/* Meta del reseñador */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">{review.reviewer_name}</p>
          {/* "Comprador verificado" SOLO para reseñas reales: mostrarla en las
              semilla es publicidad engañosa (Ley 1480, riesgo ante la SIC). */}
          {!isSeed && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-foreground/70">
              <BadgeCheck className="w-3.5 h-3.5 text-primary" /> Comprador verificado
            </p>
          )}
        </div>

        {productName && (
          <div className="flex items-center gap-2.5">
            {productImage && (
              <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-muted/40">
                <Image src={productImage} alt={productName} fill className="object-contain p-1" />
              </div>
            )}
            <div className="text-xs leading-tight">
              <p className="text-muted-foreground">Reseñando</p>
              <p className="font-medium text-primary">{productName}</p>
            </div>
          </div>
        )}

        {recommends && (
          <p className="flex items-center gap-1.5 text-xs text-foreground/80">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
              <ThumbsUp className="h-2.5 w-2.5" />
            </span>
            Recomiendo este producto
          </p>
        )}
      </div>

      {/* Contenido */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <Stars value={review.rating} size={15} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{date}</span>
            {!isSeed && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center gap-1 rounded-lg p-1 text-xs font-medium transition-all ${
                  confirming
                    ? "bg-red-50 text-red-600 opacity-100"
                    : "text-muted-foreground/50 opacity-0 hover:text-red-500 group-hover:opacity-100"
                }`}
                title={confirming ? "Confirmar eliminación" : "Eliminar reseña"}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {confirming && <span>¿Eliminar?</span>}
              </button>
            )}
          </div>
        </div>

        {title && <h3 className="font-serif text-lg font-bold leading-snug text-foreground">{title}</h3>}
        {body && <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>}
        {urls.length > 0 && <MediaGrid urls={urls.slice(0, 6)} />}
      </div>
    </div>
  )
}

// ── File preview thumbnail ───────────────────────────────────────────────────
function FileThumbnail({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = URL.createObjectURL(file)
  const isVideo = file.type.startsWith("video/")

  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted group flex-shrink-0">
      {isVideo ? (
        <>
          <video src={url} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </>
      ) : (
        <Image src={url} alt={file.name} fill className="object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function ReviewsSection({ productId, productName, productImage }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [sort, setSort] = useState<SortKey>("rating")
  const [form, setForm] = useState({ reviewer_name: "", rating: 0, comment: "" })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`)
      const data = await res.json()
      setReviews(Array.isArray(data) ? data : [])
    } catch {
      setReviews([])
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  // Reseñas reales (BD) + semilla (prueba social) combinadas para todo lo visible
  const seeds = useMemo(() => seededReviews(productId), [productId])
  const combined = useMemo(() => [...reviews, ...seeds], [reviews, seeds])

  const avgRating = combined.length
    ? combined.reduce((s, r) => s + r.rating, 0) / combined.length
    : 0

  // Distribución 5★ → 1★
  const dist = useMemo(
    () => [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: combined.filter((r) => Math.round(r.rating) === star).length,
    })),
    [combined],
  )

  const sortedReviews = useMemo(() => {
    const arr = [...combined]
    if (sort === "rating") {
      arr.sort((a, b) => b.rating - a.rating || +new Date(b.created_at) - +new Date(a.created_at))
    } else {
      arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    }
    return arr
  }, [combined, sort])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    setUploadError("")
    const incoming = Array.from(files)
    const tooBig = incoming.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) { setUploadError(`"${tooBig.name}" supera los ${MAX_SIZE_MB}MB permitidos.`); return }
    const combined = [...mediaFiles, ...incoming].slice(0, MAX_FILES)
    setMediaFiles(combined)
  }

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reviewer_name.trim() || form.rating === 0) return
    setIsSubmitting(true)
    setUploadError("")

    try {
      // Un archivo por petición: todos juntos superarían el límite de ~4.5 MB
      // que la plataforma impone al cuerpo de la petición. Y si alguno falla,
      // se avisa y NO se publica la reseña sin sus fotos en silencio.
      const media_urls: string[] = []
      for (const f of mediaFiles) {
        const fd = new FormData()
        fd.append("files", f)
        const upRes = await fetch("/api/reviews/upload", { method: "POST", body: fd })
        if (!upRes.ok) {
          const err = await upRes.json().catch(() => ({ error: "" }))
          setUploadError(err.error || `No se pudo subir "${f.name}". Quítalo o intenta de nuevo.`)
          return
        }
        const upData = await upRes.json()
        media_urls.push(...(upData.urls ?? []))
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, ...form, media_urls }),
      })

      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error || "Error al publicar. Intenta de nuevo.")
        return
      }

      const newReview = await res.json()
      setReviews((prev) => [newReview, ...prev])
      setSubmitted(true)
      setShowForm(false)
      setMediaFiles([])
      setForm({ reviewer_name: "", rating: 0, comment: "" })
    } catch {
      setUploadError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="resenas" className="pt-8">
      {/* Título centrado */}
      <h2 className="text-center font-serif text-3xl font-bold text-foreground mb-10">Reseñas</h2>

      {/* Resumen + distribución */}
      {combined.length > 0 && (
        <div className="mb-10">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <span className="font-serif text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
              <Stars value={avgRating} size={22} />
            </div>
            <p className="text-sm text-muted-foreground">
              Basado en {combined.length} reseña{combined.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="mx-auto max-w-md space-y-2">
            {dist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-8 items-center gap-1 text-foreground">
                  {star} <Star className="h-3 w-3 fill-foreground text-foreground" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-700"
                    style={{ width: `${combined.length ? (count / combined.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          {combined.length} reseña{combined.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          {combined.length > 1 && (
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="appearance-none rounded-full border border-border bg-transparent py-2 pl-4 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="rating">Mejor calificación</option>
                <option value="recent">Más recientes</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
          {!submitted && (
            <Button
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm((v) => !v)}
              className="shrink-0 rounded-full"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {showForm ? "Cancelar" : "Escribir reseña"}
            </Button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && !submitted && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-muted/30 p-6">
          <h3 className="font-semibold text-foreground">Tu experiencia</h3>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Calificación *</label>
            <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tu nombre *</label>
            <Input
              value={form.reviewer_name}
              onChange={(e) => setForm((f) => ({ ...f, reviewer_name: e.target.value }))}
              placeholder="Ej. Valentina R."
              className="bg-card"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Cuéntanos qué te pareció el aroma, la duración, la presentación..."
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Fotos / Videos <span className="font-normal text-muted-foreground">(opcional · máx. {MAX_FILES} archivos · {MAX_SIZE_MB}MB c/u)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {mediaFiles.map((file, i) => (
                <FileThumbnail
                  key={i}
                  file={file}
                  onRemove={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
              {mediaFiles.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Agregar</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploadError && <p className="text-sm font-medium text-red-600">{uploadError}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || form.rating === 0 || !form.reviewer_name.trim()}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando...</>
            ) : "Publicar reseña"}
          </Button>
        </form>
      )}

      {/* Éxito */}
      {submitted && (
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-5">
          <CheckCircle className="h-6 w-6 flex-shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">¡Gracias por tu reseña!</p>
            <p className="text-sm text-muted-foreground">Tu opinión ya es visible para la comunidad.</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="mt-6 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      ) : combined.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Sé el primero en dejar tu reseña</p>
          <p className="mt-1 text-sm">Tu experiencia ayuda a otros a elegir sus aromas.</p>
        </div>
      ) : (
        <div className="mt-2">
          {sortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              productName={productName}
              productImage={productImage}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
