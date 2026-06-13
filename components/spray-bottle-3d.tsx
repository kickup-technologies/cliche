"use client"

import { Suspense, useRef, useState, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, OrbitControls, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { loadLabelTexture, loadFlatLabelTexture, LABEL_ARC, FLAT_LABEL_ARC, AMBER_GLASS } from "@/lib/bottle-label"

/**
 * Iluminación de estudio generada localmente (RoomEnvironment de three).
 * Sustituye al <Environment preset> de drei, que descargaba un HDR desde un
 * CDN externo y congelaba toda la escena (mismo Suspense) si el CDN no
 * respondía. Cero red: carga siempre, también offline.
 */
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

function SprayModel({ spraying, onSpray, zTilt = 0, onReady, labelPhoto, flatLabel }: { spraying: boolean; onSpray: () => void; zTilt?: number; onReady?: () => void; labelPhoto?: string; flatLabel?: string }) {
  const { scene } = useGLTF("/models/spray_bottle.glb")
  const spinRef = useRef<THREE.Group>(null!)
  const [pressed, setPressed] = useState(false)
  const isDragging = useRef(false)

  useEffect(() => {
    onReady?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, delta) => {
    if (spinRef.current && !isDragging.current) {
      spinRef.current.rotation.y += delta * 0.4
    }
  })

  const handleClick = () => {
    if (isDragging.current) return
    setPressed(true)
    onSpray()
    setTimeout(() => setPressed(false), 180)
  }

  const cloned = useMemo(() => scene.clone(), [scene])

  // ── branding Cliché sobre el GLB: vidrio ámbar + etiqueta real ──
  // El cuerpo de la botella es el mesh con "Material.003" (gris brillante).
  // Se tiñe de vidrio ámbar físico y se le envuelve la etiqueta extraída
  // del render de producto (labelPhoto). El gatillo negro queda intacto.
  useEffect(() => {
    let bodyMesh: THREE.Mesh | null = null
    cloned.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && (m.material as THREE.Material)?.name === "Material.003") bodyMesh = m
    })
    if (!bodyMesh) return
    const body = bodyMesh as THREE.Mesh

    body.material = new THREE.MeshPhysicalMaterial({
      color: AMBER_GLASS.color,
      transmission: 0.92,
      thickness: 0.5,
      roughness: 0.06,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      attenuationColor: new THREE.Color(AMBER_GLASS.attenuation),
      attenuationDistance: 0.9,
    })

    if (!labelPhoto && !flatLabel) return
    let disposed = false

    // medir el cuerpo en el espacio LOCAL del modelo (cloned), que viene de
    // pie del GLTF: eje vertical = Y, frente hacia +Z. Se transforma la caja
    // del body al frame de cloned para que etiqueta y líquido se ubiquen sin
    // pelear con el frame local (rotado) del mesh del cuerpo.
    cloned.updateWorldMatrix(true, true)
    const toLocal = new THREE.Matrix4().copy(cloned.matrixWorld).invert()
    const rel = new THREE.Matrix4().multiplyMatrices(toLocal, body.matrixWorld)
    const box = new THREE.Box3()
      .setFromBufferAttribute(body.geometry.attributes.position as THREE.BufferAttribute)
      .applyMatrix4(rel)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = box.getCenter(new THREE.Vector3())

    const len = size.y
    const radiusW = Math.max(size.x, size.z) / 2
    // etiqueta pegada a la pared: apenas 0.8% por fuera — lo justo para
    // evitar z-fighting con el vidrio sin que se vea como una funda flotante
    // separada (el efecto "dos capas")
    const rLab = radiusW * 1.008
    // cuerpo ≈ 14.5cm reales → etiqueta de 11cm a escala del modelo
    const FLAT_LABEL_H = len * (11 / 14.5)

    // líquido dentro del frasco (82% desde la base)
    const liquidH = len * 0.82
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusW * 0.92, radiusW * 0.92, liquidH, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x8a4426, transmission: 0.4, thickness: 1.2, roughness: 0.18, ior: 1.34,
      })
    )
    liquid.position.set(center.x, box.min.y + liquidH / 2, center.z)
    cloned.add(liquid)

    const addLabel = (texture: THREE.CanvasTexture, labelH: number, arc: number) => {
      if (disposed) return
      const label = new THREE.Mesh(
        // eje vertical Y, arco centrado de frente a la cámara (+Z)
        new THREE.CylinderGeometry(rLab, rLab, labelH, 128, 1, true, -arc / 2, arc),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 })
      )
      label.position.set(center.x, center.y, center.z)
      cloned.add(label)
      if (process.env.NODE_ENV !== "production") {
        ;(window as unknown as Record<string, unknown>).__bottleBranded = true
      }
    }

    // preferir el arte plano original (fidelidad 100%); si no existe para
    // este producto, caer a la extracción desde el render fotográfico
    const tryFlat = flatLabel
      ? loadFlatLabelTexture(flatLabel, (FLAT_LABEL_ARC * rLab) / FLAT_LABEL_H)
          .then(({ texture }) => addLabel(texture, FLAT_LABEL_H, FLAT_LABEL_ARC))
      : Promise.reject(new Error("sin arte plano"))

    tryFlat.catch(() => {
      if (!labelPhoto) return
      loadLabelTexture(labelPhoto).then(({ texture, aspect }) => {
        const chord = 2 * rLab * Math.sin(LABEL_ARC / 2)
        addLabel(texture, chord * aspect, LABEL_ARC)
      }).catch(() => {})
    })

    return () => { disposed = true }
  }, [cloned, labelPhoto, flatLabel])

  return (
    <group
      scale={pressed ? 0.37 : 0.39}
      position={[0, -0.2, 0]}
      rotation={[0, 0, zTilt]}
      onClick={handleClick}
      onPointerDown={() => { isDragging.current = false }}
      onPointerMove={() => { isDragging.current = true }}
    >
      <group ref={spinRef}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

function Mist({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null!)
  const count = 60

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.1
      pos[i * 3 + 1] = 0.8 + Math.random() * 0.1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1
      vel[i * 3] = (Math.random() - 0.5) * 0.015
      vel[i * 3 + 1] = Math.random() * 0.025 + 0.01
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.015
    }
    return { positions: pos, velocities: vel }
  }, [])

  useFrame(() => {
    if (!ref.current || !active) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      pos[i * 3 + 2] += velocities[i * 3 + 2]
      if (pos[i * 3 + 1] > 1.8) {
        pos[i * 3] = (Math.random() - 0.5) * 0.1
        pos[i * 3 + 1] = 0.8
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#c8e6f5"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function Scene({ zTilt = 0, transparent = false, onReady, labelPhoto, flatLabel }: { zTilt?: number; transparent?: boolean; onReady?: () => void; labelPhoto?: string; flatLabel?: string }) {
  const [spraying, setSpraying] = useState(false)

  const handleSpray = () => {
    setSpraying(true)
    setTimeout(() => setSpraying(false), 1400)
  }

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 4]} intensity={1.5} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#e8d5c4" />
      <pointLight position={[0, 4, 0]} intensity={0.4} color="#fff8f0" />

      <Suspense fallback={null}>
        <SprayModel spraying={spraying} onSpray={handleSpray} zTilt={zTilt} onReady={onReady} labelPhoto={labelPhoto} flatLabel={flatLabel} />
        <Mist active={spraying} />
        {!transparent && <ContactShadows position={[0, -1.4, 0]} opacity={0.25} scale={4} blur={2.5} />}
        <StudioEnv />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={(4 * Math.PI) / 5}
        rotateSpeed={0.6}
      />
    </>
  )
}

export function SprayBottle3D({ transparent, zTilt = 0, onReady, labelPhoto, flatLabel }: { transparent?: boolean; zTilt?: number; onReady?: () => void; labelPhoto?: string; flatLabel?: string }) {
  return (
    <div
      className={`relative aspect-square overflow-hidden ${transparent ? "" : "bg-gradient-to-b from-muted/10 to-muted/40 rounded-3xl"}`}
      style={transparent ? { background: "transparent" } : {}}
    >
      <Canvas
        camera={{ position: [0, 0.1, 3.5], fov: 36 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: process.env.NODE_ENV !== "production" }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Scene zTilt={zTilt} transparent={transparent} onReady={onReady} labelPhoto={labelPhoto} flatLabel={flatLabel} />
      </Canvas>

      {!transparent && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] text-muted-foreground/50 tracking-wider uppercase flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
            Arrastra · Toca para activar
          </span>
        </div>
      )}
    </div>
  )
}

useGLTF.preload("/models/spray_bottle.glb")
