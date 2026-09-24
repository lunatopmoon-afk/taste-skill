import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LegoF1Car, UNIT, CAR_CENTER_Z } from './LegoF1Car.jsx'

// Cuadro como el de las fotos: marco negro delgado, póster de color con degradado,
// el auto LEGO montado encima y luz LED (línea interior y/o resplandor en la pared).
// El frente del cuadro mira hacia +Z; el fondo está en z = 0.

export const FRAME_W = 2.7
export const FRAME_H = 4.3
const BORDER = 0.07
const DEPTH = 0.42
const INNER_W = FRAME_W - BORDER * 2
const INNER_H = FRAME_H - BORDER * 2
const LED_INSET = 0.075
const LED_WIDTH = 0.018

const CAR_SCALE = 1.06
const CAR_Y = 0.22
const MOUNTED = { z: 0.05, tilt: Math.PI / 2 }
const PULLED = { z: 1.7, tilt: Math.PI / 2 - 1.0 }

export function frameColor(finish = '') {
  const f = finish.toLowerCase()
  if (/(nogal|walnut|madera|wood)/.test(f)) return '#4a2f1d'
  if (/(blanco|white)/.test(f)) return '#e9e8e4'
  if (/(plata|silver|aluminio|aluminum)/.test(f)) return '#b9bcc0'
  if (/(dorad|gold)/.test(f)) return '#b8913e'
  return '#0d0d0e'
}

// ---------- póster ----------

function seeded(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

function drawPoster(canvas, model) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  const { center, mid, edge } = model.backdrop

  const bg = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.45, h * 0.62)
  bg.addColorStop(0, center)
  bg.addColorStop(0.45, mid)
  bg.addColorStop(1, edge)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Grano de papel/tela
  const rand = seeded(7)
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(rand() * w, rand() * h, 2, 2)
  }

  const sans = '"Geist Variable", system-ui, sans-serif'
  const mono = '"Geist Mono Variable", ui-monospace, monospace'
  const [line1, line2] = model.title
  const y1 = h - 175
  const y2 = h - 100
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (model.titleStyle === 'highlight') {
    ctx.fillStyle = '#f2f4f5'
    ctx.font = `400 50px ${sans}`
    ctx.fillText(line1, w / 2, y1)
    const [before, after] = line2.split(model.highlight)
    ctx.font = `400 50px ${sans}`
    const bw = ctx.measureText(before).width
    const aw = ctx.measureText(after).width
    ctx.font = `italic 700 50px ${sans}`
    const hw = ctx.measureText(model.highlight).width
    let x = w / 2 - (bw + hw + aw) / 2
    ctx.textAlign = 'left'
    ctx.font = `400 50px ${sans}`
    ctx.fillStyle = '#f2f4f5'
    ctx.fillText(before, x, y2)
    x += bw
    ctx.font = `italic 700 50px ${sans}`
    ctx.fillStyle = model.led.border ?? '#ffffff'
    ctx.fillText(model.highlight, x, y2)
    x += hw
    ctx.font = `400 50px ${sans}`
    ctx.fillStyle = '#f2f4f5'
    ctx.fillText(after, x, y2)
  } else if (model.titleStyle === 'rules') {
    ctx.fillStyle = '#f2f4f5'
    ctx.font = `500 46px ${sans}`
    ctx.fillText(line1, w / 2, y1)
    ctx.font = `400 50px ${sans}`
    ctx.fillText(line2, w / 2, y2)
    const tw = ctx.measureText(line2).width
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w / 2 - tw / 2 - 150, y2); ctx.lineTo(w / 2 - tw / 2 - 30, y2)
    ctx.moveTo(w / 2 + tw / 2 + 30, y2); ctx.lineTo(w / 2 + tw / 2 + 150, y2)
    ctx.stroke()
  } else {
    const gold = '#f4c86a'
    ctx.fillStyle = gold
    ctx.font = `500 48px ${sans}`
    ctx.fillText(line1, w / 2, y1)
    ctx.fillText(line2, w / 2, y2)
    ctx.fillStyle = gold
    ctx.fillRect(w / 2 - 200, (y1 + y2) / 2 - 1, 400, 3)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `600 30px ${mono}`
  ctx.fillText(model.code, 64, 80)
}

function usePoster(model) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = Math.round(1024 * (INNER_H / INNER_W))
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [canvas])

  useEffect(() => {
    let alive = true
    const draw = () => {
      if (!alive) return
      drawPoster(canvas, model)
      texture.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw)
    return () => {
      alive = false
    }
  }, [canvas, texture, model])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

// Resplandor suave para la retroiluminación en la pared
let haloTexture
function getHaloTexture() {
  if (haloTexture) return haloTexture
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 640
  const ctx = c.getContext('2d')
  ctx.filter = 'blur(38px)'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(110, 110, 292, 420)
  haloTexture = new THREE.CanvasTexture(c)
  return haloTexture
}

// ---------- cuadro ----------

