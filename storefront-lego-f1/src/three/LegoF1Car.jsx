import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// Auto F1 estilo LEGO Technic (paneles lisos, sin studs), 100% procedural.
// Unidades del auto: ~28 de largo × 10.5 de ancho; el grupo se escala con UNIT.
// Espacio del auto: X = ancho, Y = arriba, Z = largo (morro hacia -Z).

export const UNIT = 0.1
export const CAR_CENTER_Z = -1.15 // centro del largo total, para colgarlo centrado

const TIRE = '#141415'
const RIM = '#2a2b2e'
const CARBON = '#0e0e0f'

// ---------- geometría ----------

// Silueta vista desde arriba (puntos [x, z]) extruida hacia arriba, con bisel suave.
function planGeometry(points, height, bevel = 0.12) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, bevel, 0)
  geo.computeVertexNormals()
  return geo
}

// Media silueta (x >= 0, de adelante hacia atrás) -> silueta completa simétrica.
function mirror(half) {
  const left = [...half].reverse().map(([x, z]) => [-x, z])
  return [...half, ...left]
}

function Panel({ points, height, y, color, bevel, rough = 0.32, metal = 0.05 }) {
  const geo = useMemo(() => planGeometry(points, height, bevel), [points, height, bevel])
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

function Block({ size, pos, color, radius = 0.08, rough = 0.32, metal = 0.05, rot }) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, Math.min(...size) / 2.05)}
      smoothness={3}
      position={pos}
      rotation={rot}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </RoundedBox>
  )
}

const up = new THREE.Vector3(0, 1, 0)
function Rod({ from, to, r = 0.12, color = CARBON }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()),
      len: dir.length(),
    }
  }, [from, to])
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.3} />
    </mesh>
  )
}

// ---------- piezas ----------

function Wheel({ radius, width, stripe, side }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, width, 40, 1]} />
        <meshStandardMaterial color={TIRE} roughness={0.9} />
      </mesh>
      {/* Banda de color del compuesto en ambas caras del neumático */}
      {[1, -1].map((f) => (
        <mesh key={f} position={[0, (f * width) / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.8, 0.07, 8, 48]} />
          <meshStandardMaterial
            color={stripe}
            roughness={0.5}
            emissive={stripe}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, width + 0.06, 32]} />
        <meshStandardMaterial color={RIM} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Tapa de cubo Technic, con marca para que el giro se note */}
      <mesh position={[0, (-side * (width + 0.1)) / 2, 0]}>
        <cylinderGeometry args={[radius * 0.3, radius * 0.3, 0.1, 6]} />
        <meshStandardMaterial color="#6b6e73" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[radius * 0.45, (-side * (width + 0.08)) / 2, 0]}>
        <boxGeometry args={[0.35, 0.08, 0.18]} />
        <meshStandardMaterial color="#8a8d92" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  )
}

function FrontWing({ l }) {
  const span = 5.1
  const elements = [
    { z: -14.6, d: 1.2, y: 0.35, color: l.wing },
    { z: -13.7, d: 0.9, y: 0.75, color: l.wing },
    { z: -12.95, d: 0.7, y: 1.15, color: l.wingAccent },
  ]
  return (
    <group>
      {elements.map((e, i) => (
        <Block
          key={i}
          size={[span * 2 - i * 0.6, 0.22, e.d]}
          pos={[0, e.y, e.z]}
          rot={[-0.12 - i * 0.1, 0, 0]}
          color={e.color}
          radius={0.1}
        />
      ))}
      {/* Detalle de acento en el borde exterior */}
      {[1, -1].map((s) => (
        <Block
          key={s}
          size={[2.2, 0.24, 0.35]}
          pos={[s * 3.4, 0.5, -15.1]}
          color={l.accent}
          radius={0.1}
        />
      ))}
      {[1, -1].map((s) => (
        <Block
          key={`ep${s}`}
          size={[0.22, 1.7, 3.4]}
          pos={[s * span, 0.95, -13.6]}
          color={l.wing}
        />
      ))}
    </group>
  )
}

