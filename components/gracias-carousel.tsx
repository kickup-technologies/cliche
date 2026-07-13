"use client"

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Html } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { modelForSlug } from "@/lib/product-models"

/**
 * Gracias3DCarousel — carrusel "Seguir comprando" para la página de gracias.
 *
 * UN SOLO Canvas (una sola sesión WebGL) con todos los frascos en la misma
 * escena: renderizar un Canvas por producto reventaría el límite de contextos
 * WebGL del navegador y mataría el rendimiento en móvil. La fila se desplaza
 * lento y en bucle infinito (posición por módulo, sin saltos visibles); cada
 * frasco gira sobre su propio eje. El nombre aparece cuando el frasco llega al
 * centro y enlaza a su producto.
 */

const TILT_Z = (28 * Math.PI) / 180
const FIT = 1.9          // alto objetivo de cada frasco
const SPACING = 2.7      // separación entre frascos (unidades)
const SPEED = 0.42       // velocidad del carrusel (unidades/seg) — lento
const SPIN = 0.5         // giro sobre el eje (rad/seg)
const FADE = 2.4         // distancia desde el centro a la que el nombre se apaga

type CarouselItem = { slug: string; name: string; url: string }

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
  const labelRef = useRef<HTMLAnchorElement>(null)

  // Centrar en el origen y escalar para encuadrar
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
    // Posición por módulo: cada frasco baja a la izquierda y reaparece por la
    // derecha sin salto visible (el salto ocurre fuera de cámara, en |x|=total/2).
    const s = scrollRef.current
    const x = (((index * SPACING - s) % total) + total) % total - total / 2
    if (groupRef.current) groupRef.current.position.x = x
    if (spinRef.current) spinRef.current.rotation.y += delta * SPIN
    // El nombre se desvanece a medida que el frasco se aleja del centro.
    if (labelRef.current) {
      const op = Math.max(0, 1 - Math.abs(x) / FADE)
      labelRef.current.style.opacity = String(op)
      labelRef.current.style.pointerEvents = op > 0.55 ? "auto" : "none"
    }
  })

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, TILT_Z]}>
        <group ref={spinRef} scale={scale}>
          <primitive object={cloned} />
        </group>
      </group>
      <Html position={[0, -1.5, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <a
          ref={labelRef}
          href={`/productos/${item.slug}`}
          className="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#2D1A14] shadow-sm ring-1 ring-black/5 backdrop-blur"
          style={{ opacity: 0 }}
        >
          {item.name}
        </a>
      </Html>
    </group>
  )
}

function ScrollDriver({
  scrollRef, pausedRef,
}: {
  scrollRef: React.MutableRefObject<number>
  pausedRef: React.MutableRefObject<boolean>
}) {
  useFrame((_, delta) => {
    if (!pausedRef.current) scrollRef.current += delta * SPEED
  })
  return null
}

/** Si WebGL o un GLB fallan en el dispositivo del cliente, NO rompemos la
 *  página de gracias: el carrusel simplemente no se muestra. */
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
        // Barajar y limitar para no cargar demasiados GLB en móvil.
        for (let i = withModel.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[withModel[i], withModel[j]] = [withModel[j], withModel[i]]
        }
        setItems(withModel.slice(0, 8))
      })
      .catch(() => setItems([]))
    return () => { active = false }
  }, [])

  if (items !== null && items.length === 0) return null

  return (
    <div
      className="relative w-full h-[300px] select-none"
      onPointerEnter={() => { pausedRef.current = true }}
      onPointerLeave={() => { pausedRef.current = false }}
    >
      {items === null ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 0.15, 6.6], fov: 30 }}
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }}
          dpr={[1, 1.75]}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 3]} intensity={1.6} />
          <directionalLight position={[-3, 2, -2]} intensity={0.5} />
          <Suspense fallback={null}>
            <StudioEnv />
            {items.map((item, i) => (
              <Bottle key={item.slug} item={item} index={i} count={items.length} scrollRef={scrollRef} />
            ))}
          </Suspense>
          <ScrollDriver scrollRef={scrollRef} pausedRef={pausedRef} />
        </Canvas>
      )}
    </div>
  )
}
