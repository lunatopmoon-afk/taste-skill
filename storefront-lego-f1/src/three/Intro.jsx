import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { legoGeometries, nearestLegoColor, PIECE_MIX } from './legoPieces.js'
import { FRAME_H, RELIEF_DEPTH } from './LedFrame.jsx'

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
  burst: 1.25, // empiezan a convertirse en LEGO y a romperse
  dissolve: 1.9, // cuánto tarda el auto en deshacerse por completo
  reform: 3.35, // las piezas empiezan a rearmarse
  reformed: 4.55, // ya son LEGO
  framesIn: 4.6, // los cuadros llegan desde el fondo
  framesSet: 5.6,
  integrate: 5.65, // el LEGO entra al cuadro
  integrated: 6.05,
  lights: 6.25, // luces
  done: 6.8,
}

export const Z_FLOAT = 1.4 // altura a la que flotan los LEGO delante de la pared
const Z_REAL = 6 // los autos reales flotan mucho más cerca de la cámara

const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
// Tablets y celulares (pantalla táctil): menos piezas y material más liviano, para 60 fps
export const LOW_POWER =
  SMALL_SCREEN || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
// Cuadrícula de ladrillos 1x2 sobre cada auto: columnas a lo ancho
const GRID_COLS = SMALL_SCREEN ? 8 : LOW_POWER ? 10 : 12
// piezas Technic extra (vigas, engranajes…) por cada ladrillo, para variedad
const EXTRA_RATIO = LOW_POWER ? 0.3 : 0.6

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeInCubic = (p) => p * p * p
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const span = (t, a, b) => clamp01((t - a) / (b - a))

function rng(seed) {
  let s = seed * 9301 + 49297
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Dónde caen los autos reales: justo delante de donde luego quedarán los cuadros, en la
// parte de arriba (el texto de la página queda libre, abajo)
function realLayout(products, size, camera, layout, xs) {
  const fov = THREE.MathUtils.degToRad(camera.fov)
  const D = layout.dist * 1.1 // la cámara aún está algo alejada en ese momento
  const k = (D - Z_REAL) / D // escala de perspectiva entre la pared y el plano de los autos
  const visH = 2 * (D - Z_REAL) * Math.tan(fov / 2)
  return products.map((p, i) => {
    const a = p.model.realAspect ?? 0.41
    const h = FRAME_H * 1.1 * k
    return { x: xs[i] * k, y: layout.baseY * (1 - k), w: h * a, h, visH }
  })
}

// Cuadrícula de ladrillos del auto (aparejo de ladrillo: filas alternas corridas medio
// ladrillo). Cada celda guarda en qué momento (0-1) se suelta; la comparten el shader
// (que abre el hueco) y las piezas (que salen de ese hueco), así coinciden exacto.
function brickGrid(image, place, seed) {
  const cols = GRID_COLS
  const cellU = 1 / cols
  const cellV = cellU * (place.w / place.h) * 0.5 // ladrillo 1x2: el doble de ancho que de alto
  const rows = Math.ceil(1 / cellV)
  const c = document.createElement('canvas')
  const H = 240
  const W = Math.round((image.width / image.height) * H)
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, W, H)
  const px = ctx.getImageData(0, 0, W, H).data
  const at = (u, v) => {
    const x = Math.min(W - 1, Math.max(0, Math.floor(u * W)))
    const y = Math.min(H - 1, Math.max(0, Math.floor(v * H)))
    const j = (y * W + x) * 4
    return [px[j] / 255, px[j + 1] / 255, px[j + 2] / 255, px[j + 3] / 255]
  }
  const texW = cols + 1
  const data = new Uint8Array(texW * rows * 4).fill(255)
  const cells = []
  const rand = rng(seed)
  const aspect = place.w / place.h
  for (let r = 0; r < rows; r++) {
    const shift = r % 2 ? 0.5 : 0
    for (let col = 0; col < texW; col++) {
      const u = (col + 0.5 - shift) / cols
      const v = (r + 0.5) / rows
      if (u < 0 || u > 1) continue
      const [cr, cg, cb, ca] = at(u, v)
      if (ca < 0.45) continue
      // antes en el centro, luego hacia afuera, con mucho azar
      const d = Math.hypot((u - 0.5) * aspect, v - 0.5) / (0.5 * Math.hypot(aspect, 1))
      const release = Math.min(0.97, Math.max(0.03, Math.pow(d * 0.35 + rand() * 0.65, 1.15)))
      data[(r * texW + col) * 4] = Math.round(release * 255)
      cells.push({ u, v, release: Math.round(release * 255) / 255, color: [cr, cg, cb] })
    }
  }
  const texture = new THREE.DataTexture(data, texW, rows, THREE.RGBAFormat)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return { cols, rows, texture, cells, cellW: place.w / cols }
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
  uniform sampler2D uGrid;
  uniform float uCols;
  uniform float uRows;
  uniform float uProgress;
  uniform float uOpacity;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec4 col = texture2D(map, vUv);
    // celda de ladrillo (filas alternas corridas medio ladrillo)
    float vv = 1.0 - vUv.y;
    float row = floor(vv * uRows);
    float shift = mod(row, 2.0) * 0.5;
    float cu = (vUv.x + shift / uCols) * uCols;
    float cell = floor(cu);
    float release = texture2D(uGrid, vec2((cell + 0.5) / (uCols + 1.0), 1.0 - (row + 0.5) / uRows)).r;
    // el ladrillo ya saltó: queda el hueco
    if (release < uProgress) discard;
    // antes de soltarse, el auto se va "convirtiendo" en LEGO: aparecen las juntas de los
    // ladrillos y sus studs, cada vez más marcados
    float reveal = smoothstep(release - 0.45, release - 0.02, uProgress) * step(0.0001, uProgress);
    float f = fract(cu);
    float g = fract(vv * uRows);
    float seam = smoothstep(0.0, 0.07, min(f, 1.0 - f)) * smoothstep(0.0, 0.14, min(g, 1.0 - g));
    // biselado: luz arriba-izquierda, sombra abajo-derecha
    float bevel = ((1.0 - smoothstep(0.0, 0.14, g)) - smoothstep(0.86, 1.0, g)) * 0.14
                + ((1.0 - smoothstep(0.0, 0.07, f)) - smoothstep(0.93, 1.0, f)) * 0.09;
    // dos studs por ladrillo (en proporción del ladrillo 2:1)
    vec2 sp = vec2((f < 0.5 ? f - 0.25 : f - 0.75) * 2.0, g - 0.5);
    float r = length(sp);
    float stud = 1.0 - smoothstep(0.3, 0.34, r);
    float studLight = stud * clamp(-(sp.x + sp.y) * 2.4, -1.0, 1.0);
    // si el ladrillo mide pocos píxeles en pantalla, el detalle se suaviza (sin serrucho)
    float pxRow = 1.0 / max(fwidth(vv * uRows), 1e-4);
    float detail = smoothstep(5.0, 12.0, pxRow);
    vec3 lego = col.rgb * mix(1.0, 0.3, (1.0 - seam) * mix(0.5, 1.0, detail))
      + (bevel * (0.35 + col.rgb) + studLight * 0.14) * detail;
    col.rgb = mix(col.rgb, lego, reveal);
    // justo antes de saltar, el ladrillo se levanta y se aclara un poco
    col.rgb *= 1.0 + smoothstep(release - 0.06, release, uProgress) * 0.25;
    gl_FragColor = vec4(col.rgb, col.a * uOpacity);
    #include <colorspace_fragment>
  }
