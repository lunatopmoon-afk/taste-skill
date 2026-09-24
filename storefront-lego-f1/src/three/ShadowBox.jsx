import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LegoF1Car, STUD } from './LegoF1Car.jsx'

// Caja de sombra (cuadro profundo) con vidrio frontal y el auto LEGO colgado dentro.
// Medidas en unidades de escena; el frente del cuadro mira hacia +Z.

export const FRAME_W = 2.8
export const FRAME_H = 3.9
const BORDER = 0.28
const DEPTH = 0.8
const INNER_W = FRAME_W - BORDER * 2
const INNER_H = FRAME_H - BORDER * 2

const CAR_SCALE = 0.82
const MOUNTED = { z: 0.14, tilt: Math.PI / 2 }
const PULLED = { z: 1.9, tilt: Math.PI / 2 - 1.05 }

export function frameColor(finish = '') {
  const f = finish.toLowerCase()
  if (/(nogal|walnut|madera|wood)/.test(f)) return '#4a2f1d'
  if (/(roble|oak|natural)/.test(f)) return '#a07a4c'
  if (/(blanco|white)/.test(f)) return '#e9e8e4'
  if (/(plata|silver|aluminio|aluminum)/.test(f)) return '#b9bcc0'
  return '#151517'
}

function drawPoster(canvas, product) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  const { primary, secondary } = product.livery

  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#17181b')
  bg.addColorStop(1, '#0c0d0f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Retícula fina, tipo plano técnico
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Trazado de circuito genérico detrás del auto
  ctx.save()
  ctx.translate(w / 2, h * 0.46)
  ctx.strokeStyle = primary
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 10
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-300, 420)
  ctx.bezierCurveTo(-420, 180, -380, -120, -250, -330)
  ctx.bezierCurveTo(-170, -470, 40, -520, 120, -400)
  ctx.bezierCurveTo(170, -320, 60, -250, 150, -160)
  ctx.bezierCurveTo(300, -20, 400, 120, 320, 300)
  ctx.bezierCurveTo(260, 450, 60, 400, -40, 470)
  ctx.bezierCurveTo(-140, 540, -240, 520, -300, 420)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()

  const sans = '"Geist Variable", system-ui, sans-serif'
  const mono = '"Geist Mono Variable", ui-monospace, monospace'

  // Número grande
  ctx.fillStyle = primary
  ctx.font = `800 180px ${sans}`
  ctx.textBaseline = 'top'
  ctx.fillText(product.number, 56, 40)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 26px ${mono}`
  ctx.font = `500 22px ${mono}`
  ctx.fillText('PIT WALL', 64, 230)
  ctx.fillText('COLLECTION', 64, 260)

  // Placa inferior
  const py = h - 200
  const plate = ctx.createLinearGradient(0, py, 0, py + 120)
  plate.addColorStop(0, '#d9dadc')
  plate.addColorStop(1, '#8e9095')
  ctx.fillStyle = plate
  ctx.fillRect(160, py, w - 320, 120)
  ctx.fillStyle = '#16171a'
  ctx.textAlign = 'center'
  ctx.font = `700 48px ${sans}`
  ctx.fillText(product.title.toUpperCase(), w / 2, py + 22, w - 380)
  ctx.font = `500 22px ${mono}`
  ctx.fillStyle = '#34363b'
  ctx.fillText(`N.º ${product.number}`, w / 2, py + 80)
  ctx.textAlign = 'left'

  // Franja de color
  ctx.fillStyle = secondary
  ctx.fillRect(0, h - 18, w, 18)
}

function usePosterTexture(product) {
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
      drawPoster(canvas, product)
      texture.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw)
    return () => {
      alive = false
    }
  }, [canvas, texture, product])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

export function ShadowBox({ product, finish, open = false, hovered = false, ...props }) {
  const poster = usePosterTexture(product)
  const carRig = useRef()
  const carSpin = useRef()
  const glass = useRef()
  const color = frameColor(finish)

  useFrame((_, dt) => {
    const target = open ? PULLED : MOUNTED
    const rig = carRig.current
    rig.position.z = THREE.MathUtils.damp(rig.position.z, target.z, 3.2, dt)
    rig.rotation.x = THREE.MathUtils.damp(rig.rotation.x, target.tilt, 3.2, dt)

    const spin = carSpin.current
    if (open) {
      spin.rotation.y += dt * 0.55
    } else {
      // Vuelve a la vuelta completa más cercana para colgarse derecho
      const rest = Math.round(spin.rotation.y / (Math.PI * 2)) * Math.PI * 2
      spin.rotation.y = THREE.MathUtils.damp(spin.rotation.y, rest, 4, dt)
    }

    glass.current.rotation.y = THREE.MathUtils.damp(
      glass.current.rotation.y,
      open ? -1.85 : 0,
      open ? 5 : 2.6,
      dt,
    )
  })

  const frameMat = <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />

  return (
    <group {...props}>
      {/* Marco */}
      <RoundedBox args={[FRAME_W, BORDER, DEPTH]} radius={0.03} position={[0, FRAME_H / 2 - BORDER / 2, DEPTH / 2]} castShadow receiveShadow>{frameMat}</RoundedBox>
      <RoundedBox args={[FRAME_W, BORDER, DEPTH]} radius={0.03} position={[0, -FRAME_H / 2 + BORDER / 2, DEPTH / 2]} castShadow receiveShadow>{frameMat}</RoundedBox>
      <RoundedBox args={[BORDER, INNER_H, DEPTH]} radius={0.03} position={[-FRAME_W / 2 + BORDER / 2, 0, DEPTH / 2]} castShadow receiveShadow>{frameMat}</RoundedBox>
      <RoundedBox args={[BORDER, INNER_H, DEPTH]} radius={0.03} position={[FRAME_W / 2 - BORDER / 2, 0, DEPTH / 2]} castShadow receiveShadow>{frameMat}</RoundedBox>

      {/* Fondo impreso */}
      <mesh position={[0, 0, 0.001]} receiveShadow>
        <planeGeometry args={[INNER_W, INNER_H]} />
        <meshStandardMaterial map={poster} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[FRAME_W, FRAME_H, 0.04]} />
        <meshStandardMaterial color="#0b0b0c" />
      </mesh>

      {/* Soportes de acrílico */}
      {[-0.4, 0.45].map((y) => (
        <mesh key={y} position={[0, y, MOUNTED.z / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, MOUNTED.z, 12]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.35} roughness={0.05} />
        </mesh>
      ))}

      {/* Auto: rig = posición/inclinación, spin = giro sobre su propio eje */}
      <group ref={carRig} position={[0, 0.02, MOUNTED.z]} rotation={[MOUNTED.tilt, 0, 0]}>
        <group ref={carSpin}>
          <group position={[0, 0, 1.25 * STUD * CAR_SCALE]} scale={CAR_SCALE}>
            <LegoF1Car livery={product.livery} spinWheels={hovered || open} />
          </group>
        </group>
      </group>

      {/* Vidrio con bisagra a la izquierda */}
      <group ref={glass} position={[-INNER_W / 2, 0, DEPTH - 0.03]}>
        <mesh position={[INNER_W / 2, 0, 0]}>
          <boxGeometry args={[INNER_W, INNER_H, 0.015]} />
          <meshPhysicalMaterial
            color="#dfe8ee"
            transparent
            opacity={0.1}
            roughness={0.02}
            metalness={0.1}
            clearcoat={1}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}
