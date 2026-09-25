import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { legoGeometries, nearestLegoColor, PIECE_MIX } from './legoPieces.js'

// Entrada de la página (boceto aprobado):
//   1. Los tres autos F1 reales, vistos desde arriba (como en el video aprobado), caen
//      desde lo alto hacia la pantalla y quedan grandes y cerca, morro abajo.
//   2. Se van rompiendo poco a poco: de todo el auto saltan piezas LEGO reales
//      (ladrillos con studs, vigas Technic, engranajes, ejes, pines) que vuelan hacia la
//      cámara, mientras la cámara se acerca y una luz del color de cada equipo los baña.
//   3. Las piezas se rearman como el auto LEGO de la foto del cuadro, morro arriba.
//   4. Los cuadros llegan desde el fondo y cada LEGO encaja en su cuadro.
//   5. Se prenden las tres luces a la vez.
// Todo se mide en segundos sobre un único reloj (timeline.current.t).

export const INTRO = {
  carsIn: 0, // caen los autos reales
  burst: 1.9, // empiezan a romperse
  dissolve: 2.5, // cuánto tarda el auto en deshacerse por completo
  reform: 4.7, // las piezas empiezan a rearmarse
  reformed: 6.4, // ya son LEGO
  framesIn: 6.5, // los cuadros llegan desde el fondo
  framesSet: 8.0,
  integrate: 8.1, // el LEGO entra al cuadro
  integrated: 8.65,
  lights: 8.9, // luces
  done: 9.6,
}

export const Z_FLOAT = 1.4 // altura a la que flotan los LEGO delante de la pared
const Z_REAL = 6 // los autos reales flotan mucho más cerca de la cámara

const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const PIECES_PER_CAR = SMALL_SCREEN ? 220 : 480
// tamaño de 1 stud en la escena (en celular la cámara está más lejos: piezas más grandes)
const PIECE_SCALE = SMALL_SCREEN ? 0.07 : 0.05

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeInCubic = (p) => p * p * p
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const span = (t, a, b) => clamp01((t - a) / (b - a))

function rng(seed) {
  let s = seed * 9301 + 49297
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Dónde quedan los autos reales: siempre en fila, vistos desde arriba y lo más grandes posible
function realLayout(products, size, camera, layout) {
  const aspect = size.width / size.height
  const fov = THREE.MathUtils.degToRad(camera.fov)
  const D = layout.dist * 1.1 // la cámara aún está algo alejada en ese momento
  const visH = 2 * (D - Z_REAL) * Math.tan(fov / 2)
  const visW = visH * aspect
  const slot = (visW * 0.96) / products.length
  return products.map((p, i) => {
    const a = p.model.realAspect ?? 0.41
    const h = Math.min(visH * 0.82, (slot * 0.9) / a)
    return { x: (i - (products.length - 1) / 2) * slot, y: layout.baseY, w: h * a, h, visH }
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
    // se rompe a trozos por todo el auto (como piezas que se sueltan), algo antes al centro
    vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = vUv * vec2(uAspect, 1.0);
    float field = length(c) / (0.5 * length(vec2(uAspect, 1.0))) * 0.3
      + (noise(q * 16.0) * 0.55 + noise(q * 41.0) * 0.45) * 0.7;
    if (field < uProgress) discard;
    // borde oscuro, como el hueco que deja una pieza al saltar
    float edge = 1.0 - smoothstep(0.0, 0.035, field - uProgress);
    col.rgb *= 1.0 - edge * step(0.001, uProgress) * 0.75;
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
    // Cae desde arriba y desde el fondo hacia la pantalla (como en el video), con un
    // pequeño rebote al detenerse
    const start = INTRO.carsIn + index * 0.06
    const u = span(t, start, start + 1.3)
    const c1 = 1.25
    const back = 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2) // easeOutBack
    const fall = u >= 1 ? 1 : back
    g.position.set(
      place.x,
      place.y + (1 - fall) * place.visH * 0.75,
      THREE.MathUtils.lerp(Z_REAL - 14, Z_REAL, easeOutCubic(u)),
    )
    // la foto ya viene morro abajo, como en el video
    g.rotation.set(0, 0, 0)
    // al romperse, el auto se sacude levemente
    const hit = t > INTRO.burst ? Math.exp(-(t - INTRO.burst) * 3) : 0
    g.position.x += Math.sin(t * 60 + index) * hit * 0.04
    material.uniforms.uOpacity.value = Math.min(1, u * 2.5)
    // se rompe poco a poco al principio y del todo al final (el auto sigue visible, como en el video)
    material.uniforms.uProgress.value = Math.pow(span(t, INTRO.burst, end), 2.2) * 1.05
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
        clearcoat: 0.3,
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
        // cada pieza se suelta en un momento distinto mientras el auto se rompe
        const cx = (a.u - 0.5) * aspect
        const cy = a.v - 0.5
        const field = Math.pow((Math.hypot(cx, cy) / (0.5 * Math.hypot(aspect, 1))) * 0.3 + rand() * 0.7, 1 / 2.2)
        const dist = Math.hypot(a.x, a.y) + 0.2
        const out = 0.5 + rand() * 1.8
        all.push({
          type,
          fromColor: a.color,
          toColor: b.color,
          start: new THREE.Vector3(car.place.x + a.x, car.place.y + a.y, Z_REAL + 0.7),
          vel: new THREE.Vector3(
            (a.x / dist) * out + (rand() - 0.5) * 1.6,
            (a.y / dist) * out + (rand() - 0.5) * 1.6,
            1 + rand() * 4.5, // saltan hacia la cámara: profundidad
          ),
          spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(8),
          target: new THREE.Vector3(car.legoX + b.x, b.y, Z_FLOAT + 0.05 + rand() * 0.15),
          size: PIECE_SCALE * (0.8 + rand() * 0.55),
          spawn: INTRO.burst + INTRO.dissolve * Math.min(field, 1) * 0.95,
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

// Luces del estallido: una luz del color de cada equipo detrás de cada auto (como en el
// video, el fondo se tiñe de turquesa, azul y rojo) y una luz frontal suave para las piezas
function BurstLights({ cars, timeline }) {
  const team = useRef([])
  const fill = useRef()
  useFrame(() => {
    const t = timeline.current.t
    const on =
      easeOutCubic(span(t, INTRO.burst, INTRO.burst + 0.8)) *
      (1 - span(t, INTRO.reformed - 0.3, INTRO.reformed + 0.5))
    team.current.forEach((l) => l && (l.intensity = on * 8))
    fill.current.intensity = on * 1.5
  })
  return (
    <>
      {cars.map((c, i) => (
        <pointLight
          key={i}
          ref={(l) => (team.current[i] = l)}
          position={[c.place.x, c.place.y, Z_REAL - 3]}
          color={c.color}
          distance={c.place.h * 2.2}
          decay={1.2}
          intensity={0}
        />
      ))}
      <directionalLight ref={fill} position={[1, 3, 14]} color="#fff4e6" intensity={0} />
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
          color: p.model.backdrop.center,
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
      <BurstLights cars={cars} timeline={timeline} />
    </>
  )
}