function RearWing({ l, drsRef }) {
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s}>
          <Block size={[0.24, 3.6, 3]} pos={[s * 4.3, 2.4, 11.4]} color={l.wing} />
          <Block size={[0.26, 0.9, 1.6]} pos={[s * 4.31, 3.6, 11.1]} color={l.accent} />
        </group>
      ))}
      {/* Plano principal + ala de DRS (bisagra en el borde de ataque) */}
      <Block
        size={[8.4, 0.26, 1.5]}
        pos={[0, 3.3, 11.0]}
        rot={[-0.15, 0, 0]}
        color={l.wing}
        radius={0.1}
      />
      <group ref={drsRef} position={[0, 3.75, 11.6]}>
        <Block
          size={[8.4, 0.22, 1.2]}
          pos={[0, 0, 0.55]}
          rot={[-0.35, 0, 0]}
          color={l.rearFlap ?? l.wing}
          radius={0.1}
        />
      </group>
      {/* Beam wing, pilón central y difusor */}
      <Block size={[5.6, 0.24, 0.9]} pos={[0, 1.4, 11.6]} color={l.wing} />
      <Block size={[0.5, 2.2, 0.6]} pos={[0, 2.2, 11.2]} color={CARBON} />
      <Block size={[4.2, 0.9, 1.6]} pos={[0, 0.6, 12.2]} color={CARBON} />
      <mesh position={[0, 1.2, 12.9]}>
        <boxGeometry args={[0.35, 0.35, 0.1]} />
        <meshStandardMaterial
          color="#ff2a2a"
          emissive="#ff2a2a"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// Motor V6 a la vista (como el set Technic del W14) o caja de cambios amarilla (RB-20)
function Engine({ kind, l }) {
  if (kind === 'mercedes') {
    const bronze = '#b8925a'
    return (
      <group position={[0, 2.6, 4.6]}>
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <mesh
              key={`${s}${i}`}
              position={[s * 0.55, 0.25, -1.2 + i * 1.2]}
              rotation={[0, 0, s * 0.5]}
              castShadow
            >
              <cylinderGeometry args={[0.32, 0.32, 0.9, 16]} />
              <meshStandardMaterial color={bronze} metalness={0.75} roughness={0.3} />
            </mesh>
          )),
        )}
        <Block size={[0.5, 0.35, 4]} pos={[0, 0.1, 0]} color="#c9ccd0" metal={0.6} rough={0.3} />
        <Block size={[0.35, 0.3, 0.9]} pos={[0, 0.45, -1.9]} color="#d61f26" />
      </group>
    )
  }
  if (kind === 'gearbox') {
    return (
      <group position={[0, 2.5, 6.4]}>
        <Block size={[1.2, 0.8, 1.6]} pos={[0, 0, 0]} color={l.helmet} />
        <Block size={[0.4, 0.5, 0.6]} pos={[0.5, 0.5, -0.3]} color={l.accent} />
      </group>
    )
  }
  return null
}

// Líneas de la decoración (sin logotipos): siguen la parte superior de la carrocería.
function Stripes({ model, l }) {
  const y = 2.42
  if (model.key === 'mercedes') {
    return (
      <group>
        {[1, -1].map((s) => (
          <group key={s}>
            <Block
              size={[0.14, 0.06, 6]}
              pos={[s * 0.62, 2.23, -9.7]}
              color={l.accent}
              radius={0.02}
            />
            <Block
              size={[0.18, 0.06, 4.6]}
              pos={[s * 3.2, 2.02, 0.5]}
              rot={[0, s * 0.18, 0]}
              color={l.stripes}
              radius={0.02}
            />
            <Block
              size={[0.14, 0.06, 3]}
              pos={[s * 2.4, 2.02, 3.6]}
              rot={[0, s * 0.35, 0]}
              color={l.accent}
              radius={0.02}
            />
          </group>
        ))}
      </group>
    )
  }
  if (model.key === 'redbull') {
    return (
      <group>
        {/* Toro rojo/amarillo estilizado en la cubierta: solo bandas de color */}
        <Block size={[0.9, 0.08, 3.2]} pos={[0, 3.25, 5.6]} color={l.accent} radius={0.03} />
        <Block size={[0.45, 0.1, 2.2]} pos={[0, 3.3, 5.3]} color={l.noseTip} radius={0.03} />
        {[1, -1].map((s) => (
          <Block
            key={s}
            size={[0.16, 0.06, 4]}
            pos={[s * 3.0, 2.02, 1.4]}
            rot={[0, s * 0.2, 0]}
            color={l.stripes}
            radius={0.02}
          />
        ))}
        <Block size={[1.3, 0.06, 1.8]} pos={[0, y, -3.9]} color={l.bodyAlt} radius={0.03} />
      </group>
    )
  }
  // Ferrari
  return (
    <group>
      <Block size={[0.9, 0.06, 1.2]} pos={[0, 2.23, -10.5]} color={l.stripes} radius={0.03} />
      {[1, -1].map((s) => (
        <Block
          key={s}
          size={[0.12, 0.06, 5]}
          pos={[s * 3.4, 2.02, 0.4]}
          rot={[0, s * 0.16, 0]}
          color={l.stripes}
          radius={0.02}
        />
      ))}
      <Block size={[0.5, 0.06, 0.5]} pos={[0, 3.25, 7.2]} color={l.accent} radius={0.03} />
    </group>
  )
}

