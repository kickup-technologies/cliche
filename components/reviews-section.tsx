"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Star, MessageSquare, CheckCircle, User, BadgeCheck,
  ImagePlus, X, Play, Loader2, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Review } from "@/lib/supabase"

const MAX_FILES = 6
const MAX_SIZE_MB = 50

interface Props { productId: string }

// ── Star picker ──────────────────────────────────────────────────────────────
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
          <Star className={`w-6 h-6 transition-colors ${star <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  )
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

// ── Media grid inside a review card ─────────────────────────────────────────
function MediaGrid({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!urls.length) return null

  return (
    <>
      <div className={`grid gap-2 pl-12 ${urls.length === 1 ? "grid-cols-1 max-w-xs" : urls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
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

// ── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
  })
  const urls = review.media_urls ?? []

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{review.reviewer_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground">{date}</p>
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                <BadgeCheck className="w-3 h-3" />Compra verificada
              </span>
            </div>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-12">{review.comment}</p>
      )}
      {urls.length > 0 && <MediaGrid urls={urls.slice(0, 6)} />}
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

// ── Main component ───────────────────────────────────────────────────────────
export function ReviewsSection({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState("")
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

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    setUploadError("")
    const incoming = Array.from(files)
    const tooBig = incoming.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) { setUploadError(`"${tooBig.name}" supera los ${MAX_SIZE_MB}MB permitidos.`); return }
    const combined = [...mediaFiles, ...incoming].slice(0, MAX_FILES)
    setMediaFiles(combined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reviewer_name.trim() || form.rating === 0) return
    setIsSubmitting(true)
    setUploadError("")

    try {
      // 1. Upload media first
      let media_urls: string[] = []
      if (mediaFiles.length > 0) {
        const fd = new FormData()
        mediaFiles.forEach((f) => fd.append("files", f))
        const upRes = await fetch("/api/reviews/upload", { method: "POST", body: fd })
        const upData = await upRes.json()
        media_urls = upData.urls ?? []
      }

      // 2. Post review with media URLs
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

      setSubmitted(true)
      setShowForm(false)
      setMediaFiles([])
      fetchReviews()
    } catch {
      setUploadError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="resenas" className="mt-20 pt-8 border-t border-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Reseñas</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(avgRating)} />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} de 5 · {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
        {!submitted && (
          <Button
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {showForm ? "Cancelar" : "Escribir reseña"}
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && !submitted && (
        <form onSubmit={handleSubmit} className="bg-muted/30 border border-border rounded-2xl p-6 mb-8 space-y-5">
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
              Comentario <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Cuéntanos qué te pareció el aroma, la duración, la presentación..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Media upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Fotos / Videos <span className="text-muted-foreground font-normal">(opcional · máx. {MAX_FILES} archivos · {MAX_SIZE_MB}MB c/u)</span>
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
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-primary"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Agregar</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {uploadError && (
              <p className="text-sm text-red-600 font-medium">{uploadError}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || form.rating === 0 || !form.reviewer_name.trim()}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publicando...</>
            ) : "Publicar reseña"}
          </Button>
        </form>
      )}

      {/* Success */}
      {submitted && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Gracias por tu reseña</p>
            <p className="text-sm text-muted-foreground">Tu opinión ya es visible para la comunidad.</p>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-muted/30 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sé el primero en dejar tu reseña</p>
          <p className="text-sm mt-1">Tu experiencia ayuda a otros a elegir sus aromas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  )
}
