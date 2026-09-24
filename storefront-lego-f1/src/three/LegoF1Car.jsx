import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// Auto F1 construido con "piezas" tipo LEGO, 100% procedural (no requiere modelos .glb).
// Unidad = 1 stud. El grupo se escala con STUD para pasar a unidades de escena.
// Espacio del auto: X = ancho, Y = arriba (hacia donde miran los studs), Z = largo (morro en -Z).

export const STUD = 0.1
const PLATE = 0.4
const STUD_RADIUS = 0.3
const STUD_HEIGHT = 0.2
const DARK = '#1c1c1f'
const TIRE = '#111112'
const RIM = '#9ea3a8'

// [ancho, alto, largo], [x, yBase, zCentro], color, studs
function buildBricks({ primary, secondary, accent }) {
  const b = (size, pos, color, studs = true) => ({ size, pos, color, studs })
  return [
    // Piso / fondo plano
    b([6, PLATE, 22], [0, 0, -1], DARK, false),
    // Alerón delantero + endplates
    b([11, PLATE, 2], [0, 0.3, -14], secondary),
    b([11, PLATE, 1], [0, 0.3 + PLATE, -13.5], accent, false),
    b([0.6, 1.4, 3], [-5.2, 0.3, -13.5], primary, false),
    b([0.6, 1.4, 3], [5.2, 0.3, -13.5], primary, false),
    // Morro
    b([2, 0.8, 6], [0, PLATE, -10], primary),
    b([2, PLATE, 2], [0, PLATE + 0.8, -8], accent, false),
    // Monocasco
    b([4, 1.6, 10], [0, PLATE, -2], primary, false),
    b([4, PLATE, 3], [0, PLATE + 1.6, -5.5], primary),
    // Cockpit (hueco negro)
    b([2, 0.3, 3.2], [0, PLATE + 1.6, -2.4], '#050505', false),
    // Pontones
    b([2.6, 1.2, 7], [-3.3, PLATE, 1], primary),
    b([2.6, 1.2, 7], [3.3, PLATE, 1], primary),
    b([2.6, 0.8, 1], [-3.3, PLATE + 0.2, -2.9], DARK, false),
    b([2.6, 0.8, 1], [3.3, PLATE + 0.2, -2.9], DARK, false),
    b([1, PLATE, 7], [-4.1, PLATE + 1.2, 1], secondary, false),
    b([1, PLATE, 7], [4.1, PLATE + 1.2, 1], secondary, false),
    // Toma de aire + cubierta del motor
    b([2, 1.4, 2], [0, PLATE + 1.6, 0.2], secondary, false),
    b([3, 1.0, 6], [0, PLATE + 1.6, 4], primary),
    b([0.4, 1.0, 5], [0, PLATE + 2.6, 4], accent, false),
    b([2, 1.2, 4], [0, PLATE, 9], primary, false),
    // Alerón trasero
    b([1, 2.6, 1], [0, PLATE + 1.2, 10.5], DARK, false),
    b([0.6, 3.2, 3], [-4.6, PLATE, 10.8], primary, false),
    b([0.6, 3.2, 3], [4.6, PLATE, 10.8], primary, false),
    b([9, PLATE, 2], [0, PLATE + 3.0, 10.4], secondary),
    b([9, PLATE, 1.2], [0, PLATE + 3.5, 11.4], accent, false),
    // Brazos de suspensión
    b([7.4, 0.2, 0.4], [0, 1.4, -9], DARK, false),
    b([7.4, 0.2, 0.4], [0, 1.4, 7.5], DARK, false),
  ]
}

function studsFor(bricks) {
  const byColor = new Map()
  for (const { size, pos, color, studs } of bricks) {
    if (!studs) continue
    const [w, h, l] = size
    const cols = Math.max(1, Math.floor(w))
    const rows = Math.max(1, Math.floor(l))
    const list = byColor.get(color) || []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        list.push([
          pos[0] - cols / 2 + i + 0.5,
          pos[1] + h + STUD_HEIGHT / 2,
          pos[2] - rows / 2 + j + 0.5,
        ])
      }
    }
    byColor.set(color, list)
  }
  return [...byColor.entries()]
}

const studGeometry = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16)

function Studs({ color, positions }) {
  const ref = useRef()
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const setRef = (mesh) => {
    ref.current = mesh
    if (!mesh) return
    positions.forEach((p, i) => mesh.setMatrixAt(i, matrix.makeTranslation(p[0], p[1], p[2])))
    mesh.instanceMatrix.needsUpdate = true
  }
  return (
    <instancedMesh ref={setRef} args={[studGeometry, undefined, positions.length]} castShadow>
      <meshStandardMaterial color={color} roughness={0.28} />
    </instancedMesh>
  )
}

function Wheel({ position, width, radius }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 32]} />
        <meshStandardMaterial color={TIRE} roughness={0.85} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.58, radius * 0.58, width + 0.04, 24]} />
        <meshStandardMaterial color={RIM} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Pestaña para que el giro de la rueda se note */}
      <mesh position={[0, 0, radius * 0.35]}>
        <boxGeometry args={[0.3, width + 0.08, 0.3]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
    </group>
  )
}

export const LegoF1Car = forwardRef(function LegoF1Car({ livery, spinWheels = false }, ref) {
  const bricks = useMemo(() => buildBricks(livery), [livery])
  const studs = useMemo(() => studsFor(bricks), [bricks])
  const wheels = useRef([])
  const speed = useRef(0)

  useFrame((_, delta) => {
    speed.current = THREE.MathUtils.damp(speed.current, spinWheels ? 14 : 0, 3, delta)
    for (const w of wheels.current) if (w) w.rotation.x -= speed.current * delta
  })

  const wheelSpecs = [
    { pos: [-4.4, 1.5, -9], width: 1.6, radius: 1.5 },
    { pos: [4.4, 1.5, -9], width: 1.6, radius: 1.5 },
    { pos: [-4.5, 1.7, 7.5], width: 2, radius: 1.7 },
    { pos: [4.5, 1.7, 7.5], width: 2, radius: 1.7 },
  ]

  return (
    <group ref={ref} scale={STUD}>
      {bricks.map(({ size, pos, color }, i) => (
        <RoundedBox
          key={i}
          args={size}
          radius={Math.min(0.08, Math.min(...size) / 2.2)}
          smoothness={2}
          position={[pos[0], pos[1] + size[1] / 2, pos[2]]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.28} />
        </RoundedBox>
      ))}
      {studs.map(([color, positions]) => (
        <Studs key={color} color={color} positions={positions} />
      ))}
      {wheelSpecs.map((w, i) => (
        <group key={i} ref={(el) => (wheels.current[i] = el)} position={w.pos}>
          <Wheel position={[0, 0, 0]} width={w.width} radius={w.radius} />
        </group>
      ))}
      {/* Casco del piloto + halo */}
      <mesh position={[0, PLATE + 2.2, -1.6]} castShadow>
        <sphereGeometry args={[0.8, 24, 16]} />
        <meshStandardMaterial color={livery.accent} roughness={0.2} />
      </mesh>
      <mesh position={[0, PLATE + 2.1, -2.4]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.1, 0.14, 8, 24, Math.PI]} />
        <meshStandardMaterial color={DARK} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  )
})
