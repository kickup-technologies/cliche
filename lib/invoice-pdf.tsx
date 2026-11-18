import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { Order } from "@/app/admin-cliche-secret/types"

/**
 * Factura de venta en PDF — documento real y descargable (no el diálogo de
 * imprimir del navegador). Deja por escrito QUÉ se pidió, a QUÉ precio
 * unitario, cuántas unidades, el importe de cada línea y el total, con el
 * descuento y el envío desglosados.
 *
 * Paleta de marca: crema #FAF8F5 · café #2D1A14 · terracota #A67163.
 * Tipografías integradas en el motor (Times-Roman / Helvetica): nada que
 * descargar, así que el PDF se genera igual de rápido en el servidor.
 */

const INK = "#2D1A14"
const TERRA = "#A67163"
const LINE = "#E2DAD5"
const SOFT = "#FAF8F5"

const fmt = (n: number) => `$${Math.round(n || 0).toLocaleString("es-CO")}`

const ESTADOS: Record<string, string> = {
  pending: "Pendiente de pago", paid: "Pagado", confirmed: "Confirmado",
  preparing: "En preparación", shipped: "Despachado", delivered: "Entregado",
  cancelled: "Cancelado",
}

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 58, paddingHorizontal: 44, fontSize: 10, color: INK, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  top: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 14 },
  brand: { fontFamily: "Times-Roman", fontSize: 24, letterSpacing: 3 },
  brandSub: { fontSize: 7, letterSpacing: 2.6, color: TERRA, marginTop: 3 },
  company: { fontSize: 8, color: "#6B5A52", marginTop: 9, lineHeight: 1.5 },
  metaBox: { alignItems: "flex-end", maxWidth: 210 },
  metaTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, letterSpacing: 0.5 },
  metaLine: { fontSize: 8.5, color: "#6B5A52", marginTop: 3 },
  badge: { marginTop: 7, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, fontSize: 7.5, letterSpacing: 0.8 },
  cols: { flexDirection: "row", gap: 26, marginTop: 20, marginBottom: 20 },
  col: { flex: 1 },
  h3: { fontSize: 7.5, letterSpacing: 1.6, color: TERRA, marginBottom: 5 },
  p: { fontSize: 9.5, marginBottom: 2, lineHeight: 1.45 },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  thead: { flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: INK, paddingBottom: 6 },
  th: { fontSize: 7.5, letterSpacing: 1.3, color: TERRA },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, paddingVertical: 8 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 44, textAlign: "center" },
  cUnit: { width: 82, textAlign: "right" },
  cTotal: { width: 88, textAlign: "right" },
  itemName: { fontSize: 9.5, lineHeight: 1.35 },
  comp: { fontSize: 8, color: "#7A6960", marginTop: 2, lineHeight: 1.35 },
  totals: { marginLeft: "auto", width: 250, marginTop: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.6, borderTopColor: INK, marginTop: 5, paddingTop: 8 },
  grandTxt: { fontFamily: "Helvetica-Bold", fontSize: 14 },
  notes: { marginTop: 22, backgroundColor: SOFT, borderRadius: 7, padding: 11, fontSize: 9, color: "#5C4B43", lineHeight: 1.5 },
  legal: { marginTop: 18, fontSize: 7.5, color: "#8A7A72", lineHeight: 1.6 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 28, borderTopWidth: 0.7, borderTopColor: LINE, paddingTop: 9, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: TERRA },
})

/** Número de factura legible y estable, derivado del id del pedido. */
export function invoiceNumber(o: Order): string {
  return `CL-${String(o.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`
}