`

function RealCar({ texture, place, aspect, index, grid, timeline }) {
  const ref = useRef()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          uProgress: { value: 0 },
          uOpacity: { value: 0 },
          uAspect: { value: aspect },
          uGrid: { value: grid.texture },
          uCols: { value: grid.cols },
          uRows: { value: grid.rows },
        },
        vertexShader: dissolveVertex,
        fragmentShader: dissolveFragment,
        transparent: true,
        depthWrite: false,
      }),
    [texture, aspect, grid],
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => grid.texture.dispose(), [grid])

  useFrame(() => {
    const t = timeline.current.t
    const g = ref.current
    const end = INTRO.burst + INTRO.dissolve
    g.visible = t < end
    if (!g.visible) return
    // Cae desde arriba y desde el fondo hacia la pantalla (como en el video), con un
    // pequeño rebote al detenerse
    const start = INTRO.carsIn + index * 0.06
    const u = span(t, start, start + 1.0)
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
    // mismo reloj que las piezas: cada ladrillo se abre cuando su pieza sale disparada
    material.uniforms.uProgress.value = span(t, INTRO.burst, end)
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
      LOW_POWER
        ? // plástico brillante, versión liviana para tablet/celular
          new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0, envMapIntensity: 1.3 })
        : new THREE.MeshPhysicalMaterial({
            // plástico ABS de LEGO: brillante, con reflejo nítido
            roughness: 0.2,
            metalness: 0,
            clearcoat: 0.55,
            clearcoatRoughness: 0.08,
            ior: 1.49,
            specularIntensity: 0.9,
            envMapIntensity: 1.2,
          }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  const pieces = useMemo(() => {
    const all = []
    cars.forEach((car, ci) => {
      const { cells, cellW } = car.grid
      const rand = rng(200 + ci)
      const extra = Math.round(cells.length * EXTRA_RATIO)
      const to = samplePoints(car.lego.image, car.legoW, car.legoH, cells.length + extra, ci + 31)
      const brickScale = cellW / 2 // un ladrillo 1x2 mide 2 studs: ocupa justo su celda
      const push = (cell, type, size, i, fromBack) => {
        const x = (cell.u - 0.5) * car.place.w
        const y = (0.5 - cell.v) * car.place.h
        const dist = Math.hypot(x, y) + 0.2
        const out = 0.25 + rand() * 1.1
        const b = to[i]
        const photo = new THREE.Color().setRGB(...cell.color, THREE.SRGBColorSpace)
        all.push({
          type,
          // al principio conserva el color exacto del auto; en el aire se vuelve color LEGO
          fromColor: photo,
          legoColor: nearestLegoColor(...cell.color),
          toColor: b.color,
          start: new THREE.Vector3(
            car.place.x + x,
            car.place.y + y,
            Z_REAL + (fromBack ? -0.05 : 0.03),
          ),
          vel: new THREE.Vector3(
            (x / dist) * out + (rand() - 0.5) * 0.7,
            (y / dist) * out + (rand() - 0.5) * 0.7,
            2 + rand() * 4.5, // salen disparados hacia la cámara
          ),
          spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(7),
          target: new THREE.Vector3(car.legoX + b.x, b.y, Z_FLOAT + 0.05 + rand() * 0.15),
          size,
          spawn: INTRO.burst + cell.release * INTRO.dissolve + (fromBack ? 0.05 : 0),
          delay: rand() * 0.35,
        })
      }
      // 1. un ladrillo 1x2 (o placa) por celda, del tamaño exacto del hueco que deja
      cells.forEach((cell, i) =>
        push(
          cell,
          rand() < 0.8 ? 'brick1x2' : 'plate1x4',
          brickScale * (rand() < 0.8 ? 1 : 0.5),
          i,
          false,
        ),
      )
      // 2. piezas Technic que salen de adentro del auto
      for (let e = 0; e < extra; e++) {
        const r = rand()
        let acc = 0
        const type = PIECE_MIX.find(([, w]) => (acc += w) >= r)?.[0] ?? 'beam7'
        const cell = cells[Math.floor(rand() * cells.length)]
        push(cell, type, brickScale * (0.45 + rand() * 0.35), cells.length + e, true)
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
    const recolor = t >= INTRO.burst && t < INTRO.reformed + 0.2
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
        const u = easeInOutCubic(span(t, INTRO.reform + pc.delay, INTRO.reform + pc.delay + 0.85))
        // el giro arranca suave: al soltarse, el ladrillo sale plano, con los studs a la cámara
        const turn = (tau) => tau * Math.min(1, tau * 2.2)
        if (u <= 0) {
          flying(t)
          tmp.p.copy(tmp.a)
          const tau = turn(Math.max(0, t - pc.spawn))
          tmp.e.set(Math.PI / 2 + pc.spin.x * tau, pc.spin.y * tau, pc.spin.z * tau)
        } else {
          const tr = INTRO.reform + pc.delay
          flying(tr)
          tmp.p.copy(tmp.a).lerp(pc.target, u)
          const tau = turn(Math.max(0, tr - pc.spawn)) * (1 - u)
          tmp.e.set(Math.PI / 2 + pc.spin.x * tau, pc.spin.y * tau, pc.spin.z * tau)
        }
        // nace al pasar el borde incandescente y se funde con la foto al final
        const born = t >= pc.spawn ? 1 : 0
        const shrink = 1 - span(t, INTRO.reformed - 0.1, INTRO.reformed + 0.5)
        tmp.s.setScalar(pc.size * born * shrink)
        tmp.q.setFromEuler(tmp.e)
        tmp.m.compose(tmp.p, tmp.q, tmp.s)
        mesh.setMatrixAt(j, tmp.m)
        if (recolor) {
          const air = span(t, pc.spawn, pc.spawn + 0.5)
          tmp.c.copy(pc.fromColor).lerp(pc.legoColor, air).lerp(pc.toColor, u)
          mesh.setColorAt(j, tmp.c)
        }
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
    // se detiene justo a la altura del relieve del cuadro: encaja sin atravesarlo
    g.position.z = THREE.MathUtils.lerp(Z_FLOAT, RELIEF_DEPTH + 0.004, p)
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
    () =>
      realLayout(
        list,
        size,
        camera,
        layout,
        list.map((p) => xs[products.indexOf(p)]),
      ),
    // se recalcula si cambia el tamaño de la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // solo se recalcula si el ancho cambia de verdad (no cuando la barra del navegador del
    // celular aparece o se esconde): así la animación no se reinicia ni parpadea
    [Math.round(size.width / 40), list.length],
  )

  const cars = useMemo(
    () =>
      list.map((p, i) => {
        const idx = products.indexOf(p)
        return {
          real: textures[i * 2],
          lego: textures[i * 2 + 1],
          place: places[i],
          grid: brickGrid(textures[i * 2].image, places[i], 11 + i),
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
          grid={c.grid}
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
