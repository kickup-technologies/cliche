"use client"

import { Suspense, useEffect, useMemo } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { useGLTF, OrbitControls, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

/**
 * MeshyViewer — visor del modelo 3D real (GLB de Meshy) del producto.
 * Centra y escala el modelo, lo ilumina con un entorno de estudio (RoomEnvironment,
 * sin red), auto-rota y permite arrastrar para girarlo. Fondo transparente.
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

function Model({ url, onReady }: { url: string; onReady?: () => void }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])

  // Centrar en el origen y escalar para encuadrar (~2.4 unidades de alto)
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    cloned.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    return 2.4 / maxDim
  }, [cloned])

  useEffect(() => { onReady?.() }, [onReady])

  return (
    <group scale={scale}>
      <primitive object={cloned} />
    </group>
  )
}

export function MeshyViewer({ url, onReady }: { url: string; onReady?: () => void }) {
  return (
    <div className="relative aspect-square w-full">
      <Canvas
        camera={{ position: [0, 0.3, 4.3], fov: 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 5, 3]} intensity={1.7} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <StudioEnv />
          <Model url={url} onReady={onReady} />
          <ContactShadows position={[0, -1.35, 0]} opacity={0.32} scale={6} blur={2.6} far={3} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.1}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.75}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
