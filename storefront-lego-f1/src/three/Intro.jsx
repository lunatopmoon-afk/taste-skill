import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { legoGeometries, nearestLegoColor, PIECE_MIX } from './legoPieces.js'

// Entrada de la página (boceto aprobado):
//   1. Los tres autos F1 reales (fotos recortadas) llegan flotando, cerca y grandes.
//   2. Se desintegran con un borde incandescente y estallan en piezas LEGO reales
//      (ladrillos con studs, vigas Technic, engranajes, ejes, pines) en colores LEGO.
//   3. Las piezas se rearman como el auto LEGO de la foto del cuadro, morro arriba.
//   4. Los cuadros llegan desde el fondo y cada LEGO encaja en su cuadro.
//   5. Se prenden las tres luces a la vez.
// Todo se mide en segundos sobre un único reloj (timeline.current.t).

export const INTRO = {
  carsIn: 0, // llegan los autos reales
  burst: 3.4, // se desintegran
  dissolve: 0.75, // duración de la desintegración
  reform: 5.0, // las piezas empiezan a rearmarse
  reformed: 6.7, // ya son LEGO
  framesIn: 6.8, // los cuadros llegan desde el fondo
  framesSet: 8.3,
  integrate: 8.4, // el LEGO entra al cuadro
  integrated: 8.95,
  lights: 9.2, // luces
  done: 9.9,
}

export const Z_FLOAT = 1.4 // altura a la que flotan los LEGO delante de la pared
const Z_REAL = 6 // los autos reales flotan mucho más cerca de la cámara

const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const PIECES_PER_CAR = SMALL_SCREEN ? 170 : 340
// tamaño de 1 stud en la escena (en celular la cámara está más lejos: piezas más grandes)
const PIECE_SCALE = SMALL_SCREEN ? 0.085 : 0.052

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeInCubic = (p) => p * p * p
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const span = (t, a, b) => clamp01((t - a) / (b - a))

function rng(seed) {
  let s = seed * 9301 + 49297
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Dónde flotan los autos reales: en fila (pantalla ancha) o apilados (celular)
function realLayout(products, size, camera, layout) {
  const aspect = size.width / size.height
  const fov = THREE.MathUtils.degToRad(camera.fov)
  const D = layout.dist * 1.07 // la cámara aún está algo alejada en ese momento
  const visH = 2 * (D - Z_REAL) * Math.tan(fov / 2)
  const visW = visH * aspect
  const aspects = products.map((p) => p.model.realAspect ?? 2.3)
  if (aspect >= 1) {
    const slot = (visW * 0.9) / products.length
    return products.map((_, i) => {
      const w = Math.min(slot * 0.96, visH * 0.55 * aspects[i])
      return { x: (i - (products.length - 1) / 2) * slot, y: layout.baseY, w, h: w / aspects[i] }
    })
  }
  const w = visW * 0.92
  const hs = aspects.map((a) => w / a)
  const total = hs.reduce((a, b) => a + b, 0) * 1.08
  let y = layout.baseY + total / 2
  return hs.map((h) => {
    y -= (h * 1.08) / 2
    const out = { x: 0, y, w, h }
    y -= (h * 1.08) / 2
    return out
  })
}

// ---------- 1 y 2. Auto real que se desintegra ----------

const dissolveVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const dissolveFragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uProgress;
  uniform float uOpacity;
  uniform float uAspect;
  uniform vec3 uGlow;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec4 col = texture2D(map, vUv);
    // se deshace desde el centro hacia afuera, con borde irregular
    vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
    float field = length(c) / (0.5 * length(vec2(uAspect, 1.0))) * 0.75
      + (noise(vUv * vec2(uAspect, 1.0) * 9.0) * 0.6 + noise(vUv * vec2(uAspect, 1.0) * 23.0) * 0.4) * 0.25;
    if (field < uProgress) discard;
    float edge = 1.0 - smoothstep(0.0, 0.05, field - uProgress);
    col.rgb += uGlow * edge * step(0.001, uProgress) * 3.0;
    gl_FragColor = vec4(col.rgb, col.a * uOpacity);
    #include <colorspace_fragment>
  }
