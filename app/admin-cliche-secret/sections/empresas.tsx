"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Briefcase, Search, RefreshCw, Download, Loader2, AlertCircle, MessageCircle, Megaphone, Sparkles } from "lucide-react"
import { adminFetch } from "@/lib/admin-client"
import { ORIGIN_LABEL, type OriginChannel } from "@/lib/b2b-leads"

/**
 * Sección "Empresas" — contactos del formulario de cotización de la landing
 * B2B /empresas (tabla b2b_leads vía /api/admin/b2b-leads), con su ORIGEN
 * (Google Ads, Meta, otra campaña, referido o directo) y la fecha. Solo
 * lectura + filtro por origen + búsqueda + exportación a CSV. Mismo patrón
 * visual que "Clientes".
 */

interface Lead {
  id: string
  created_at: string
  necesidad: string
  nombre: string
  empresa: string
  tipo_negocio: string
  ciudad: string
  cantidad: string | null
  para_cuando: string | null
  telefono: string
  email: string | null
  mensaje: string | null
  origen: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  fbclid: string | null
  referrer: string | null
  landing_page: string | null
  landed_at: string | null
}

const ORIGIN_BADGE: Record<string, string> = {
  google: "bg-blue-100 text-blue-700",
  meta: "bg-indigo-100 text-indigo-700",
  otra_campana: "bg-amber-100 text-amber-700",
  referido: "bg-teal-100 text-teal-700",
  directo: "bg-[#2D1A14]/5 text-[#2D1A14]/60",
}

const originLabel = (o: string) => ORIGIN_LABEL[o as OriginChannel] ?? o

const fechaHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })
    : "—"

/** Detalle del origen en una línea: campaña / anuncio / término / ids de clic. */
function originDetail(l: Lead): string {
  const parts = [
    [l.utm_source, l.utm_medium].filter(Boolean).join(" / "),
    l.utm_campaign ? `campaña: ${l.utm_campaign}` : "",
    l.utm_content ? `anuncio: ${l.utm_content}` : "",
    l.utm_term ? `término: ${l.utm_term}` : "",
    l.gclid || l.gbraid || l.wbraid ? "gclid" : "",
    l.fbclid ? "fbclid" : "",
  ].filter(Boolean)
  if (parts.length) return parts.join(" · ")
  if (l.referrer) {
    try { return new URL(l.referrer).hostname.replace(/^www\./, "") } catch { return l.referrer }
  }
  return ""
}

function waLink(l: Lead) {
  const text = `Hola ${l.nombre}, te escribimos de Cliché por tu solicitud de cotización para ${l.empresa}.`
  return `https://wa.me/57${l.telefono}?text=${encodeURIComponent(text)}`
}