// ---------- auto completo ----------

const FLOOR = mirror([
  [1.4, -7.5],
  [4.6, -4],
  [4.9, 4.5],
  [3.4, 9.6],
  [1.8, 11.2],
])
const NOSE = mirror([
  [0.35, -15.2],
  [0.6, -13],
  [0.85, -10],
  [1.1, -7],
])
const CHASSIS = mirror([
  [1.1, -7.3],
  [1.4, -4.5],
  [1.55, -1.5],
  [1.35, 1.5],
  [0.8, 3.5],
])
const SIDEPOD_R = [
  [1.2, -3.4],
  [3.6, -3.4],
  [4.25, -2.3],
  [4.2, 0],
  [3.6, 2.6],
  [2.5, 5.2],
  [1.4, 7.4],
  [1.1, 7.4],
]
const SIDEPOD_L = [...SIDEPOD_R].reverse().map(([x, z]) => [-x, z])
const COVER = mirror([
  [0.8, -1],
  [1.25, 1],
  [1.2, 4],
  [0.85, 7],
  [0.45, 10.2],
])


// Studs LEGO sobre las superficies planas de arriba (pontones, morro y cubierta del motor):
// así el auto se lee como construido con ladrillos. Un solo InstancedMesh por auto.
const STUD_PITCH = 0.8
function inside([x, z], poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit
  }
  return hit
}
function studSpots(poly, y, margin = 0.45) {
  const xs = poly.map((p) => p[0])
  const zs = poly.map((p) => p[1])
  const out = []
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += STUD_PITCH) {
    for (let z = Math.min(...zs); z <= Math.max(...zs); z += STUD_PITCH) {
      const ok = [
        [x, z],
        [x + margin, z],
        [x - margin, z],
        [x, z + margin],
        [x, z - margin],
      ].every((q) => inside(q, poly))
      if (ok) out.push([x, y, z])
    }
  }
  return out
}
let studGeo
function Studs({ spots, color }) {
  const ref = useRef()
  if (!studGeo) studGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.17, 14).translate(0, 0.085, 0)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    spots.forEach((p, i) => ref.current.setMatrixAt(i, m.makeTranslation(...p)))
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots])
  return (
    <instancedMesh ref={ref} args={[studGeo, null, spots.length]} castShadow>
      <meshStandardMaterial color={color} roughness={0.32} metalness={0.05} />
    </instancedMesh>
  )
}

