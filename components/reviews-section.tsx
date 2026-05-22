"use client"

import { useState, useEffect, useCallback } from "react"
import { Star, MessageSquare, CheckCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Review } from "@/lib/supabase"

interface Props {
  productId: string
}

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
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{review.reviewer_name}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-12">{review.comment}</p>
      )}
    </div>
  )
}

export function ReviewsSection({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({ reviewer_name: "", rating: 0, comment: "" })

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`)
      const data = await res.json()
      setReviews(data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reviewer_name.trim() || form.rating === 0) return
    setIsSubmitting(true)
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, ...form }),
      })
      setSubmitted(true)
      setShowForm(false)
      fetchReviews()
    } catch {
      // silent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="resenas" className="mt-20 pt-8 border-t border-border">
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

      {/* Formulario */}
      {showForm && !submitted && (
        <form
          onSubmit={handleSubmit}
          className="bg-muted/30 border border-border rounded-2xl p-6 mb-8 space-y-5"
        >
          <h3 className="font-semibold text-foreground">Tu experiencia</h3>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Calificación</label>
            <StarRating
              value={form.rating}
              onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tu nombre</label>
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

          <Button
            type="submit"
            disabled={isSubmitting || form.rating === 0 || !form.reviewer_name.trim()}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Enviando..." : "Publicar reseña"}
          </Button>
        </form>
      )}

      {/* Confirmación */}
      {submitted && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Gracias por tu reseña</p>
            <p className="text-sm text-muted-foreground">Tu opinión ya es visible para la comunidad.</p>
          </div>
        </div>
      )}

      {/* Lista de reseñas */}
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
