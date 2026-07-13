"use client"

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { modelForSlug } from "@/lib/product-models"

/**
 * Gracias3DCarousel — carrusel "Seguir comprando" a pantalla completa.
 *
 * UN SOLO Canvas WebGL con todos los frascos en la misma escena (renderizar un
 * Canvas por producto reventaría el límite de contextos WebGL y mataría el móvil).
 * La fila se desplaza lento en bucle infinito (posición por módulo, sin saltos
 * visibles) y cada frasco gira sobre su propio eje.
 *
 * El nombre NO va pegado a cada frasco (eso se solapaba): hay UNA sola etiqueta
 * centrada que muestra el aroma que está en el centro y enlaza a su producto.
 */

const TILT_Z = (28 * Math.PI) / 180
const FIT = 1.95     // alto objetivo de cada frasco
const SPACING = 3.3  // separación (grande → cubre pantallas anchas sin huecos)
const SPEED = 0.5    // velocidad del carrusel (unidades/seg) — lento
const SPIN = 0.5     // giro sobre el eje (rad/seg)
const COUNT = 6      // nº de frascos cargados (equilibrio peso/cobertura)

type CarouselItem = { slug: string; name: string; url: string }

/** "Aroma Agua — Fragancia Fresca" → "Agua" */
function shortName(name: string) {
  return name.replace(/^Aroma\s+/i, "").split("—")[0].trim()
}

function StudioEnv() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex
    return () => {
      scene.environment = null
      tex.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Bottle({
  item, index, count, scrollRef,
}: {
  item: CarouselItem
  index: number
  count: number
  scrollRef: React.MutableRefObject<number>
}) {
  const { scene } = useGLTF(item.url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef<THREE.Group>(null!)
  const spinRef = useRef<THREE.Group>(null!)

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    cloned.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    return FIT / maxDim
  }, [cloned])

  const total = count * SPACING

  useFrame((_, delta) => {
    // Posición por módulo: baja a la izquierda y reaparece por la derecha sin
    // salto visible (el salto ocurre fuera de cámara, en |x| = total/2).
    const s = scrollRef.current
    const x = (((index * SPACING - s) % total) + total) % total - total / 2
    if (groupRef.current) groupRef.current.position.x = x
    if (spinRef.current) spinRef.current.rotation.y += delta * SPIN
  })

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, TILT_Z]}>
        <group ref={spinRef} scale={scale}>
          <primitive object={cloned} />
        </group>
      </group>
    </group>
  )
}

/** Avanza el scroll y actualiza la ÚNICA etiqueta con el aroma más centrado. */
function Driver({
  items, scrollRef, pausedRef, labelRef,
}: {
  items: CarouselItem[]
  scrollRef: React.MutableRefObject<number>
  pausedRef: React.MutableRefObject<boolean>
  labelRef: React.MutableRefObject<HTMLAnchorElement | null>
}) {
  const lastIdx = useRef(-1)
  useFrame((_, delta) => {
    if (!pausedRef.current) scrollRef.current += delta * SPEED
    const s = scrollRef.current
    const n = items.length
    const total = n * SPACING
    let best = 0
    let bestAbs = Infinity
    for (let i = 0; i < n; i++) {
      const x = (((i * SPACING - s) % total) + total) % total - total / 2
      const a = Math.abs(x)
      if (a < bestAbs) { bestAbs = a; best = i }
    }
    if (best !== lastIdx.current && labelRef.current) {
      lastIdx.current = best
      labelRef.current.textContent = shortName(items[best].name)
      labelRef.current.setAttribute("href", `/productos/${items[best].slug}`)
    }
  })
  return null
}

/** Si WebGL o un GLB fallan en el dispositivo, NO rompemos la página de gracias. */
class CarouselBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.warn("[gracias-carousel] deshabilitado:", err) }
  render() { return this.state.failed ? null : this.props.children }
}

export default function Gracias3DCarousel() {
  return (
    <CarouselBoundary>
      <Carousel3D />
    </CarouselBoundary>
  )
}

function Carousel3D() {
  const [items, setItems] = useState<CarouselItem[] | null>(null)
  const scrollRef = useRef(0)
  const pausedRef = useRef(false)
  const labelRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ slug: string; name: string }>) => {
        if (!active) return
        const withModel = (Array.isArray(data) ? data : [])
          .filter((p) => p.slug !== "prueba")
          .map((p) => ({ slug: p.slug, name: p.name, url: modelForSlug(p.slug) }))
          .filter((p): p is CarouselItem => !!p.url)
        for (let i = withModel.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[withModel[i], withModel[j]] = [withModel[j], withModel[i]]
        }
        setItems(withModel.slice(0, COUNT))
      })
      .catch(() => setItems([]))
    return () => { active = false }
  }, [])

  if (items !== null && items.length === 0) return null

  return (
    <div
      className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] select-none"
      onPointerEnter={() => { pausedRef.current = true }}
      onPointerLeave={() => { pausedRef.current = false }}
    >
      {items === null ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <Canvas
            camera={{ position: [0, 0.15, 6.8], fov: 30 }}
            gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }}
            dpr={[1, 1.5]}
            style={{ background: "transparent" }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 3]} intensity={1.9} />
            <directionalLight position={[-3, 2, -2]} intensity={0.6} />
            <Suspense fallback={null}>
              <StudioEnv />
              {items.map((item, i) => (
                <Bottle key={item.slug} item={item} index={i} count={items.length} scrollRef={scrollRef} />
              ))}
            </Suspense>
            {/* Fuera del Suspense: la etiqueta se llena desde el primer frame,
                sin esperar a que carguen todos los GLB. */}
            <Driver items={items} scrollRef={scrollRef} pausedRef={pausedRef} labelRef={labelRef} />
          </Canvas>

          {/* Una sola etiqueta centrada — el aroma que está en el centro. */}
          <a
            ref={labelRef}
            href="/catalogo"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-[#2D1A14] shadow-sm ring-1 ring-black/5 backdrop-blur transition-opacity hover:bg-white empty:opacity-0"
          />
        </>
      )}
    </div>
  )
}
