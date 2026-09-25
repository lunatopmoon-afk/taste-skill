import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { LegoF1Car, UNIT, CAR_CENTER_Z } from './LegoF1Car.jsx'

// Entrada de la página (boceto aprobado):
//   1. Tres autos F1 "reales" (pintura brillante, morro hacia abajo) caen sobre el negro.
//   2. Estallan en piezas LEGO que vuelan hacia la cámara, con profundidad.
//   3. Las piezas se rearman como el auto LEGO real (el de la foto), ahora morro arriba.
//   4. Los cuadros llegan desde el fondo y cada LEGO encaja en su cuadro.
//   5. Se prenden las tres luces a la vez.
// Todo se mide en segundos sobre un único reloj (timeline.current.t).

export const INTRO = {
  carsIn: 0, // caen los autos reales
  burst: 2.9, // estallan
  reform: 4.5, // empiezan a rearmarse
  reformed: 6.0, // ya son LEGO
  framesIn: 6.1, // los cuadros llegan desde el fondo
  framesSet: 7.6,
  integrate: 7.7, // el LEGO entra al cuadro
  integrated: 8.25,
  lights: 8.5, // luces
  done: 9.2,
}

export const Z_FLOAT = 1.4 // altura a la que flotan los autos delante de la pared

const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const PIECES = SMALL_SCREEN ? 260 : 520

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeInCubic = (p) => p * p * p
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const span = (t, a, b) => clamp01((t - a) / (b - a))

// Pseudo-aleatorio estable por auto
function rng(seed) {
  let s = seed * 9301 + 49297
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// ---------- 1. Auto real ----------

// El mismo auto 3D del proyecto, pero con pintura de auto real: laca con brillo.
function RealCar({ model, x, index, timeline }) {
  const ref = useRef()
  const body = useRef()

  useLayoutEffect(() => {
    body.current.traverse((o) => {
      if (!o.isMesh) return
      const old = o.material
      if (!old?.color) return
      o.material = new THREE.MeshPhysicalMaterial({
        color: old.color,
        roughness: 0.22,
        metalness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        emissive: old.emissive ?? new THREE.Color(0),
        emissiveIntensity: old.emissiveIntensity ?? 0,
      })
      old.dispose?.()
    })
  }, [])

  useFrame(() => {
    const t = timeline.current.t
    const g = ref.current
    g.visible = t < INTRO.burst
    if (!g.visible) return
    const p = easeOutCubic(span(t, INTRO.carsIn + index * 0.18, INTRO.carsIn + index * 0.18 + 2))
    // cae desde arriba y desde lejos, con un leve giro que se asienta
    g.position.set(x, THREE.MathUtils.lerp(10, 0, p), THREE.MathUtils.lerp(-8, Z_FLOAT, p))
    g.rotation.z = Math.PI + (1 - p) * 0.35 * (index % 2 ? 1 : -1)
    // "respira" un poco antes de estallar
    const pre = span(t, INTRO.burst - 0.5, INTRO.burst)
    g.scale.setScalar(1 + pre * pre * 0.05 + Math.sin(t * 40) * pre * 0.006)
  })

  return (
    <group ref={ref}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={1.24}>
        <group ref={body} position={[0, 0, -CAR_CENTER_Z * UNIT]}>
          <LegoF1Car model={model} />
        </group>
      </group>
    </group>
  )
}

// ---------- 2 y 3. Piezas LEGO ----------

const GEOMETRIES = {
  beam: new THREE.BoxGeometry(1, 0.22, 0.22), // viga Technic
  brick: new THREE.BoxGeometry(0.55, 0.32, 0.32),
  gear: new THREE.CylinderGeometry(0.5, 0.5, 0.14, 12),
  pin: new THREE.CylinderGeometry(0.11, 0.11, 0.6, 8),
}
const MIX = [
  ['beam', 0.4],
  ['brick', 0.3],
  ['pin', 0.18],
  ['gear', 0.12],
]

// Puntos del auto LEGO (y su color) tomados de la foto recortada
function sampleCar(image, width, height, count, seed) {
  const c = document.createElement('canvas')
  const H = 180
  const W = Math.round((image.width / image.height) * H)
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  const cells = []
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 150) cells.push(x, y)
  const rand = rng(seed)
  const pts = []
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * (cells.length / 2)) * 2
    const px = cells[k] + rand()
    const py = cells[k + 1] + rand()
    const j = (cells[k + 1] * W + cells[k]) * 4
    pts.push({
      x: (px / W - 0.5) * width,
      y: (0.5 - py / H) * height,
      color: new THREE.Color(data[j] / 255, data[j + 1] / 255, data[j + 2] / 255)
        .convertSRGBToLinear()
        .multiplyScalar(1.35),
    })
  }
  return pts
}