export function EmpresasSection() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [origin, setOrigin] = useState<string>("todos")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch("/api/admin/b2b-leads")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar los contactos.")
        setLeads([])
        return
      }
      setLeads(Array.isArray(data.leads) ? data.leads : [])
    } catch {
      setError("Error de conexión.")
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads.filter((l) => {
      if (origin !== "todos" && l.origen !== origin) return false
      if (!q) return true
      return [l.nombre, l.empresa, l.ciudad, l.telefono, l.email || "", l.utm_campaign || ""].some((v) => v.toLowerCase().includes(q))
    })
  }, [leads, query, origin])

  const stats = useMemo(() => {
    const now = Date.now()
    return {
      total: leads.length,
      last7: leads.filter((l) => now - new Date(l.created_at).getTime() < 7 * 86400000).length,
      google: leads.filter((l) => l.origen === "google").length,
      meta: leads.filter((l) => l.origen === "meta").length,
    }
  }, [leads])

  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const rows = [
      ["Fecha", "Nombre", "Empresa", "Celular", "Correo", "Necesidad", "Tipo de negocio", "Ciudad", "Cantidad", "Para cuándo", "Mensaje",
        "Origen", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "Referrer", "Página de aterrizaje", "Fecha de aterrizaje"],
      ...filtered.map((l) => [
        fechaHora(l.created_at), l.nombre, l.empresa, l.telefono, l.email || "", l.necesidad, l.tipo_negocio, l.ciudad,
        l.cantidad || "", l.para_cuando || "", l.mensaje || "", originLabel(l.origen), l.utm_source || "", l.utm_medium || "",
        l.utm_campaign || "", l.utm_content || "", l.utm_term || "", l.gclid || l.gbraid || l.wbraid || "", l.fbclid || "",
        l.referrer || "", l.landing_page || "", fechaHora(l.landed_at),
      ]),
    ]
    // BOM para que Excel abra las tildes bien
    const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `empresas-cliche-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tiles = [
    { label: "Contactos", value: stats.total, icon: Briefcase },
    { label: "Últimos 7 días", value: stats.last7, icon: Sparkles },
    { label: "Desde Google Ads", value: stats.google, icon: Megaphone },
    { label: "Desde Meta", value: stats.meta, icon: Megaphone },
  ]

  const originOptions = ["todos", ...Object.keys(ORIGIN_LABEL)]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#2D1A14]">Empresas</h1>
          <p className="text-sm text-[#2D1A14]/50 mt-1">
            Solicitudes de cotización de clichecolombia.com/empresas, con su origen y fecha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-[#2D1A14]/15 bg-white text-sm font-medium text-[#2D1A14]/70 hover:text-[#2D1A14] hover:border-[#2D1A14]/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="h-10 px-4 rounded-xl bg-[#2D1A14] text-sm font-medium text-white hover:bg-[#3D2A24] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4">
            <div className="flex items-center gap-2 text-[#2D1A14]/40">
              <Icon className="w-4 h-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 font-serif text-3xl text-[#2D1A14]">{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 h-11 px-4 rounded-xl border border-[#2D1A14]/15 bg-white focus-within:ring-2 focus-within:ring-[#A67163]/30">
          <Search className="w-4 h-4 text-[#2D1A14]/30 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, empresa, ciudad, celular o campaña…"
            className="w-full bg-transparent text-sm text-[#2D1A14] placeholder:text-[#2D1A14]/30 outline-none"
          />
        </div>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          aria-label="Filtrar por origen"
          className="h-11 px-3 rounded-xl border border-[#2D1A14]/15 bg-white text-sm text-[#2D1A14]/80 outline-none"
        >
          {originOptions.map((o) => (
            <option key={o} value={o}>{o === "todos" ? "Todos los orígenes" : originLabel(o)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#A67163]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-10 text-center">
          <Briefcase className="w-8 h-8 mx-auto text-[#2D1A14]/20 mb-3" />
          <p className="text-sm text-[#2D1A14]/50">
            {query || origin !== "todos" ? "Ningún contacto coincide con el filtro." : "Todavía no hay solicitudes de empresas."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((l) => {
              const detail = originDetail(l)
              return (
                <div key={l.id} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#2D1A14]">
                        {l.empresa} <span className="font-normal text-[#2D1A14]/50">· {l.nombre}</span>
                      </p>
                      <p className="text-xs text-[#2D1A14]/50 mt-0.5">
                        {l.tipo_negocio} · {l.ciudad}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ORIGIN_BADGE[l.origen] ?? ORIGIN_BADGE.directo}`}>
                        {originLabel(l.origen)}
                      </span>
                      <span className="text-[11px] text-[#2D1A14]/45 whitespace-nowrap">{fechaHora(l.created_at)}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    <p className="text-[#2D1A14]/80"><span className="text-[#2D1A14]/40">Necesita: </span>{l.necesidad}</p>
                    <p className="text-[#2D1A14]/80">
                      <span className="text-[#2D1A14]/40">Cantidad: </span>{l.cantidad || "—"}
                      <span className="text-[#2D1A14]/40"> · Para: </span>{l.para_cuando || "—"}
                    </p>
                    <p className="text-[#2D1A14]/80">
                      <span className="text-[#2D1A14]/40">Celular: </span>
                      <a href={waLink(l)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#A67163] hover:underline">
                        {l.telefono} <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </p>
                    {l.email && (
                      <p className="text-[#2D1A14]/80 truncate">
                        <span className="text-[#2D1A14]/40">Correo: </span>
                        <a href={`mailto:${l.email}`} className="text-[#A67163] hover:underline">{l.email}</a>
                      </p>
                    )}
                  </div>

                  {l.mensaje && (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-[#FAF8F5] px-3 py-2 text-sm text-[#2D1A14]/75">{l.mensaje}</p>
                  )}

                  {(detail || l.landing_page) && (
                    <p className="mt-3 pt-3 border-t border-[#2D1A14]/6 text-[11px] text-[#2D1A14]/45 break-words">
                      {detail && <>Origen: {detail}</>}
                      {detail && l.landing_page && " · "}
                      {l.landing_page && <>Aterrizó en {l.landing_page} ({fechaHora(l.landed_at)})</>}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-[#2D1A14]/35">
            {filtered.length} {filtered.length === 1 ? "contacto" : "contactos"}
            {query || origin !== "todos" ? " (filtrados)" : ""} · El origen es el primer toque del visitante (UTM, gclid o fbclid).
          </p>
        </>
      )}
    </div>
  )
}
