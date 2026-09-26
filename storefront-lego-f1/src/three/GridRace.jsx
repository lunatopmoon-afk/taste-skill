import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LegoF1Car } from './LegoF1Car.jsx'
import { legoGeometries, PIECE_MIX } from './legoPieces.js'
import { LOW_POWER } from './Intro.jsx'
import { GRID_TEAMS } from '../lib/gridTeams.js'

// Carrera de la sección "La parrilla completa":
//   1. De noche, con la cámara al ras de la pista, los 12 autos F1 LEGO a tamaño real
//      pasan a toda velocidad rozando la cámara: uno por la derecha, uno por la izquierda,
//      dos del centro que se cruzan... cada vez más rápido, y se pierden detrás de la cámara.
//   2. Cuando pasaron todos, explota una gran nube de piezas LEGO con destello de luz.
//   3. Bajo el destello aparece el cuadro "Lights Out Legends Live" y las piezas se van.
// Todo depende de un solo reloj (clock.current, en segundos).

const SPEED = 62 // unidades por segundo (1 unidad ≈ 2 m: el auto mide 2.8)
const FAR = 110 // de dónde salen (la niebla los esconde)
const LANE = 0.95 // qué tan cerca de la cámara pasan (el auto mide 1.05 de ancho)
const CAM_Y = 0.3

// Orden y carril de cada auto (x0: dónde viene lejos, x1: por dónde pasa la cámara)
const R = [0.35, LANE]
const L = [-0.35, -LANE]
const CA = [-0.25, LANE] // pareja del centro: se cruzan al pasar
const CB = [0.25, -LANE]
const PASSES = [
  [0.9, R],
  [1.42, L],
  [1.92, CA],
  [2.06, CB],
  [2.52, R],
  [2.9, L],
  [3.28, CA],
  [3.4, CB],
  [3.72, R],
  [3.98, L],
  [4.24, CA],
  [4.33, CB],
]

export const RACE = {
  boom: 4.62, // explosión LEGO
  swap: 4.74, // bajo el destello: se cambia la pista por el cuadro
  end: 7.4, // terminan de irse las piezas
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Brillo del destello de la explosión (0 a 1) en el segundo t
export function flashAt(t) {
  return smooth(RACE.boom - 0.02, RACE.boom + 0.1, t) * (1 - smooth(RACE.swap + 0.12, RACE.swap + 1.1, t))
}

// ---------- pista ----------

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  if (repeat) tex.repeat.set(...repeat)
  tex.anisotropy = 8
  return tex
}

