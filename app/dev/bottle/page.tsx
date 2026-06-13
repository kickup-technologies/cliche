"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { loadFlatLabelTexture, FLAT_LABEL_ARC, AMBER_GLASS } from "@/lib/bottle-label"

/**
 * /dev/bottle — banco de pruebas del frasco con three.js PLANO y render
 * SÍNCRONO (no R3F), para poder capturar PNGs vía window.__renderBottle
 * incluso con la pestaña en segundo plano. Solo herramienta de desarrollo.
 * Replica exactamente la lógica de etiqueta/vidrio de spray-bottle-3d.tsx.
 */
export default function DevBottlePage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = ref.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setSize(900, 1100, false)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 900 / 1100, 0.1, 100)

    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xfff1e0, 1.6)
    key.position.set(4, 6, 5)
    scene.add(key)

    const root = new THREE.Group()
    scene.add(root)

    new GLTFLoader().load("/models/spray_bottle.glb", async (gltf) => {
      const model = gltf.scene
      let body: THREE.Mesh | null = null
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && (m.material as THREE.Material)?.name === "Material.003") body = m
      })
      if (body) {
        const b = body as THREE.Mesh
        b.material = new THREE.MeshPhysicalMaterial({
          color: AMBER_GLASS.color, transmission: 0.92, thickness: 0.5,
          roughness: 0.06, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.06,
          attenuationColor: new THREE.Color(AMBER_GLASS.attenuation), attenuationDistance: 0.9,
        })
      }

      // encuadrar y centrar el modelo en el origen
      root.add(model)
      const box = new THREE.Box3().setFromObject(model)
      const c = box.getCenter(new THREE.Vector3())
      const sz = box.getSize(new THREE.Vector3())
      model.position.sub(c)
      model.updateMatrixWorld(true)

      if (body) {
        // medir el cuerpo en MUNDO (ya de pie, eje vertical = Y, frente = +Z)
        const wb = new THREE.Box3().setFromObject(body as THREE.Mesh)
        const ws = wb.getSize(new THREE.Vector3())
        const wc = wb.getCenter(new THREE.Vector3())
        const len = ws.y
        const radiusW = Math.max(ws.x, ws.z) / 2
        const rLab = radiusW * 1.008
        const labelH = len * (11 / 14.5)

        // líquido dentro del frasco (82% desde la base)
        const liquidH = len * 0.82
        const liquid = new THREE.Mesh(
          new THREE.CylinderGeometry(radiusW * 0.92, radiusW * 0.92, liquidH, 64),
          new THREE.MeshPhysicalMaterial({ color: 0x8a4426, transmission: 0.4, thickness: 1.2, roughness: 0.18, ior: 1.34 })
        )
        liquid.position.set(wc.x, wb.min.y + liquidH / 2, wc.z)
        root.add(liquid)

        // etiqueta plana real — centrada vertical y de frente a la cámara (+Z)
        const { texture } = await loadFlatLabelTexture("/labels/agua.png", (FLAT_LABEL_ARC * rLab) / labelH)
        const label = new THREE.Mesh(
          new THREE.CylinderGeometry(rLab, rLab, labelH, 128, 1, true, -FLAT_LABEL_ARC / 2, FLAT_LABEL_ARC),
          new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 })
        )
        label.position.set(wc.x, wc.y, wc.z)
        root.add(label)

        ;(window as unknown as Record<string, unknown>).__bottleInfo = {
          radiusW: +radiusW.toFixed(3), rLab: +rLab.toFixed(3),
          len: +len.toFixed(3), labelH: +labelH.toFixed(3),
        }
      }
      const maxDim = Math.max(sz.x, sz.y, sz.z)
      camera.position.set(0, 0, maxDim * 2.1)
      camera.lookAt(0, 0, 0)
      // el GLTF ya viene de pie (Y-up); no se rota el root

      ;(window as unknown as Record<string, unknown>).__renderBottle = (w = 900, h = 1100, angleY = 0) => {
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        root.rotation.y = angleY
        renderer.render(scene, camera)
        return renderer.domElement.toDataURL("image/png")
      }
      ;(window as unknown as Record<string, unknown>).__renderBottle()
      ;(window as unknown as Record<string, unknown>).__ready = true
    })

    return () => { renderer.dispose(); pmrem.dispose(); if (renderer.domElement.parentElement) mount.removeChild(renderer.domElement) }
  }, [])

  return <div ref={ref} style={{ width: 900, height: 1100 }} />
}
