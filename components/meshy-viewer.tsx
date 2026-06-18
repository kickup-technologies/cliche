"use client"

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, OrbitControls, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

/**
 * MeshyViewer — visor del modelo 3D real (GLB de Meshy) del producto.
 * Centra y escala el modelo, lo inclina 32° (parte superior hacia la izquierda)
 * y lo auto-rota sobre su propio eje; se puede arrastrar para girarlo. Fondo
 * transparente, iluminación de estudio (RoomEnvironment, sin red).
 */
const TILT_Z = (32 * Math.PI) / 180 // parte superior hacia la izquierda
const FIT = 2.0 // alto objetivo en unidades (menor = frasco más pequeño)

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

function Model({ url, onReady, dragging }: { url: string; onReady?: () => void; dragging: MutableRefObject<boolean> }) {
  const { scene } = useGLTF(url)
  const spinRef = useRef<THREE.Group>(null!)
  const cloned = useMemo(() => scene.clone(true), [scene])

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

  useEffect(() => { onReady?.() }, [onReady])

  // Auto-rota sobre el eje del frasco (se pausa al arrastrar)
  useFrame((_, delta) => {
    if (spinRef.current && !dragging.current) spinRef.current.rotation.y += delta * 0.45
  })

  return (
    <group rotation={[0, 0, TILT_Z]}>
      <group ref={spinRef} scale={scale}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

export function MeshyViewer({ url, onReady }: { url: string; onReady?: () => void }) {
  const dragging = useRef(false)
  return (
    <div className="relative aspect-square w-full">
      <Canvas
        camera={{ position: [0, 0.3, 4.6], fov: 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 5, 3]} intensity={1.7} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <StudioEnv />
          <Model url={url} onReady={onReady} dragging={dragging} />
          <ContactShadows position={[0, -1.2, 0]} opacity={0.3} scale={6} blur={2.6} far={3} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.75}
          target={[0, 0, 0]}
          onStart={() => { dragging.current = true }}
          onEnd={() => { dragging.current = false }}
        />
      </Canvas>
    </div>
  )
}