function Track() {
  const tex = useMemo(() => {
    const asphalt = canvasTexture(
      256,
      256,
      (ctx, w, h) => {
        const img = ctx.createImageData(w, h)
        let s = 7
        for (let i = 0; i < w * h; i++) {
          s = (s * 16807) % 2147483647
          const v = 26 + (s % 22)
          img.data[i * 4] = v
          img.data[i * 4 + 1] = v
          img.data[i * 4 + 2] = v + 2
          img.data[i * 4 + 3] = 255
        }
        ctx.putImageData(img, 0, 0)
      },
      [6, 90],
    )
    const kerb = canvasTexture(
      8,
      64,
      (ctx) => {
        ctx.fillStyle = '#c91a09'
        ctx.fillRect(0, 0, 8, 32)
        ctx.fillStyle = '#f4f4f4'
        ctx.fillRect(0, 32, 8, 32)
      },
      [1, 110],
    )
    const checker = canvasTexture(
      64,
      8,
      (ctx) => {
        for (let x = 0; x < 64; x++)
          for (let y = 0; y < 8; y++) {
            ctx.fillStyle = (x + y) % 2 ? '#f4f4f4' : '#111'
            ctx.fillRect(x, y, 1, 1)
          }
      },
      [1, 1],
    )
    checker.magFilter = THREE.NearestFilter
    return { asphalt, kerb, checker }
  }, [])
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex])

  const lamps = useMemo(() => {
    const out = []
    for (let z = -14; z > -FAR; z -= 11) out.push(z)
    return out
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -FAR / 2 + 6]}>
        <planeGeometry args={[7, FAR + 20]} />
        <meshStandardMaterial map={tex.asphalt} color="#8a8a8e" roughness={0.78} metalness={0.1} />
      </mesh>
      {/* pianos rojo y blanco a los lados */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s * 3.7, 0.004, -FAR / 2 + 6]}
        >
          <planeGeometry args={[0.45, FAR + 20]} />
          <meshStandardMaterial map={tex.kerb} roughness={0.6} />
        </mesh>
      ))}
      {/* líneas blancas del borde */}
      {[-1, 1].map((s) => (
        <mesh
          key={`l${s}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[s * 3.38, 0.005, -FAR / 2 + 6]}
        >
          <planeGeometry args={[0.07, FAR + 20]} />
          <meshBasicMaterial color="#cfcfcf" toneMapped={false} />
        </mesh>
      ))}
      {/* línea de largada a cuadros */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -9]}>
        <planeGeometry args={[6.76, 0.42]} />
        <meshStandardMaterial map={tex.checker} roughness={0.5} />
      </mesh>
      {/* postes de luz a los lados: dan profundidad y reflejos */}
      {lamps.map((z, i) => (
        <group key={z} position={[(i % 2 ? -1 : 1) * 4.6, 0, z]}>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[0.06, 2.8, 0.06]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[(i % 2 ? 1 : -1) * 0.3, 2.8, 0]}>
            <boxGeometry args={[0.7, 0.06, 0.18]} />
            <meshBasicMaterial color="#fff1d6" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 3.2, -1]} intensity={34} distance={18} decay={2} color="#fff3e0" />
      <pointLight position={[3, 2.4, -12]} intensity={45} distance={24} decay={2} color="#fff0d8" />
      <pointLight position={[-3, 2.4, -26]} intensity={45} distance={24} decay={2} color="#fff0d8" />
      <pointLight position={[3, 2.4, -42]} intensity={45} distance={24} decay={2} color="#fff0d8" />
      <directionalLight position={[-4, 6, 6]} intensity={0.9} color="#dfe6ff" />
      <hemisphereLight args={['#7c8494', '#050505', 0.55]} />
      <Grandstand />
    </group>
  )
}

// Luces lejanas de las tribunas: puntos que no se esconden en la niebla
function Grandstand() {
  const geo = useMemo(() => {
    const r = rng(99)
    const pts = []
    for (let i = 0; i < 260; i++) {
      const side = r() < 0.5 ? -1 : 1
      pts.push(side * (6 + r() * 30), 0.6 + r() * 4.5, -FAR - r() * 30)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffe2b0" size={2.2} sizeAttenuation={false} fog={false} toneMapped={false} />
    </points>
  )
}

// Estelas de luz que pasan veloces a los lados: sensación de velocidad
const STREAKS = LOW_POWER ? 18 : 40
function Streaks({ clock }) {
  const ref = useRef()
  const items = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: STREAKS }, () => ({
      x: (r() < 0.5 ? -1 : 1) * (1.4 + r() * 2.4),
      y: 0.04 + r() * 1.1,
      off: r() * 60,
      len: 1.5 + r() * 3,
      speed: 70 + r() * 50,
    }))
  }, [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = Math.max(0, clock.current)
    // más estelas mientras más rápido pasan los autos
    const k = smooth(0.4, 1.2, t) * (1 - smooth(RACE.boom - 0.3, RACE.boom, t))
    items.forEach((it, i) => {
      const z = -60 + ((it.off + t * it.speed) % 66)
      p.set(it.x, it.y, z)
      s.set(1, 1, it.len * k + 1e-4)
      m.compose(p, q, s)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.material.opacity = 0.35 * k
  })
  return (
    <instancedMesh ref={ref} args={[null, null, STREAKS]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.012, 1]} />
      <meshBasicMaterial
        color="#fff4e0"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// ---------- autos ----------

// En pantalla vertical (celular) pasan más al centro, por debajo de la cámara más alta
const PORTRAIT_LANE = 0.7
const lane = (size) => (size.width < size.height ? PORTRAIT_LANE / LANE : 1)

function RaceCar({ team, pass, clock }) {
  const ref = useRef()
  const [t0, [a0, a1]] = pass
  useFrame(({ size }) => {
    const k0 = lane(size)
    const x0 = a0 * k0
    const x1 = a1 * k0
    const z = (clock.current - t0) * SPEED
    const on = clock.current >= 0 && z > -FAR && z < 9
    ref.current.visible = on
    if (!on) return
    const k = smooth(-30, -1, z)
    ref.current.position.set(x0 + (x1 - x0) * k, 0, z)
    // gira apenas hacia donde se abre
    ref.current.rotation.y = Math.PI - (x1 - x0) * 0.05 * 4 * k * (1 - k)
  })
  return (
    <group ref={ref} visible={false}>
      <LegoF1Car model={team} spinWheels studs />
    </group>
  )
}

// Chispas del fondo plano de los autos
const SPARKS = LOW_POWER ? 140 : 320
function Sparks({ clock }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3))
    return g
  }, [])
  const state = useMemo(
    () => ({
      vel: new Float32Array(SPARKS * 3),
      life: new Float32Array(SPARKS),
      next: 0,
      acc: 0,
    }),
    [],
  )
  const dot = useMemo(
    () =>
      canvasTexture(32, 32, (ctx) => {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
        g.addColorStop(0, '#ffffff')
        g.addColorStop(0.4, 'rgba(255,255,255,0.8)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 32, 32)
      }),
    [],
  )
  useEffect(
    () => () => {
      geo.dispose()
      dot.dispose()
    },
    [geo, dot],
  )
  useFrame(({ size }, dt) => {
    dt = Math.min(dt, 0.05)
    const k0 = lane(size)
    const pos = geo.attributes.position.array
    const t = clock.current
    // nuevas chispas detrás de cada auto que está cerca
    for (const [t0, [x0, x1]] of PASSES) {
      const z = (t - t0) * SPEED
      if (z < -40 || z > 2) continue
      const x = (x0 + (x1 - x0) * smooth(-30, -1, z)) * k0
      state.acc += dt * 90
      while (state.acc > 1) {
        state.acc -= 1
        const i = state.next
        state.next = (state.next + 1) % SPARKS
        pos[i * 3] = x + (Math.random() - 0.5) * 0.5
        pos[i * 3 + 1] = 0.02
        pos[i * 3 + 2] = z - 1.0
        state.vel[i * 3] = (Math.random() - 0.5) * 2
        state.vel[i * 3 + 1] = 0.8 + Math.random() * 1.6
        state.vel[i * 3 + 2] = SPEED * (0.35 + Math.random() * 0.3)
        state.life[i] = 0.25 + Math.random() * 0.3
      }
    }
    for (let i = 0; i < SPARKS; i++) {
      if (state.life[i] <= 0) {
        pos[i * 3 + 1] = -10
        continue
      }
      state.life[i] -= dt
      state.vel[i * 3 + 1] -= 9 * dt
      pos[i * 3] += state.vel[i * 3] * dt
      pos[i * 3 + 1] = Math.max(0.01, pos[i * 3 + 1] + state.vel[i * 3 + 1] * dt)
      pos[i * 3 + 2] += state.vel[i * 3 + 2] * dt
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color="#ffb347"
        map={dot}
        size={0.05}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

// Cámara al ras de la pista; tiembla cuando un auto pasa rozando
function RaceRig({ clock }) {
  const { camera, size } = useThree()
  useFrame(() => {
    const portrait = size.width < size.height
    const fov = portrait ? 74 : 52
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    let shake = 0
    for (const [t0] of PASSES) {
      const z = (clock.current - t0) * SPEED
      shake += Math.exp(-(z * z) / 18)
    }
    shake = Math.min(1, shake)
    const t = clock.current * 60
    const camY = portrait ? 0.56 : CAM_Y
    camera.position.set(
      Math.sin(t * 1.7) * 0.012 * shake,
      camY + Math.sin(t * 2.3) * 0.014 * shake,
      0,
    )
    camera.lookAt(0, camY - 0.1, -14)
  })
  return null
}

export function RaceScene({ clock }) {
  return (
    <group>
      <fog attach="fog" args={['#060607', 16, FAR - 10]} />
      <Track />
      {GRID_TEAMS.map((team, i) => (
        <RaceCar key={team.key} team={team} pass={PASSES[i]} clock={clock} />
      ))}
      <Sparks clock={clock} />
      <Streaks clock={clock} />
      <RaceRig clock={clock} />
    </group>
  )
}

// ---------- explosión LEGO ----------

const PIECES = LOW_POWER ? 260 : 700
const COLORS = [
  '#C91A09',
  '#FE8A18',
  '#0A3463',
  '#008F9B',
  '#184632',
  '#E4ADC8',
  '#F4F4F4',
  '#0055BF',
  '#4BD12A',
  '#E0B000',
  '#A0A5A9',
  '#05131D',
  '#F2CD37',
]

function rng(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Sigue a la cámara: nace frente a ella, en la pista o frente al cuadro
export function LegoExplosion({ clock }) {
  const group = useRef()
  const light = useRef()
  const geos = legoGeometries()
  const kinds = useMemo(() => {
    const r = rng(4242)
    const total = PIECE_MIX.reduce((a, [, w]) => a + w, 0)
    return PIECE_MIX.map(([name, w]) => {
      const n = Math.max(2, Math.round((PIECES * w) / total))
      const items = Array.from({ length: n }, () => {
        // dirección: hacia la cámara y hacia afuera, en todas direcciones
        const a = r() * Math.PI * 2
        const spread = 0.35 + r() * 1.1
        const dir = new THREE.Vector3(Math.cos(a) * spread, Math.sin(a) * spread * 0.8, 0.6 + r() * 1.2)
          .normalize()
        return {
          dir,
          speed: 4 + r() * 13,
          axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
          spin: 3 + r() * 9,
          scale: 0.045 + r() * 0.05,
          color: new THREE.Color(COLORS[Math.floor(r() * COLORS.length)]),
          delay: r() * 0.08,
        }
      })
      return { name, items }
    })
  }, [])
  const refs = useRef([])
  const mats = useMemo(
    () => kinds.map(() => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.05 })),
    [kinds],
  )
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  useLayoutEffect(() => {
    kinds.forEach((k, i) => {
      const mesh = refs.current[i]
      k.items.forEach((it, j) => mesh.setColorAt(j, it.color))
      mesh.instanceColor.needsUpdate = true
    })
  }, [kinds])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    const t = clock.current - RACE.boom
    const on = t > 0 && t < RACE.end - RACE.boom
    group.current.visible = on
    if (light.current) light.current.intensity = on ? 90 * Math.exp(-t * 2.2) : 0
    if (!on) return
    group.current.position.copy(camera.position)
    const drag = 1.4
    kinds.forEach((k, i) => {
      const mesh = refs.current[i]
      k.items.forEach((it, j) => {
        const tt = Math.max(0, t - it.delay)
        const travel = (it.speed * (1 - Math.exp(-drag * tt))) / drag
        p.copy(it.dir).multiplyScalar(travel)
        p.y -= 1.6 * tt * tt
        p.add(ORIGIN)
        q.setFromAxisAngle(it.axis, it.spin * tt)
        const grow = Math.min(1, tt / 0.06)
        const fade = 1 - smooth(1.7, 2.7, tt)
        s.setScalar(it.scale * grow * fade + 1e-4)
        m.compose(p, q, s)
        mesh.setMatrixAt(j, m)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <group ref={group} visible={false}>
      <pointLight ref={light} position={ORIGIN} intensity={0} distance={14} color="#ffd9a0" />
      {kinds.map((k, i) => (
        <instancedMesh
          key={k.name}
          ref={(el) => (refs.current[i] = el)}
          args={[geos[k.name], mats[i], k.items.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}
const ORIGIN = new THREE.Vector3(0, 0.1, -6)
