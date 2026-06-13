import * as THREE from "three"

/**
 * Extracción de la etiqueta real desde el render de producto.
 * Todos los renders del catálogo comparten plantilla (1080×1080, botella
 * centrada), así que el rect de la etiqueta es constante. La foto trae la
 * curvatura del cilindro ya proyectada: se deshace remapeando columna a
 * columna con la inversa del seno para poder re-envolverla en un cilindro
 * 3D sin duplicar la perspectiva.
 */
export const LABEL_RECT = { x: 448, y: 500, w: 238, h: 362 }
export const LABEL_ARC = Math.PI * 0.95

export interface LabelTexture {
  texture: THREE.CanvasTexture
  /** alto/ancho del arte — para dimensionar el cilindro de etiqueta */
  aspect: number
}

export function loadLabelTexture(
  photo: string,
  rect = LABEL_RECT,
  arc = LABEL_ARC
): Promise<LabelTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = photo
    img.onerror = reject
    img.onload = () => {
      const { x, y, w, h } = rect
      const out = document.createElement("canvas")
      out.width = 1024
      out.height = 1024
      const octx = out.getContext("2d")!
      const half = Math.sin(arc / 2)
      for (let u = 0; u < out.width; u++) {
        const phi = (u / (out.width - 1) - 0.5) * arc
        const sx = x + (0.5 + Math.sin(phi) / (2 * half)) * w
        const srcW = Math.max(0.5, (w * Math.cos(phi) * arc) / (2 * half * out.width))
        octx.drawImage(img, sx, y, srcW, h, u, 0, 1, out.height)
      }
      const texture = new THREE.CanvasTexture(out)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      resolve({ texture, aspect: h / w })
    }
  })
}

/** Vidrio ámbar del frasco Cliché — colores muestreados del render original */
export const AMBER_GLASS = {
  color: 0x9c5430,
  attenuation: 0x57280f,
}

/**
 * Etiqueta desde el arte PLANO original (sin frasco, sin curvar).
 * El arte conserva sus proporciones tipográficas: si la envoltura requiere
 * más ancho del que trae (90% de circunferencia), el fondo se extiende
 * estirando franjas de 4px de los bordes — cada fila del arte es color
 * plano (negro / degradado dorado), así que la extensión es invisible.
 * targetAspect = anchoEnvuelto / alto en unidades del modelo.
 */
export function loadFlatLabelTexture(
  url: string,
  targetAspect: number
): Promise<LabelTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = url
    img.onerror = reject
    img.onload = () => {
      const h = img.naturalHeight
      const w = Math.round(h * targetAspect)
      const out = document.createElement("canvas")
      out.width = w
      out.height = h
      const ctx = out.getContext("2d")!
      const artW = img.naturalWidth
      const x0 = Math.round((w - artW) / 2)
      if (x0 > 0) {
        // extensión por mosaico ping-pong de la franja limpia del borde
        // (sin texto): espejado alternado → continuidad perfecta en cada
        // costura y cero tipografía repetida en los laterales
        const tileW = Math.round(artW * 0.08)
        // lado izquierdo: llenar [0, x0) desde la costura hacia afuera
        let xEnd = x0
        let flip = true
        while (xEnd > 0) {
          const cw = Math.min(tileW, xEnd)
          ctx.save()
          if (flip) {
            ctx.translate(xEnd, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(img, 0, 0, cw, h, 0, 0, cw, h)
          } else {
            ctx.drawImage(img, 0, 0, cw, h, xEnd - cw, 0, cw, h)
          }
          ctx.restore()
          xEnd -= cw
          flip = !flip
        }
        // lado derecho: llenar [x0+artW, w) desde la costura hacia afuera
        let xStart = x0 + artW
        flip = true
        while (xStart < w) {
          const cw = Math.min(tileW, w - xStart)
          ctx.save()
          if (flip) {
            ctx.translate(xStart + cw, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(img, artW - cw, 0, cw, h, 0, 0, cw, h)
          } else {
            ctx.drawImage(img, artW - cw, 0, cw, h, xStart, 0, cw, h)
          }
          ctx.restore()
          xStart += cw
          flip = !flip
        }
      }
      ctx.drawImage(img, x0, 0)
      const texture = new THREE.CanvasTexture(out)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      resolve({ texture, aspect: h / w })
    }
  })
}

/** Arco de la etiqueta plana: vuelta completa (sin vidrio desnudo en la
 * espalda). El texto va centrado al frente y el fondo negro/dorado envuelve
 * los 360°, así la etiqueta se ve desde cualquier ángulo de rotación. */
export const FLAT_LABEL_ARC = Math.PI * 2
