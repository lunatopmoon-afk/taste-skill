import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { LegoF1Car, UNIT, CAR_CENTER_Z } from './LegoF1Car.jsx'

// Cuadro como el de las fotos: marco negro delgado con luz LED.
// Si el modelo tiene foto (model.poster), dentro del marco va LA FOTO REAL del cuadro,
// recortada al borde interior. Si no, se dibuja un póster y un auto LEGO procedural.
// El frente del cuadro mira hacia +Z; el fondo está en z = 0.

export const FRAME_W = 3.05 // ancho máximo, para separar los cuadros en la pared
export const FRAME_H = 4.3
const BORDER = 0.07
const DEPTH = 0.22
const INNER_W = 2.56 // ancho del póster dibujado (modelos sin foto)
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

// Foto real del cuadro. Material sin iluminación: se ve con los colores exactos de la foto.
function PhotoPoster({ src, width, height, material }) {
  const texture = useTexture(src)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    material.map = texture
    material.needsUpdate = true
  }, [texture, material])
  return (
    <mesh position={[0, 0, 0.002]} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}

// Reflejo del vidrio: una franja de brillo que se desliza con el movimiento
let glossTexture
function getGlossTexture() {
  if (glossTexture) return glossTexture
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 512, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.42, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, 'rgba(255,255,255,1)')
  g.addColorStop(0.58, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 64)
  glossTexture = new THREE.CanvasTexture(c)
  glossTexture.wrapS = THREE.RepeatWrapping
  return glossTexture
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
  const hasPhoto = Boolean(model.poster)
  const poster = usePoster(model)
  const innerH = INNER_H
  const innerW = hasPhoto ? INNER_H * model.posterAspect : INNER_W
  const frameW = innerW + BORDER * 2
  const photoMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const gloss = useMemo(getGlossTexture, [])
  const glossMat = useRef()
  const halo = useMemo(getHaloTexture, [])
  const carRig = useRef()
  const carSpin = useRef()
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  const haloMat = useRef()
  const ledLight = useRef()
  const level = useRef(0)
  const start = useRef(null)
  const color = frameColor(finish)
  useEffect(
    () => () => {
      ledMat.dispose()
      photoMat.dispose()
    },
    [ledMat, photoMat],
  )
  const borderColor = useMemo(() => new THREE.Color(model.led.border ?? '#000000'), [model])

  useFrame(({ clock, pointer }, dt) => {
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
    // La foto "se enciende" con el LED; al pasar el cursor brilla un poco más
    photoMat.color.setScalar(0.3 + Math.min(k, 1.12) * 0.7)
    if (glossMat.current) {
      gloss.offset.x = THREE.MathUtils.damp(gloss.offset.x, -pointer.x * 0.35 + 0.1, 3, dt)
      glossMat.current.opacity = THREE.MathUtils.damp(glossMat.current.opacity, hovered ? 0.06 : 0.022, 4, dt)
    }

    if (!carRig.current) return
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
    [frameW, BORDER, 0, FRAME_H / 2 - BORDER / 2],
    [frameW, BORDER, 0, -FRAME_H / 2 + BORDER / 2],
    [BORDER, innerH, -frameW / 2 + BORDER / 2, 0],
    [BORDER, innerH, frameW / 2 - BORDER / 2, 0],
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
          <planeGeometry args={[frameW * 1.75, FRAME_H * 1.5]} />
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
        <boxGeometry args={[frameW, FRAME_H, 0.03]} />
        <meshStandardMaterial color="#070707" />
      </mesh>

      {/* Póster: foto real del cuadro, o póster dibujado si el modelo no tiene foto */}
      {hasPhoto ? (
        <PhotoPoster src={model.poster} width={innerW} height={innerH} material={photoMat} />
      ) : (
        <mesh position={[0, 0, 0.002]} receiveShadow>
          <planeGeometry args={[innerW, innerH]} />
          <meshStandardMaterial map={poster} roughness={0.85} />
        </mesh>
      )}

      {/* Vidrio: brillo que se desliza al mover el cursor */}
      <mesh position={[0, 0, DEPTH - 0.01]}>
        <planeGeometry args={[innerW, innerH]} />
        <meshBasicMaterial
          ref={glossMat}
          map={gloss}
          transparent
          opacity={0.022}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Línea LED interior (la foto real ya la trae) */}
      {!hasPhoto && model.led.border && (
        <group position={[0, 0, 0.012]}>
          {leds.map(([w, h, x, y], i) => (
            <mesh key={i} position={[x, y, 0]} material={ledMat}>
              <boxGeometry args={[w, h, 0.012]} />
            </mesh>
          ))}
          <pointLight ref={ledLight} position={[0, -0.4, 2.2]} color={model.led.border} distance={4} decay={2} />
        </group>
      )}

      {/* Auto 3D procedural: solo para modelos sin foto */}
      {!hasPhoto && (
        <group ref={carRig} position={[0, CAR_Y, MOUNTED.z]} rotation={[MOUNTED.tilt, 0, 0]}>
          <group ref={carSpin}>
            <group scale={CAR_SCALE} position={[0, 0, -CAR_CENTER_Z * UNIT * CAR_SCALE]}>
              <LegoF1Car model={model} spinWheels={hovered || open} steer={steer} drsOpen={drsOpen} />
            </group>
          </group>
        </group>
      )}
    </group>
  )
}
