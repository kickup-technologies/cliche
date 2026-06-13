"use client"

import { useEffect, useRef } from "react"

/**
 * AromaShader — humo/seda líquida en WebGL puro (fragment shader con fbm
 * domain-warped, técnica de Inigo Quilez). Cero dependencias, cero assets:
 * la "textura" se calcula por pixel en GPU con la paleta terracota de Cliché.
 * El mouse perturba el campo de ruido (lerp suave). Se renderiza a media
 * resolución por performance y solo anima cuando está en viewport.
 * Con prefers-reduced-motion pinta un único frame estático.
 */
const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash(i), f), dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.7;
  float t = uTime * 0.055;
  vec2 m = (uMouse - 0.5) * 0.7;

  // doble domain warp: q deforma el espacio, r lo vuelve a deformar
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(
    fbm(p + 2.6 * q + vec2(1.7, 9.2) + m + t * 0.5),
    fbm(p + 2.6 * q + vec2(8.3, 2.8) - m - t * 0.4)
  );
  // fbm con gradient noise vive en ~[-0.35, 0.35]: ganancia + remapeo a [0, 1]
  float f  = clamp(0.5 + 1.1 * fbm(p + 2.2 * r), 0.0, 1.0);
  float qm = clamp(0.5 + 1.3 * fbm(p + 3.0 * q), 0.0, 1.0);

  // paleta Cliché: crema → arena → terracota → marrón profundo
  vec3 cream = vec3(0.980, 0.973, 0.961);
  vec3 sand  = vec3(0.886, 0.795, 0.733);
  vec3 terra = vec3(0.651, 0.443, 0.388);
  vec3 deep  = vec3(0.239, 0.173, 0.133);

  vec3 col = mix(cream, sand, smoothstep(0.3, 0.62, f));
  col = mix(col, terra, 0.9 * smoothstep(0.5, 0.74, qm));
  col = mix(col, deep, 0.55 * smoothstep(0.58, 0.82, f * qm * 1.8));

  // viñeta sutil hacia los bordes verticales para fundirse con la página
  float fade = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
  col = mix(cream, col, fade);

  gl_FragColor = vec4(col, 1.0);
}
`

export function AromaShader({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      // permite leer pixeles tras componer (debug/tests); costo mínimo a media res
      preserveDrawingBuffer: true,
    })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    // triángulo fullscreen
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "uRes")
    const uTime = gl.getUniformLocation(prog, "uTime")
    const uMouse = gl.getUniformLocation(prog, "uMouse")

    // media resolución: el humo es suave, nadie nota la diferencia y la GPU sí
    const DPR_CAP = 0.5
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * DPR_CAP))
      const h = Math.max(1, Math.floor(canvas.clientHeight * DPR_CAP))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }
    resize()

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.tx = (e.clientX - r.left) / Math.max(1, r.width)
      mouse.ty = 1 - (e.clientY - r.top) / Math.max(1, r.height)
    }
    window.addEventListener("pointermove", onMove, { passive: true })

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let running = false
    const t0 = performance.now()

    const frame = () => {
      resize()
      // lerp del mouse — el humo persigue el cursor con pereza elegante
      mouse.x += (mouse.tx - mouse.x) * 0.04
      mouse.y += (mouse.ty - mouse.y) * 0.04
      gl.uniform1f(uTime, (performance.now() - t0) / 1000)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (running && !reduce) raf = requestAnimationFrame(frame)
    }

    // frame inicial siempre (también con reduced-motion: imagen fija)
    frame()

    // anima solo cuando la banda está en viewport
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting
      if (visible && !running && !reduce) {
        running = true
        raf = requestAnimationFrame(frame)
      } else if (!visible && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(canvas)

    const onResize = () => resize()
    window.addEventListener("resize", onResize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("resize", onResize)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
