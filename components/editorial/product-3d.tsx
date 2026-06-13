"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

/**
 * Product3D — réplica procedural del producto real (ref: foto de catálogo).
 * Botella cilíndrica de vidrio ámbar con gatillo pulverizador negro estilo
 * pistola y etiqueta envolvente dibujada en canvas: fondo crema, pinceladas
 * orgánicas oliva, salpicaduras rust, monograma, título en caps espaciadas
 * y los 250ml. Config-driven: cada aroma del catálogo puede tener su preset.
 * En dev expone window.__renderBottle(w, h, angle) para capturar PNGs.
 */
export interface BottleConfig {
  /** título en dos líneas, p. ej. ["DULCE", "LANA"] */
  title: [string, string]
  body: string[]
  ml: string
  glassColor: number
  liquidColor: number
  attenuation: number
  /** render original del producto: la etiqueta se extrae de aquí */
  photo?: string
  /** rect de la etiqueta dentro de la foto (px) */
  labelRect?: { x: number; y: number; w: number; h: number }
  /** arco que cubre la etiqueta alrededor de la botella (rad) */
  arc?: number
}

export const DULCE_LANA: BottleConfig = {
  title: ["DULCE", "LANA"],
  body: ["Delicados tonos dulces que", "devuelven a la infancia, al calor", "de los abrazos y la lana."],
  ml: "250ml",
  glassColor: 0x9c5430,
  liquidColor: 0x8a4426,
  attenuation: 0x57280f,
  photo: "/images/products/dulce-lana.png",
  labelRect: { x: 448, y: 500, w: 238, h: 362 },
  arc: Math.PI * 0.95,
}

function drawLabel(cfg: BottleConfig): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext("2d")!

  // fondo crema
  ctx.fillStyle = "#f2ead9"
  ctx.fillRect(0, 0, 1024, 1024)

  // pinceladas orgánicas oliva-arena (blobs bezier, lado izquierdo y fondo)
  ctx.fillStyle = "#a08c5f"
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(390, 0)
  ctx.bezierCurveTo(290, 190, 350, 330, 230, 470)
  ctx.bezierCurveTo(140, 580, 200, 700, 90, 820)
  ctx.bezierCurveTo(40, 880, 0, 900, 0, 900)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(1024, 700)
  ctx.bezierCurveTo(900, 760, 870, 880, 940, 1024)
  ctx.lineTo(1024, 1024)
  ctx.closePath()
  ctx.fill()
  // vetas más claras sobre los blobs (textura "lana peinada")
  ctx.strokeStyle = "rgba(242,234,217,0.35)"
  ctx.lineWidth = 7
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.moveTo(40 + i * 28, -20)
    ctx.bezierCurveTo(160 + i * 22, 260, 60 + i * 26, 520, 130 + i * 20, 860)
    ctx.stroke()
  }

  // salpicaduras rust (lado derecho y esquina inferior izquierda)
  ctx.fillStyle = "#9c4a1f"
  const rnd = (seed: number) => {
    // pseudo-random determinista para que el render sea reproducible
    const x = Math.sin(seed * 127.1) * 43758.5453
    return x - Math.floor(x)
  }
  for (let i = 0; i < 26; i++) {
    const x = 700 + rnd(i) * 290
    const y = 120 + rnd(i + 50) * 560
    ctx.beginPath()
    ctx.arc(x, y, 2 + rnd(i + 99) * 11, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 10; i++) {
    const x = 80 + rnd(i + 200) * 260
    const y = 840 + rnd(i + 300) * 150
    ctx.beginPath()
    ctx.arc(x, y, 2 + rnd(i + 400) * 8, 0, Math.PI * 2)
    ctx.fill()
  }

  // panel central crema (la zona limpia donde vive el texto)
  ctx.fillStyle = "#f4eee0"
  ctx.beginPath()
  ctx.ellipse(512, 470, 330, 400, 0, 0, Math.PI * 2)
  ctx.fill()

  // monograma script
  ctx.fillStyle = "#7d6a45"
  ctx.textAlign = "center"
  ctx.font = 'italic 700 92px Georgia, "Times New Roman", serif'
  ctx.fillText("ℬ", 512, 280)

  // título en caps espaciadas
  ctx.font = "600 78px Inter, Arial, sans-serif"
  ctx.fillStyle = "#7d6a45"
  const spaced = (s: string) => s.split("").join("   ")
  ctx.fillText(spaced(cfg.title[0]), 512, 420)
  ctx.fillText(spaced(cfg.title[1]), 512, 510)

  // descripción
  ctx.font = "600 34px Inter, Arial, sans-serif"
  ctx.fillStyle = "#8a4d2a"
  cfg.body.forEach((line, i) => ctx.fillText(line, 512, 590 + i * 46))

  // mililitros
  ctx.font = "500 38px Inter, Arial, sans-serif"
  ctx.fillStyle = "#6b5638"
  ctx.fillText(cfg.ml, 512, 870)

  return c
}