export function LegoF1Car({
  model,
  spinWheels = false,
  steer = 0,
  drsOpen = false,
  studs = false,
}) {
  const l = model.livery
  const studGroups = useMemo(
    () =>
      studs
        ? [
            [studSpots(SIDEPOD_R, 2.0), l.body],
            [studSpots(SIDEPOD_L, 2.0), l.body],
            [studSpots(NOSE, 2.2, 0.3), l.nose],
            [studSpots(COVER, 3.2, 0.3), l.body],
          ].filter(([spots]) => spots.length)
        : [],
    [studs, l],
  )
  const wheels = useRef([])
  const fronts = useRef([])
  const drs = useRef()
  const speed = useRef(0)

  useFrame((_, dt) => {
    speed.current = THREE.MathUtils.damp(speed.current, spinWheels ? 12 : 0, 3, dt)
    for (const w of wheels.current) if (w) w.rotation.x -= speed.current * dt
    for (const f of fronts.current)
      if (f) f.rotation.y = THREE.MathUtils.damp(f.rotation.y, steer, 5, dt)
    if (drs.current)
      drs.current.rotation.x = THREE.MathUtils.damp(
        drs.current.rotation.x,
        drsOpen ? 0.9 : 0,
        6,
        dt,
      )
  })

  const wheelSpecs = [
    { pos: [-4.55, 1.65, -9.2], width: 1.7, radius: 1.65, front: true, side: -1 },
    { pos: [4.55, 1.65, -9.2], width: 1.7, radius: 1.65, front: true, side: 1 },
    { pos: [-4.7, 1.8, 7.8], width: 2.2, radius: 1.8, side: -1 },
    { pos: [4.7, 1.8, 7.8], width: 2.2, radius: 1.8, side: 1 },
  ]

  return (
    <group scale={UNIT}>
      <Panel points={FLOOR} height={0.3} y={0.25} color={l.floor} bevel={0.08} rough={0.6} />
      <Panel points={NOSE} height={0.95} y={1.25} color={l.nose} bevel={0.2} />
      {l.noseTip && (
        <Block size={[0.8, 0.8, 1.4]} pos={[0, 1.65, -14.6]} color={l.noseTip} radius={0.3} />
      )}
      <Panel points={CHASSIS} height={1.85} y={0.55} color={l.body} bevel={0.25} />
      <Panel points={SIDEPOD_R} height={1.45} y={0.55} color={l.body} bevel={0.3} />
      <Panel points={SIDEPOD_L} height={1.45} y={0.55} color={l.body} bevel={0.3} />
      {/* Tomas de aire de los pontones */}
      {[1, -1].map((s) => (
        <Block key={s} size={[2.2, 0.9, 0.3]} pos={[s * 2.5, 1.35, -3.45]} color={CARBON} />
      ))}
      <Panel points={COVER} height={1.0} y={2.2} color={l.body} bevel={0.3} />
      {/* Aleta de tiburón */}
      <Block size={[0.14, 1.1, 5.5]} pos={[0, 3.5, 6.2]} color={l.bodyAlt} radius={0.05} />

      {/* Cockpit, piloto y halo */}
      <Block size={[1.5, 0.3, 3.1]} pos={[0, 2.4, -2.6]} color="#050505" radius={0.14} />
      <mesh position={[0, 2.85, -1.9]} castShadow>
        <sphereGeometry args={[0.72, 32, 20]} />
        <meshStandardMaterial color={l.helmet} roughness={0.15} metalness={0.2} />
      </mesh>
      <Block size={[1.3, 0.9, 1.5]} pos={[0, 3.05, -0.3]} color={l.bodyAlt} radius={0.35} />
      <mesh position={[0, 3.25, -2.2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.05, 0.16, 10, 32, Math.PI]} />
        <meshStandardMaterial color={CARBON} roughness={0.35} metalness={0.4} />
      </mesh>
      <Rod from={[0, 2.5, -4.1]} to={[0, 3.25, -3.25]} r={0.14} />

      {/* Retrovisores */}
      {[1, -1].map((s) => (
        <group key={`m${s}`}>
          <Rod from={[s * 1.3, 2.3, -3.6]} to={[s * 2.3, 2.7, -3.6]} r={0.07} />
          <Block
            size={[0.9, 0.4, 0.25]}
            pos={[s * 2.55, 2.75, -3.6]}
            color={l.bodyAlt}
            radius={0.1}
          />
        </group>
      ))}

      {studGroups.map(([spots, color], i) => (
        <Studs key={i} spots={spots} color={color} />
      ))}
      <FrontWing l={l} />
      <RearWing l={l} drsRef={drs} />
      <Engine kind={model.engine} l={l} />
      <Stripes model={model} l={l} />

      {/* Suspensión delantera y trasera */}
      {[1, -1].map((s) => (
        <group key={`s${s}`}>
          <Rod from={[s * 1.1, 1.9, -8.2]} to={[s * 3.8, 1.9, -9.2]} />
          <Rod from={[s * 1.1, 1.9, -10.2]} to={[s * 3.8, 1.9, -9.2]} />
          <Rod from={[s * 1.0, 1.1, -8.4]} to={[s * 3.8, 1.3, -9.2]} />
          <Rod from={[s * 1.0, 2.2, 6.8]} to={[s * 3.7, 2.1, 7.8]} />
          <Rod from={[s * 1.0, 2.2, 8.8]} to={[s * 3.7, 2.1, 7.8]} />
          <Rod from={[s * 1.0, 1.2, 7.4]} to={[s * 3.7, 1.4, 7.8]} />
        </group>
      ))}

      {wheelSpecs.map((w, i) => (
        <group
          key={i}
          position={w.pos}
          ref={(el) => {
            if (w.front) fronts.current[i] = el
          }}
        >
          <group ref={(el) => (wheels.current[i] = el)}>
            <Wheel radius={w.radius} width={w.width} stripe={model.tires} side={w.side} />
          </group>
        </group>
      ))}
    </group>
  )
}