function Pieces({ cutout, x, width, height, index, timeline }) {
  const meshes = useRef({})
  const pieces = useMemo(() => {
    const pts = sampleCar(cutout.image, width, height, PIECES, index + 1)
    const rand = rng(100 + index)
    return pts.map((p) => {
      const r = rand()
      let acc = 0
      const type = MIX.find(([, w]) => (acc += w) >= r)?.[0] ?? 'beam'
      // origen: el auto real está girado 180° (morro abajo), así que se refleja
      const sx = -p.x
      const sy = -p.y
      const dist = Math.hypot(sx, sy) + 0.3
      const out = 1.2 + rand() * 3.4
      return {
        type,
        color: p.color,
        start: new THREE.Vector3(sx, sy, (rand() - 0.3) * 0.5),
        vel: new THREE.Vector3(
          (sx / dist) * out + (rand() - 0.5) * 1.5,
          (sy / dist) * out + (rand() - 0.5) * 1.5,
          2 + rand() * 9, // hacia la cámara: la profundidad del estallido
        ),
        spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(9),
        target: new THREE.Vector3(p.x, p.y, 0.05 + rand() * 0.12),
        size: 0.09 + rand() * 0.12,
        delay: rand() * 0.55,
      }
    })
  }, [cutout, width, height, index])

  const byType = useMemo(() => {
    const m = {}
    pieces.forEach((p, i) => (m[p.type] ??= []).push(i))
    return m
  }, [pieces])

  const materials = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(GEOMETRIES).map((k) => [
          k,
          new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.08 }),
        ]),
      ),
    [],
  )
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])

  useLayoutEffect(() => {
    for (const [type, ids] of Object.entries(byType)) {
      const mesh = meshes.current[type]
      ids.forEach((id, j) => mesh.setColorAt(j, pieces[id].color))
      mesh.instanceColor.needsUpdate = true
    }
  }, [byType, pieces])

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      a: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(() => {
    const t = timeline.current.t
    const active = t >= INTRO.burst && t < INTRO.reformed + 0.8
    for (const [type, ids] of Object.entries(byType)) {
      const mesh = meshes.current[type]
      mesh.visible = active
      if (!active) continue
      ids.forEach((id, j) => {
        const pc = pieces[id]
        const k = 1.7 // frenado del aire
        // posición del estallido (con frenado exponencial)
        const explodedAt = (time) => {
          const tau = Math.max(0, time - INTRO.burst)
          const f = (1 - Math.exp(-k * tau)) / k
          return tmp.a.copy(pc.vel).multiplyScalar(f).add(pc.start)
        }
        const u = easeInOutCubic(span(t, INTRO.reform + pc.delay, INTRO.reform + pc.delay + 1.0))
        const tau = t - INTRO.burst
        if (u <= 0) {
          explodedAt(t)
          tmp.p.copy(tmp.a)
          tmp.e.set(pc.spin.x * tau, pc.spin.y * tau, pc.spin.z * tau)
        } else {
          explodedAt(INTRO.reform + pc.delay)
          tmp.p.copy(tmp.a).lerp(pc.target, u)
          const tr = INTRO.reform + pc.delay - INTRO.burst
          const w = 1 - u
          tmp.e.set(pc.spin.x * tr * w, pc.spin.y * tr * w, pc.spin.z * tr * w)
        }
        // al terminar de armarse, las piezas se funden con la foto del LEGO
        const shrink = 1 - span(t, INTRO.reformed - 0.1, INTRO.reformed + 0.5)
        tmp.s.setScalar(pc.size * shrink)
        tmp.q.setFromEuler(tmp.e)
        tmp.m.compose(tmp.p, tmp.q, tmp.s)
        mesh.setMatrixAt(j, tmp.m)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[x, 0, Z_FLOAT]}>
      {Object.entries(byType).map(([type, ids]) => (
        <instancedMesh
          key={type}
          ref={(m) => (meshes.current[type] = m)}
          args={[GEOMETRIES[type], materials[type], ids.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}

// ---------- 3 y 4. Auto LEGO (foto recortada) que entra al cuadro ----------

function LegoCutout({ cutout, x, width, height, timeline }) {
  const ref = useRef()
  const mat = useRef()
  useFrame(() => {
    const t = timeline.current.t
    const g = ref.current
    g.visible = t >= INTRO.reformed - 0.2 && t < INTRO.integrated
    if (!g.visible) return
    mat.current.opacity = span(t, INTRO.reformed - 0.2, INTRO.reformed + 0.35)
    // entra al cuadro con golpe seco (aceleración al final)
    const p = easeInCubic(span(t, INTRO.integrate, INTRO.integrated))
    g.position.z = THREE.MathUtils.lerp(Z_FLOAT, 0.14, p)
    // se oscurece al entrar, igual que el cuadro con las luces aún apagadas
    mat.current.color.setScalar(THREE.MathUtils.lerp(1, 0.35, p))
  })
  return (
    <mesh ref={ref} position={[x, 0, Z_FLOAT]} renderOrder={2}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={mat}
        map={cutout}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function IntroCar({ product, x, index, width, height, timeline }) {
  const cutout = useTexture(product.model.cutout)
  useMemo(() => {
    cutout.colorSpace = THREE.SRGBColorSpace
    cutout.anisotropy = 8
  }, [cutout])
  return (
    <>
      <RealCar model={product.model} x={x} index={index} timeline={timeline} />
      <Pieces
        cutout={cutout}
        x={x}
        width={width}
        height={height}
        index={index}
        timeline={timeline}
      />
      <LegoCutout cutout={cutout} x={x} width={width} height={height} timeline={timeline} />
    </>
  )
}

// Destello del estallido: una luz cálida que se apaga rápido
function BurstFlash({ timeline }) {
  const ref = useRef()
  useFrame(() => {
    const t = timeline.current.t
    const f = t >= INTRO.burst ? Math.exp(-(t - INTRO.burst) * 5) : 0
    ref.current.intensity = f * 60
  })
  return <pointLight ref={ref} position={[0, 0, 5]} color="#ffd9a0" distance={30} decay={1.6} />
}

export function IntroCars({ products, xs, sizes, timeline }) {
  return (
    <>
      {products.map((p, i) =>
        p.model.cutout ? (
          <IntroCar
            key={p.id}
            product={p}
            x={xs[i]}
            index={i}
            width={sizes[i][0]}
            height={sizes[i][1]}
            timeline={timeline}
          />
        ) : null,
      )}
      <BurstFlash timeline={timeline} />
    </>
  )
}