export function Product3D({
  className = "",
  config = DULCE_LANA,
}: {
  className?: string
  config?: BottleConfig
}) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const cfg = config

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    renderer.domElement.style.display = "block"

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 1.7, 8.6)
    camera.lookAt(0, 1.55, 0)

    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.6

    const key = new THREE.DirectionalLight(0xfff1e0, 2.0)
    key.position.set(3.5, 4, 2.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xdde6ff, 0.45)
    fill.position.set(-3, 2, -2)
    scene.add(fill)

    const group = new THREE.Group()
    scene.add(group)

    // ── botella cilíndrica ámbar (proporción de la foto: ~2.3 : 1) ──
    const pts: Array<[number, number]> = [
      [0.0, 0.0], [0.47, 0.0], [0.52, 0.06], [0.52, 2.0],
      [0.51, 2.12], [0.45, 2.22], [0.32, 2.3], [0.22, 2.34], [0.19, 2.38], [0.19, 2.56],
    ]
    const profile = pts.map(([x, y]) => new THREE.Vector2(x, y))
    const glass = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 96),
      new THREE.MeshPhysicalMaterial({
        transmission: 0.95,
        thickness: 0.5,
        roughness: 0.05,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        color: cfg.glassColor,
        attenuationColor: new THREE.Color(cfg.attenuation),
        attenuationDistance: 0.9,
      })
    )
    group.add(glass)

    // líquido ámbar hasta el hombro
    const liquidPts = pts
      .filter(([, y]) => y <= 2.1)
      .map(([x, y]) => new THREE.Vector2(Math.max(0, x - 0.05), y + 0.02))
    liquidPts.push(new THREE.Vector2(0, 2.05))
    const liquid = new THREE.Mesh(
      new THREE.LatheGeometry(liquidPts, 96),
      new THREE.MeshPhysicalMaterial({
        color: cfg.liquidColor,
        transmission: 0.5,
        thickness: 1.6,
        roughness: 0.15,
        ior: 1.34,
      })
    )
    group.add(liquid)

    // ── gatillo pulverizador negro (silueta extruida tipo pistola) ──
    const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.42, metalness: 0.05 })

    // collar que abraza el cuello
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.5, 64), black)
    collar.position.y = 2.6
    group.add(collar)

    // silueta lateral: cuerpo horizontal + aleta trasera + boquilla + gatillo
    const s = new THREE.Shape()
    s.moveTo(-0.34, 2.86)
    s.lineTo(-0.34, 3.04)                          // espalda recta
    s.quadraticCurveTo(-0.345, 3.16, -0.28, 3.26)  // sube en curva a la aleta
    s.quadraticCurveTo(-0.235, 3.32, -0.18, 3.27)  // tope de aleta fino
    s.quadraticCurveTo(-0.12, 3.18, -0.05, 3.08)   // baja al lomo
    s.quadraticCurveTo(0.2, 3.1, 0.4, 3.04)        // lomo hacia el frente
    s.quadraticCurveTo(0.52, 3.01, 0.56, 2.98)     // nariz superior
    s.lineTo(0.56, 2.9)                            // punta (boquilla)
    s.quadraticCurveTo(0.42, 2.86, 0.3, 2.86)      // bajo la nariz
    s.quadraticCurveTo(0.42, 2.6, 0.24, 2.34)      // gatillo: borde exterior
    s.quadraticCurveTo(0.19, 2.3, 0.15, 2.37)      // punta del gatillo redonda
    s.quadraticCurveTo(0.29, 2.58, 0.12, 2.84)     // gatillo: borde interior
    s.quadraticCurveTo(-0.12, 2.87, -0.34, 2.86)   // base del cuerpo
    s.closePath()
    const head = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 4 }),
      black
    )
    head.position.z = -0.1
    group.add(head)

    // boquilla frontal
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 32), black)
    nozzle.rotation.z = Math.PI / 2
    nozzle.position.set(0.62, 2.98, 0)
    group.add(nozzle)

    // ── etiqueta envolvente ──
    // arranca con la etiqueta dibujada como placeholder y, si hay foto del
    // render original, se reemplaza por la etiqueta REAL extraída de ahí
    const arc = cfg.arc ?? Math.PI * 1.5
    const labelTex = new THREE.CanvasTexture(drawLabel(cfg))
    labelTex.colorSpace = THREE.SRGBColorSpace
    labelTex.anisotropy = 8
    const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.55, side: THREE.FrontSide })
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.532, 0.532, 1.6, 96, 1, true, -arc / 2, arc),
      labelMat
    )
    label.position.y = 1.02
    group.add(label)

    if (cfg.photo && cfg.labelRect) {
      const img = new Image()
      img.src = cfg.photo
      img.onload = () => {
        // la foto trae la curvatura del cilindro ya proyectada: deshacerla
        // remapeando columna a columna con la inversa del seno, para que al
        // envolverla de nuevo en el cilindro la perspectiva no se duplique
        const { x, y, w, h } = cfg.labelRect!
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
        const realTex = new THREE.CanvasTexture(out)
        realTex.colorSpace = THREE.SRGBColorSpace
        realTex.anisotropy = 8
        labelMat.map = realTex
        labelMat.needsUpdate = true
        // ajustar alto de la etiqueta a la proporción real del recorte:
        // alto = arco_cuerda · (h/w) — mantiene el aspecto del arte original
        const chord = 2 * 0.532 * half
        const realH = chord * (h / w)
        label.scale.y = realH / 1.6
        renderer.render(scene, camera)
      }
    }

    // sombra de contacto
    const shadowCanvas = document.createElement("canvas")
    shadowCanvas.width = 256
    shadowCanvas.height = 256
    const sctx = shadowCanvas.getContext("2d")!
    const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120)
    grad.addColorStop(0, "rgba(40,25,15,0.4)")
    grad.addColorStop(1, "rgba(40,25,15,0)")
    sctx.fillStyle = grad
    sctx.fillRect(0, 0, 256, 256)
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 2.7),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.001
    scene.add(shadow)

    // ── interacción ──
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("pointermove", onMove, { passive: true })

    const resize = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener("resize", resize)

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let running = false
    const t0 = performance.now()

    const frame = () => {
      const t = (performance.now() - t0) / 1000
      mouse.x += (mouse.tx - mouse.x) * 0.05
      mouse.y += (mouse.ty - mouse.y) * 0.05
      group.rotation.y = Math.sin(t * 0.3) * 0.55 + mouse.x * 0.4
      group.rotation.x = mouse.y * 0.1
      group.position.y = Math.sin(t * 0.8) * 0.04
      renderer.render(scene, camera)
      if (running && !reduce) raf = requestAnimationFrame(frame)
    }
    frame()

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running && !reduce) {
        running = true
        raf = requestAnimationFrame(frame)
      } else if (!entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(mount)

    if (process.env.NODE_ENV !== "production") {
      ;(window as unknown as Record<string, unknown>).__renderBottle = (w = 1024, h = 1280, angle = 0) => {
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        group.rotation.set(0, angle, 0)
        group.position.y = 0
        renderer.render(scene, camera)
        const url = renderer.domElement.toDataURL("image/png")
        resize()
        return url
      }
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("resize", resize)
      pmrem.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [config])

  return <div ref={mountRef} className={className} aria-hidden />
}
