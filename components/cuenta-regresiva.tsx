"use client"

import { useEffect, useState } from "react"
import { Timer } from "lucide-react"
import { AVISO_NAVIDAD } from "@/lib/aviso-navidad"

/**
 * Cuenta regresiva SIEMPRE contra una fecha real: el último día para pedir y
 * recibir antes de Navidad. Pasada la fecha, no se muestra. Reemplaza la
 * "oferta especial para ti" de 30 minutos que se reiniciaba (escasez falsa).
 */
export function CuentaRegresiva({ className = "" }: { className?: string }) {
  const [ahora, setAhora] = useState<number | null>(null)
  useEffect(() => {
    setAhora(Date.now())
    const t = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (ahora === null || !AVISO_NAVIDAD.activo || ahora >= AVISO_NAVIDAD.hasta) return null

  const falta = AVISO_NAVIDAD.hasta - ahora
  const dias = Math.floor(falta / 86_400_000)
  const h = Math.floor((falta % 86_400_000) / 3_600_000)
  const m = Math.floor((falta % 3_600_000) / 60_000)
  const sg = Math.floor((falta % 60_000) / 1000)
  const dos = (n: number) => String(n).padStart(2, "0")
  return (
    <div className={`cuenta-regresiva ${className}`} role="timer" aria-live="off">
      <Timer size={20} aria-hidden="true" />
      <span className="cuenta-regresiva-texto">Para recibirlo antes de Navidad, pide en</span>
      <b className="cuenta-regresiva-reloj">
        {dias > 0 && <>{dias} {dias === 1 ? "día" : "días"} · </>}{dos(h)}:{dos(m)}:{dos(sg)}
      </b>
    </div>
  )
}