/** Día del pedido en Bogotá (UTC-5 fijo, sin horario de verano) como AAAA-MM-DD. */
function bogotaDay(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ""
  return new Date(t - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Versión sin tildes ni signos, apta para el nombre de un archivo. */
function asciiSlug(s: string): string {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/**
 * Nombre del archivo: la persona y la fecha del pedido, que es como se busca
 * una factura después. Se devuelven las dos formas porque la cabecera HTTP
 * solo admite ASCII: `ascii` para el atributo clásico y `utf8` (con tildes)
 * para `filename*`, que es el que usan los navegadores modernos.
 */
export function invoiceFileName(o: Order): { ascii: string; utf8: string } {
  const fecha = bogotaDay(o.created_at)
  const nombre = (o.customer_name || "").trim() || "Cliente"
  const cola = [asciiSlug(nombre) || "Cliente", fecha].filter(Boolean).join("-")
  return {
    ascii: `Factura-${cola}.pdf`,
    utf8: `Factura ${nombre}${fecha ? ` ${fecha}` : ""}.pdf`,
  }
}

export function InvoiceDocument({ order: o }: { order: Order }) {
  const numero = invoiceNumber(o)
  const fecha = new Date(o.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
  const items = o.items || []
  const pagado = ["paid", "confirmed", "preparing", "shipped", "delivered"].includes(o.status)
  const dir = o.shipping_address

  // El pedido guarda el TOTAL ya cobrado. Subtotal y envío se reconstruyen
  // desde las líneas para que la factura cuadre consigo misma.
  const subtotal = items.reduce((n, i) => n + (i.price || 0) * (i.quantity || 0), 0)
  const descuento = o.discount_amount || 0
  const envio = Math.max(0, Math.round(o.total - subtotal + descuento))

  return (
    <Document title={`Factura ${numero} — Cliché`} author="Cliché Aromas" subject={`Factura de venta ${numero}`}>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <View>
            <Text style={s.brand}>CLICHÉ</Text>
            <Text style={s.brandSub}>MARKETING OLFATIVO</Text>
            <Text style={s.company}>
              Cliché S.A.S. · NIT 901.432.536-8{"\n"}
              Calle 5A # 43B-25, Local 101 (Edificio Meridian){"\n"}
              El Poblado, Medellín, Colombia{"\n"}
              clichecomercioexterior@gmail.com · clichecolombia.com
            </Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaTitle}>FACTURA DE VENTA</Text>
            <Text style={[s.metaTitle, { fontSize: 15, marginTop: 2 }]}>{numero}</Text>
            <Text style={s.metaLine}>Fecha: {fecha}</Text>
            <Text style={s.metaLine}>Referencia: {o.id}</Text>
            <Text style={[s.badge, pagado ? { backgroundColor: "#E4F1EC", color: "#2F6552" } : { backgroundColor: "#F8EAD9", color: "#8A5A3B" }]}>
              {(ESTADOS[o.status] || o.status).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.h3}>FACTURAR A</Text>
            <Text style={[s.p, s.strong]}>{o.customer_name || "Consumidor final"}</Text>
            {o.customer_id_number ? <Text style={s.p}>C.C. / NIT: {o.customer_id_number}</Text> : <Text style={s.p}>Consumidor final</Text>}
            {o.customer_phone ? <Text style={s.p}>{o.customer_phone}</Text> : null}
            {o.customer_email ? <Text style={s.p}>{o.customer_email}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.h3}>ENTREGAR EN</Text>
            <Text style={s.p}>{dir?.address || "—"}</Text>
            <Text style={s.p}>{[dir?.city, dir?.department].filter(Boolean).join(", ") || "—"}, Colombia</Text>
            {o.carrier ? <Text style={[s.p, { marginTop: 5 }]}>Transportadora: {o.carrier}</Text> : null}
            {o.tracking_number ? <Text style={s.p}>Guía: {o.tracking_number}</Text> : null}
          </View>
        </View>

        {/* Detalle: qué se pidió, cuántas unidades, a qué precio y el importe */}
        <View style={s.thead} fixed>
          <Text style={[s.th, s.cDesc]}>DESCRIPCIÓN</Text>
          <Text style={[s.th, s.cQty]}>CANT.</Text>
          <Text style={[s.th, s.cUnit]}>PRECIO UNIT.</Text>
          <Text style={[s.th, s.cTotal]}>IMPORTE</Text>
        </View>
        {items.map((i, n) => (
          <View key={n} style={s.tr} wrap={false}>
            <View style={s.cDesc}>
              <Text style={s.itemName}>{i.name || i.product_id}</Text>
              {/* Kit personalizado: se listan los frascos que eligió el cliente */}
              {i.kind === "pack" && i.components?.length ? (
                <Text style={s.comp}>{i.components.map((c) => `• ${c.name} x${c.quantity}`).join("\n")}</Text>
              ) : null}
            </View>
            <Text style={[s.itemName, s.cQty]}>{i.quantity}</Text>
            <Text style={[s.itemName, s.cUnit]}>{i.price ? fmt(i.price) : "—"}</Text>
            <Text style={[s.itemName, s.cTotal]}>{i.price ? fmt(i.price * i.quantity) : "—"}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(subtotal)}</Text>
          </View>
          {descuento > 0 ? (
            <View style={s.totalRow}>
              <Text>Descuento{o.discount_code ? ` (${o.discount_code})` : ""}</Text>
              <Text>-{fmt(descuento)}</Text>
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text>Envío</Text>
            <Text>{envio > 0 ? fmt(envio) : "GRATIS"}</Text>
          </View>
          <View style={s.grand}>
            <Text style={s.grandTxt}>TOTAL</Text>
            <Text style={s.grandTxt}>{fmt(o.total)}</Text>
          </View>
        </View>

        {dir?.notes ? <Text style={s.notes}>Notas del pedido: {dir.notes}</Text> : null}

        <Text style={s.legal}>
          Valores en pesos colombianos (COP), impuestos incluidos. Entrega estimada de 7 a 9 días
          hábiles; envío gratuito en compras desde $300.000. Documento generado electrónicamente;
          es válido sin firma ni sello.
        </Text>

        <View style={s.footer} fixed>
          <Text>Gracias por tu compra — Cliché, marketing olfativo desde Medellín.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