`

function RealCar({ texture, place, aspect, index, timeline }) {
  const ref = useRef()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          uProgress: { value: 0 },
          uOpacity: { value: 0 },
          uAspect: { value: aspect },
          uGlow: { value: new THREE.Color('#ffb347') },
        },
        vertexShader: dissolveVertex,
        fragmentShader: dissolveFragment,
        transparent: true,
        depthWrite: false,
      }),
    [texture, aspect],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const t = timeline.current.t
    const g = ref.current
    const end = INTRO.burst + INTRO.dissolve
    g.visible = t < end
    if (!g.visible) return
    const start = INTRO.carsIn + index * 0.2
    const p = easeOutCubic(span(t, start, start + 1.9))
    const side = index % 2 ? 1 : -1
    // llega desde el fondo oscuro, se acerca despacio y flota
    const approach = span(t, start + 1.9, INTRO.burst) * 0.3
    g.position.set(
      place.x,
      place.y + (1 - p) * 2.5 + Math.sin(t * 1.4 + index * 2) * 0.05,
      THREE.MathUtils.lerp(-16, Z_REAL, p) + approach,
    )
    g.rotation.set(Math.sin(t * 0.9 + index) * 0.03, (1 - p) * 0.5 * side, 0)
    // tiembla justo antes de romperse
    const pre = span(t, INTRO.burst - 0.45, INTRO.burst)
    g.position.x += Math.sin(t * 90 + index) * pre * pre * 0.03
    material.uniforms.uOpacity.value = Math.pow(p, 0.7)
    material.uniforms.uProgress.value = span(t, INTRO.burst, end) * 1.25
  })

  return (
    <mesh ref={ref} material={material} renderOrder={3}>
      <planeGeometry args={[place.w, place.h]} />
    </mesh>
  )
}

// ---------- 2 y 3. Piezas LEGO ----------

// Puntos visibles de una imagen con transparencia (y su color), en coordenadas del plano
function samplePoints(image, width, height, count, seed) {
  const c = document.createElement('canvas')
  const H = 160
  const W = Math.round((image.width / image.height) * H)
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  const cells = []
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 160) cells.push(x, y)
  const rand = rng(seed)
  const out = []
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * (cells.length / 2)) * 2
    const j = (cells[k + 1] * W + cells[k]) * 4
    const u = (cells[k] + rand()) / W
    const v = (cells[k + 1] + rand()) / H
    out.push({
      x: (u - 0.5) * width,
      y: (0.5 - v) * height,
      u,
      v,
      color: nearestLegoColor(data[j] / 255, data[j + 1] / 255, data[j + 2] / 255),
    })
  }
  return out
}

function LegoBurst({ cars, timeline }) {
  const geos = useMemo(legoGeometries, [])
  const meshes = useRef({})
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        roughness: 0.24,
        metalness: 0,
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  const pieces = useMemo(() => {
    const all = []
    cars.forEach((car, ci) => {
      const from = samplePoints(car.real.image, car.place.w, car.place.h, PIECES_PER_CAR, ci + 7)
      const to = samplePoints(car.lego.image, car.legoW, car.legoH, PIECES_PER_CAR, ci + 31)
      const rand = rng(200 + ci)
      const aspect = car.place.w / car.place.h
      for (let i = 0; i < PIECES_PER_CAR; i++) {
        const a = from[i]
        const b = to[i]
        const r = rand()
        let acc = 0
        const type = PIECE_MIX.find(([, w]) => (acc += w) >= r)?.[0] ?? 'beam7'
        // aparece cuando el borde incandescente pasa por su punto (mismo campo que el shader)
        const cx = (a.u - 0.5) * aspect
        const cy = a.v - 0.5
        const field = (Math.hypot(cx, cy) / (0.5 * Math.hypot(aspect, 1))) * 0.75 + rand() * 0.25
        const dist = Math.hypot(a.x, a.y) + 0.2
        const out = 1.4 + rand() * 3.6
        all.push({
          type,
          fromColor: a.color,
          toColor: b.color,
          start: new THREE.Vector3(car.place.x + a.x, car.place.y + a.y, Z_REAL + 0.7),
          vel: new THREE.Vector3(
            (a.x / dist) * out + (rand() - 0.5) * 2,
            (a.y / dist) * out + (rand() - 0.5) * 2 + 0.6,
            (rand() - 0.45) * 9, // hacia la cámara y hacia el fondo: profundidad
          ),
          spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(8),
          target: new THREE.Vector3(car.legoX + b.x, b.y, Z_FLOAT + 0.05 + rand() * 0.15),
          size: PIECE_SCALE * (0.8 + rand() * 0.55),
          spawn: INTRO.burst + (INTRO.dissolve * Math.min(field, 1.25)) / 1.25,
          delay: rand() * 0.55,
        })
      }
    })
    return all
  }, [cars])

  const byType = useMemo(() => {
    const m = {}
    pieces.forEach((p, i) => (m[p.type] ??= []).push(i))
    return m
  }, [pieces])

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      a: new THREE.Vector3(),
      s: new THREE.Vector3(),
      c: new THREE.Color(),
    }),
    [],
  )

  useLayoutEffect(() => {
    for (const [type, ids] of Object.entries(byType)) {
      const mesh = meshes.current[type]
      ids.forEach((id, j) => mesh.setColorAt(j, pieces[id].fromColor))
      mesh.instanceColor.needsUpdate = true
    }
  }, [byType, pieces])

  useFrame(() => {
    const t = timeline.current.t
    const active = t >= INTRO.burst && t < INTRO.reformed + 0.7
    const recolor = t >= INTRO.reform && t < INTRO.reformed + 0.2
    const k = 1.5 // frenado del aire
    for (const [type, ids] of Object.entries(byType)) {
      const mesh = meshes.current[type]
      mesh.visible = active
      if (!active) continue
      ids.forEach((id, j) => {
        const pc = pieces[id]
        const flying = (time) => {
          const tau = Math.max(0, time - pc.spawn)
          return tmp.a
            .copy(pc.vel)
            .multiplyScalar((1 - Math.exp(-k * tau)) / k)
            .add(pc.start)
        }
        const u = easeInOutCubic(span(t, INTRO.reform + pc.delay, INTRO.reform + pc.delay + 1.1))
        if (u <= 0) {
          flying(t)
          tmp.p.copy(tmp.a)
          const tau = Math.max(0, t - pc.spawn)
          tmp.e.set(pc.spin.x * tau, pc.spin.y * tau, pc.spin.z * tau)
        } else {
          const tr = INTRO.reform + pc.delay
          flying(tr)
          tmp.p.copy(tmp.a).lerp(pc.target, u)
          const tau = Math.max(0, tr - pc.spawn) * (1 - u)
          tmp.e.set(pc.spin.x * tau, pc.spin.y * tau, pc.spin.z * tau)
        }
        // nace al pasar el borde incandescente y se funde con la foto al final
        const born = t >= pc.spawn ? easeOutCubic(span(t, pc.spawn, pc.spawn + 0.18)) : 0
        const shrink = 1 - span(t, INTRO.reformed - 0.1, INTRO.reformed + 0.5)
        tmp.s.setScalar(pc.size * born * shrink)
        tmp.q.setFromEuler(tmp.e)
        tmp.m.compose(tmp.p, tmp.q, tmp.s)
        mesh.setMatrixAt(j, tmp.m)
        if (recolor) mesh.setColorAt(j, tmp.c.copy(pc.fromColor).lerp(pc.toColor, u))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (recolor) mesh.instanceColor.needsUpdate = true
    }
  })

  return Object.entries(byType).map(([type, ids]) => (
    <instancedMesh
      key={type}
      ref={(m) => (meshes.current[type] = m)}
      args={[geos[type], material, ids.length]}
      frustumCulled={false}
    />
  ))
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

// Destello del estallido y luz frontal para que las piezas se vean con su color
function BurstLights({ timeline }) {
  const flash = useRef()
  const fill = useRef()
  useFrame(() => {
    const t = timeline.current.t
    const f = t >= INTRO.burst ? Math.exp(-(t - INTRO.burst) * 4) : 0
    flash.current.intensity = f * 80
    const on =
      span(t, INTRO.burst, INTRO.burst + 0.3) * (1 - span(t, INTRO.reformed, INTRO.reformed + 0.6))
    fill.current.intensity = on * 2.2
  })
  return (
    <>
      <pointLight
        ref={flash}
        position={[0, 0, Z_REAL + 3]}
        color="#ffd9a0"
        distance={40}
        decay={1.4}
      />
      <directionalLight ref={fill} position={[2, 4, 12]} color="#fff4e6" intensity={0} />
    </>
  )
}

export function IntroCars({ products, xs, sizes, layout, timeline }) {
  const { size, camera } = useThree()
  const list = products.filter((p) => p.model.cutout && p.model.realCar)
  const textures = useTexture(list.flatMap((p) => [p.model.realCar, p.model.cutout]))
  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
    })
  }, [textures])

  const places = useMemo(
    () => realLayout(list, size, camera, layout),
    // se recalcula si cambia el tamaño de la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.width, size.height, layout.dist, layout.baseY, list.length],
  )

  const cars = useMemo(
    () =>
      list.map((p, i) => {
        const idx = products.indexOf(p)
        return {
          real: textures[i * 2],
          lego: textures[i * 2 + 1],
          place: places[i],
          legoX: xs[idx],
          legoW: sizes[idx][0],
          legoH: sizes[idx][1],
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [textures, places, xs.join(','), sizes.map((s) => s.join('x')).join(',')],
  )

  return (
    <>
      {cars.map((c, i) => (
        <RealCar
          key={list[i].id}
          texture={c.real}
          place={c.place}
          aspect={c.place.w / c.place.h}
          index={i}
          timeline={timeline}
        />
      ))}
      <LegoBurst cars={cars} timeline={timeline} />
      {cars.map((c, i) => (
        <LegoCutout
          key={`lego-${list[i].id}`}
          cutout={c.lego}
          x={c.legoX}
          width={c.legoW}
          height={c.legoH}
          timeline={timeline}
        />
      ))}
      <BurstLights timeline={timeline} />
    </>
  )
}
