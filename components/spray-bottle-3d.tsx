"use client"

import { Suspense, useRef, useState, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"

function SprayModel({ spraying, onSpray }: { spraying: boolean; onSpray: () => void }) {
  const { scene } = useGLTF("/models/spray_bottle.glb")
  const groupRef = useRef<THREE.Group>(null!)
  const [pressed, setPressed] = useState(false)
  const isDragging = useRef(false)

  useFrame((_, delta) => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.rotation.y += delta * 0.4
    }
  })

  const handleClick = () => {
    if (isDragging.current) return
    setPressed(true)
    onSpray()
    setTimeout(() => setPressed(false), 180)
  }

  const cloned = useMemo(() => scene.clone(), [scene])

  return (
    <group
      ref={groupRef}
      scale={pressed ? 0.48 : 0.5}
      position={[0, -0.3, 0]}
      onClick={handleClick}
      onPointerDown={() => { isDragging.current = false }}
      onPointerMove={() => { isDragging.current = true }}
    >
      <primitive object={cloned} />
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

function Scene() {
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
        <SprayModel spraying={spraying} onSpray={handleSpray} />
        <Mist active={spraying} />
        <ContactShadows position={[0, -1.4, 0]} opacity={0.25} scale={4} blur={2.5} />
        <Environment preset="apartment" />
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

export function SprayBottle3D() {
  return (
    <div className="relative aspect-square bg-gradient-to-b from-muted/10 to-muted/40 rounded-3xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0.1, 3.5], fov: 36 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-[10px] text-muted-foreground/50 tracking-wider uppercase flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
          Arrastra · Toca para activar
        </span>
      </div>
    </div>
  )
}

useGLTF.preload("/models/spray_bottle.glb")