export function LedFrame({
  product,
  finish,
  open = false,
  hovered = false,
  ledOn = true,
  drsOpen = false,
  steer = 0,
  introDelay = 0,
  ...props
}) {
  const model = product.model
  const poster = usePoster(model)
  const halo = useMemo(getHaloTexture, [])
  const carRig = useRef()
  const carSpin = useRef()
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const haloMat = useRef()
  const ledLight = useRef()
  const level = useRef(0)
  const start = useRef(null)
  const color = frameColor(finish)
  useEffect(() => () => ledMat.dispose(), [ledMat])
  const borderColor = useMemo(() => new THREE.Color(model.led.border ?? '#000000'), [model])

  useFrame(({ clock }, dt) => {
    // Encendido con parpadeo tipo neón al entrar a la página
    if (start.current === null) start.current = clock.elapsedTime
    const t = clock.elapsedTime - start.current - introDelay
    let target = ledOn ? (hovered ? 1.35 : 1) : 0
    if (t < 0) target = 0
    else if (t < 0.8 && ledOn) target = Math.sin(t * 60) > 0.2 || t > 0.6 ? target : 0.1
    level.current = t < 0.8 ? target : THREE.MathUtils.damp(level.current, target, 6, dt)
    const k = level.current

    ledMat.color.copy(borderColor).multiplyScalar(0.25 + k * 2.6)
    if (haloMat.current) haloMat.current.opacity = model.led.haloStrength * k * 0.9
    if (ledLight.current) ledLight.current.intensity = k * 1.1

    const rigTarget = open ? PULLED : MOUNTED
    const rig = carRig.current
    rig.position.z = THREE.MathUtils.damp(rig.position.z, rigTarget.z, 3.2, dt)
    rig.rotation.x = THREE.MathUtils.damp(rig.rotation.x, rigTarget.tilt, 3.2, dt)

    const spin = carSpin.current
    if (open) spin.rotation.y += dt * 0.5
    else {
      const rest = Math.round(spin.rotation.y / (Math.PI * 2)) * Math.PI * 2
      spin.rotation.y = THREE.MathUtils.damp(spin.rotation.y, rest, 4, dt)
    }
  })

  const edges = [
    [FRAME_W, BORDER, 0, FRAME_H / 2 - BORDER / 2],
    [FRAME_W, BORDER, 0, -FRAME_H / 2 + BORDER / 2],
    [BORDER, INNER_H, -FRAME_W / 2 + BORDER / 2, 0],
    [BORDER, INNER_H, FRAME_W / 2 - BORDER / 2, 0],
  ]
  const ledW = INNER_W - LED_INSET * 2
  const ledH = INNER_H - LED_INSET * 2
  const leds = [
    [ledW + LED_WIDTH, LED_WIDTH, 0, ledH / 2],
    [ledW + LED_WIDTH, LED_WIDTH, 0, -ledH / 2],
    [LED_WIDTH, ledH, -ledW / 2, 0],
    [LED_WIDTH, ledH, ledW / 2, 0],
  ]

  return (
    <group {...props}>
      {/* Retroiluminación sobre la pared */}
      {model.led.halo && (
        <mesh position={[0, 0, -0.035]} renderOrder={-1}>
          <planeGeometry args={[FRAME_W * 1.75, FRAME_H * 1.5]} />
          <meshBasicMaterial
            ref={haloMat}
            map={halo}
            color={model.led.halo}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Marco negro delgado */}
      {edges.map(([w, h, x, y], i) => (
        <mesh key={i} position={[x, y, DEPTH / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, DEPTH]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.015]}>
        <boxGeometry args={[FRAME_W, FRAME_H, 0.03]} />
        <meshStandardMaterial color="#070707" />
      </mesh>

      {/* Póster */}
      <mesh position={[0, 0, 0.002]} receiveShadow>
        <planeGeometry args={[INNER_W, INNER_H]} />
        <meshStandardMaterial map={poster} roughness={0.85} />
      </mesh>

      {/* Línea LED interior */}
      {model.led.border && (
        <group position={[0, 0, 0.012]}>
          {leds.map(([w, h, x, y], i) => (
            <mesh key={i} position={[x, y, 0]} material={ledMat}>
              <boxGeometry args={[w, h, 0.012]} />
            </mesh>
          ))}
          <pointLight ref={ledLight} position={[0, -0.4, 2.2]} color={model.led.border} distance={4} decay={2} />
        </group>
      )}

      {/* Auto: rig = posición e inclinación, spin = giro sobre su eje */}
      <group ref={carRig} position={[0, CAR_Y, MOUNTED.z]} rotation={[MOUNTED.tilt, 0, 0]}>
        <group ref={carSpin}>
          <group scale={CAR_SCALE} position={[0, 0, -CAR_CENTER_Z * UNIT * CAR_SCALE]}>
            <LegoF1Car model={model} spinWheels={hovered || open} steer={steer} drsOpen={drsOpen} />
          </group>
        </group>
      </group>
    </group>
  )
}
