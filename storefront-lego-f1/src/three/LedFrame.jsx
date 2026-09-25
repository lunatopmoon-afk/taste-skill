import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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
const DEPTH = 0.4
const INNER_W = 2.56 // ancho del póster dibujado (modelos sin foto)
export const INNER_H = FRAME_H - BORDER * 2
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
  return () => (s = (s * 16807) % 2147483647) / 2147483647
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
    ctx.moveTo(w / 2 - tw / 2 - 150, y2)
    ctx.lineTo(w / 2 - tw / 2 - 30, y2)
    ctx.moveTo(w / 2 + tw / 2 + 30, y2)
    ctx.lineTo(w / 2 + tw / 2 + 150, y2)
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

// Foto real del cuadro en relieve: la malla se levanta donde está el auto LEGO
// (mapa de alturas `*-relieve.png`), así las llantas, la carrocería y los alerones
// sobresalen del fondo. La foto se ve con sus colores reales (emisiva, sin tone mapping)
// y la luz de la escena sombrea los costados del relieve.
// El LEGO se levanta del póster con borde recto (como el modelo real colgado en el cuadro)
export const RELIEF_DEPTH = 0.22
// En pantallas chicas: texturas 2K y menos vértices, para que el celular vaya fluido
const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const RELIEF_SEGMENTS = SMALL_SCREEN ? 200 : 380

// Muestreo bilineal del mapa de alturas: bordes del relieve suaves, sin escalones
function sampleHeight(data, w, h, u, v) {
  const x = u * (w - 1)
  const y = v * (h - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const fx = x - x0
  const fy = y - y0
  const at = (px, py) => data[(py * w + px) * 4]
  const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx
  const bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx
  return (top * (1 - fy) + bottom * fy) / 255
}

function reliefGeometry(width, height, heightImage) {
  const segX = RELIEF_SEGMENTS
  const segY = Math.round(RELIEF_SEGMENTS * (height / width))
  const geo = new THREE.PlaneGeometry(width, height, segX, segY)
  if (heightImage) {
    const c = document.createElement('canvas')
    c.width = heightImage.width
    c.height = heightImage.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(heightImage, 0, 0)
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const z = sampleHeight(data, c.width, c.height, uv.getX(i), 1 - uv.getY(i))
      pos.setZ(i, z * RELIEF_DEPTH)
    }
    geo.computeVertexNormals()
  }
  // Sombra en los costados del relieve: donde la superficie se inclina, se oscurece.
  // Así los bordes del auto se ven como el costado de las piezas y no como foto estirada.
  const normals = geo.attributes.normal
  const colors = new Float32Array(normals.count * 3)
  for (let i = 0; i < normals.count; i++) {
    const facing = THREE.MathUtils.smoothstep(normals.getZ(i), 0.25, 0.92)
    colors.fill(0.28 + 0.72 * facing, i * 3, i * 3 + 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

// El color de la foto es emisivo: se multiplica también por el sombreado de costados
function shadeEmissiveByVertexColor(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance *= vColor.rgb;\n#endif',
  )
}

// ---------- llantas 3D ----------
// Las llantas son lo que más sobresale del cuadro real (ver videos del producto), así que
// no se "estiran" desde la foto: son cilindros reales. La banda de rodadura usa la misma
// foto proyectada de frente (de frente se ve idéntica a la foto) y el costado lleva
// neumático, banda de color del compuesto, rin y centro.

let sidewallCache = new Map()
function sidewallTexture(band) {
  if (sidewallCache.has(band)) return sidewallCache.get(band)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const R0 = S / 2
  const ring = (r, fill) => {
    ctx.beginPath()
    ctx.arc(R0, R0, r * R0, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
  }
  // goma: negro satinado con un leve degradado
  const rubber = ctx.createRadialGradient(R0, R0, R0 * 0.6, R0, R0, R0)
  rubber.addColorStop(0, '#1b1b1d')
  rubber.addColorStop(0.85, '#111112')
  rubber.addColorStop(1, '#070708')
  ring(1, rubber)
  // banda de color del compuesto
  ring(0.86, band)
  ring(0.8, '#141415')
  // letras del flanco, sugeridas con trazos finos
  ctx.save()
  ctx.translate(R0, R0)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 28; i++) {
    ctx.rotate((Math.PI * 2) / 28)
    if (i % 7 < 4) ctx.fillRect(-4, -R0 * 0.95, 8, R0 * 0.05)
  }
  ctx.restore()
  // rin: gris grafito con agujeros tipo Technic
  const rim = ctx.createRadialGradient(R0 * 0.85, R0 * 0.8, 0, R0, R0, R0 * 0.62)
  rim.addColorStop(0, '#4a4c50')
  rim.addColorStop(1, '#1d1e21')
  ring(0.62, rim)
  ring(0.6, 'rgba(0,0,0,0)')
  ctx.fillStyle = '#0b0b0c'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(R0 + Math.cos(a) * R0 * 0.38, R0 + Math.sin(a) * R0 * 0.38, R0 * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  // centro
  const hub = ctx.createRadialGradient(R0 * 0.95, R0 * 0.92, 0, R0, R0, R0 * 0.2)
  hub.addColorStop(0, '#b9bcc1')
  hub.addColorStop(1, '#55585d')
  ring(0.2, hub)
  ring(0.07, '#1a1a1c')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  sidewallCache.set(band, t)
  return t
}

// Sombra de contacto debajo de cada llanta
let contactTexture
function getContactTexture() {
  if (contactTexture) return contactTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.95)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.6)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  contactTexture = new THREE.CanvasTexture(c)
  return contactTexture
}

function tireGeometry(box, width, height) {
  const [cx, cy, bw, bh] = box
  const radius = (bh * height) / 2
  const length = bw * width
  const X = (cx - 0.5) * width
  const Y = (0.5 - cy) * height
  const radial = 72
  const geo = new THREE.CylinderGeometry(radius, radius, length, radial, 1)
  geo.rotateZ(Math.PI / 2) // eje de la llanta: horizontal, paralelo a la pared
  // Banda de rodadura: proyección de frente de la foto (coincide exacto con el póster)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const sideCount = (radial + 1) * 2
  for (let i = 0; i < sideCount; i++) {
    uv.setXY(i, (X + pos.getX(i) + width / 2) / width, (Y + pos.getY(i) + height / 2) / height)
  }
  uv.needsUpdate = true
  return { geo, radius, length, X, Y }
}

function Tire({ box, width, height, treadMat, sideMat }) {
  const { geo, radius, length, X, Y } = useMemo(
    () => tireGeometry(box, width, height),
    [box, width, height],
  )
  useEffect(() => () => geo.dispose(), [geo])
  const contact = useMemo(getContactTexture, [])
  return (
    <group>
      <mesh position={[X, Y, 0.006]} renderOrder={1}>
        <planeGeometry args={[length * 1.25, radius * 2.3]} />
        <meshBasicMaterial map={contact} transparent depthWrite={false} opacity={0.9} />
      </mesh>
      <mesh
        position={[X, Y, radius + 0.004]}
        geometry={geo}
        material={[treadMat, sideMat, sideMat]}
        castShadow
      />
    </group>
  )
}

function PhotoPoster({
  src,
  srcSmall,
  relief,
  width,
  height,
  material,
  wheels,
  treadMat,
  sideMat,
  emptySrc,
  emptyMat,
  shadowSrc,
  cutoutSrc,
  cutoutMat,
  posterMat,
  silhouetteMat,
  showCar = true,
}) {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const [texture, heightMap, emptyTex, shadowTex, cutoutTex] = useTexture([
    SMALL_SCREEN && srcSmall ? srcSmall : src,
    relief ?? src,
    emptySrc ?? src,
    shadowSrc ?? relief ?? src,
    cutoutSrc ?? src,
  ])
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = maxAnisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    material.map = texture
    material.emissiveMap = texture
    material.needsUpdate = true
    emptyTex.colorSpace = THREE.SRGBColorSpace
    if (emptyMat) {
      emptyMat.map = emptyTex
      emptyMat.needsUpdate = true
    }
    if (posterMat) {
      posterMat.map = texture
      posterMat.needsUpdate = true
    }
    if (cutoutMat) {
      cutoutTex.colorSpace = THREE.SRGBColorSpace
      cutoutTex.anisotropy = maxAnisotropy
      cutoutMat.map = cutoutTex
      cutoutMat.needsUpdate = true
      if (silhouetteMat) {
        silhouetteMat.map = cutoutTex
        silhouetteMat.needsUpdate = true
      }
    }
    if (treadMat) {
      treadMat.map = texture
      treadMat.emissiveMap = texture
      treadMat.needsUpdate = true
    }
  }, [
    texture,
    emptyTex,
    cutoutTex,
    material,
    treadMat,
    emptyMat,
    cutoutMat,
    posterMat,
    maxAnisotropy,
  ])
  const geometry = useMemo(
    () => reliefGeometry(width, height, relief ? heightMap.image : null),
    [width, height, relief, heightMap],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  // Entrada, antes de que el LEGO encaje: la foto original del cuadro con la silueta
  // negra y nítida del auto (el hueco donde va el LEGO). Nada borroso: el LEGO cae
  // exactamente sobre esa silueta y la tapa.
  if (!showCar && posterMat && silhouetteMat) {
    return (
      <>
        <mesh position={[0, 0, 0.002]} material={posterMat}>
          <planeGeometry args={[width, height]} />
        </mesh>
        <mesh position={[0, 0, 0.004]} material={silhouetteMat} renderOrder={1}>
          <planeGeometry args={[width, height]} />
        </mesh>
      </>
    )
  }
  // Capas: fondo del póster (plano, sin el auto) + sombra + el LEGO recortado encima, a la
  // altura real a la que sobresale. Nada se estira: sin manchas ni deformaciones.
  const layered = Boolean(cutoutSrc && cutoutMat && posterMat)
  return (
    <>
      {layered ? (
        <>
          <mesh position={[0, 0, 0.002]} material={posterMat}>
            <planeGeometry args={[width, height]} />
          </mesh>
          <mesh position={[0, 0, RELIEF_DEPTH]} material={cutoutMat} renderOrder={2}>
            <planeGeometry args={[width, height]} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0, 0.002]} geometry={geometry} material={material} />
      )}
      {wheels?.map((box, i) => (
        <Tire
          key={i}
          box={box}
          width={width}
          height={height}
          treadMat={treadMat}
          sideMat={sideMat}
        />
      ))}
    </>
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

// Retroiluminación LED: una línea de luz delgada detrás del marco, como en la foto del
// producto. Muy brillante pegada al borde y se apaga rápido: solo un filo de luz.
// Se calcula píxel por píxel (sin ctx.filter, que Safari/iPhone/iPad no soportan).
export const HALO_SCALE = 1.22 // el plano del halo mide 1.22× el cuadro
let haloTexture
function getHaloTexture() {
  if (haloTexture) return haloTexture
  const W = 512
  const H = 768
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(W, H)
  const halfW = W / HALO_SCALE / 2
  const halfH = H / HALO_SCALE / 2
  const core = W * 0.01 // filo muy brillante
  const tail = W * 0.028 // resplandor corto hacia afuera
  const margin = (W - W / HALO_SCALE) / 2
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.max(Math.abs(x + 0.5 - W / 2) - halfW, 0)
      const dy = Math.max(Math.abs(y + 0.5 - H / 2) - halfH, 0)
      const d = Math.hypot(dx, dy)
      // llega a cero antes del borde del plano: sin rectángulo visible alrededor
      const fade = Math.max(0, 1 - d / (margin * 0.9))
      const a = Math.min(1, 0.85 * Math.exp(-d / core) + 0.5 * Math.exp(-d / tail)) * fade * fade
      const i = (y * W + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  haloTexture = new THREE.CanvasTexture(c)
  haloTexture.colorSpace = THREE.SRGBColorSpace
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
  powered = true,
  showCar = true,
  ...props
}) {
  const model = product.model
  const hasPhoto = Boolean(model.poster)
  const poster = usePoster(model)
  const innerH = INNER_H
  const innerW = hasPhoto ? INNER_H * model.posterAspect : INNER_W
  const frameW = innerW + BORDER * 2
  const photoMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      toneMapped: false,
      emissive: '#ffffff',
      roughness: 0.55,
      metalness: 0,
      vertexColors: true,
    })
    mat.onBeforeCompile = shadeEmissiveByVertexColor
    return mat
  }, [])
  // Banda de rodadura: misma foto y mismo brillo que el póster, sin sombreado de costados
  const treadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        toneMapped: false,
        emissive: '#ffffff',
        roughness: 0.75,
        metalness: 0,
      }),
    [],
  )
  const sideMat = useMemo(() => {
    const tex = sidewallTexture(model.tires ?? '#f2c40c')
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.28,
      roughness: 0.7,
      metalness: 0.1,
    })
  }, [model])
  const emptyMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => () => emptyMat.dispose(), [emptyMat])
  const cutoutMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        transparent: true,
        alphaTest: 0.02,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => cutoutMat.dispose(), [cutoutMat])
  const posterMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  // Silueta del auto en negro (el color negro multiplica la textura; queda solo su forma)
  const silhouetteMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#050505',
        transparent: true,
        alphaTest: 0.02,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(() => () => silhouetteMat.dispose(), [silhouetteMat])
  useEffect(() => () => posterMat.dispose(), [posterMat])
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
      treadMat.dispose()
      sideMat.dispose()
    },
    [ledMat, photoMat, treadMat, sideMat],
  )
  const borderColor = useMemo(() => new THREE.Color(model.led.border ?? '#000000'), [model])

  useFrame(({ clock, pointer }, dt) => {
    // Encendido al entrar: la luz cálida se prende con un destello en el instante en
    // que el cuadro cae en su lugar, y luego se asienta en su brillo normal
    // `powered` lo da la pared cuando el cuadro realmente cae: la cuenta arranca ahí
    if (!powered) start.current = null
    else if (start.current === null) start.current = clock.elapsedTime
    const t = powered ? clock.elapsedTime - start.current - introDelay : -1
    const target = ledOn ? (hovered ? 1.3 : 1) : 0
    if (t < 0) level.current = 0
    else if (t < 0.07 && ledOn) level.current = 1.3
    else level.current = THREE.MathUtils.damp(level.current, target, 3.5, dt)
    const k = level.current

    ledMat.color.copy(borderColor).multiplyScalar(0.25 + k * 2.6)
    if (haloMat.current) haloMat.current.opacity = model.led.haloStrength * Math.min(k, 1.3)
    if (ledLight.current) ledLight.current.intensity = k * 1.1
    // La foto "se enciende" con el LED; al pasar el cursor brilla un poco más
    const glow = 0.3 + Math.min(k, 1.12) * 0.7
    // Casi todo el color viene de la foto; la luz solo sombrea los costados del relieve
    photoMat.emissiveIntensity = glow * 0.92
    photoMat.color.setScalar(glow * 0.22)
    emptyMat.color.setScalar(glow * 0.95)
    cutoutMat.color.setScalar(glow * 0.95)
    posterMat.color.setScalar(glow * 0.95)
    treadMat.emissiveIntensity = glow * 0.92
    treadMat.color.setScalar(glow * 0.22)
    if (glossMat.current) {
      gloss.offset.x = THREE.MathUtils.damp(gloss.offset.x, -pointer.x * 0.35 + 0.1, 3, dt)
      glossMat.current.opacity = THREE.MathUtils.damp(
        glossMat.current.opacity,
        hovered ? 0.06 : 0.022,
        4,
        dt,
      )
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
          <planeGeometry args={[frameW * HALO_SCALE, FRAME_H * HALO_SCALE]} />
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
        <PhotoPoster
          src={model.poster}
          srcSmall={model.posterSmall}
          relief={model.relief}
          width={innerW}
          height={innerH}
          material={photoMat}
          wheels={model.wheels}
          treadMat={treadMat}
          sideMat={sideMat}
          emptySrc={model.posterEmpty}
          shadowSrc={model.shadow}
          cutoutSrc={SMALL_SCREEN ? model.cutout : model.cutout4k}
          cutoutMat={cutoutMat}
          posterMat={posterMat}
          silhouetteMat={silhouetteMat}
          emptyMat={emptyMat}
          showCar={showCar}
        />
      ) : (
        <mesh position={[0, 0, 0.002]} receiveShadow>
          <planeGeometry args={[innerW, innerH]} />
          <meshStandardMaterial map={poster} roughness={0.85} />
        </mesh>
      )}

      {/* Línea LED interior (la foto real ya la trae) */}
      {!hasPhoto && model.led.border && (
        <group position={[0, 0, 0.012]}>
          {leds.map(([w, h, x, y], i) => (
            <mesh key={i} position={[x, y, 0]} material={ledMat}>
              <boxGeometry args={[w, h, 0.012]} />
            </mesh>
          ))}
          <pointLight
            ref={ledLight}
            position={[0, -0.4, 2.2]}
            color={model.led.border}
            distance={4}
            decay={2}
          />
        </group>
      )}

      {/* Auto 3D procedural: solo para modelos sin foto */}
      {!hasPhoto && (
        <group ref={carRig} position={[0, CAR_Y, MOUNTED.z]} rotation={[MOUNTED.tilt, 0, 0]}>
          <group ref={carSpin}>
            <group scale={CAR_SCALE} position={[0, 0, -CAR_CENTER_Z * UNIT * CAR_SCALE]}>
              <LegoF1Car
                model={model}
                spinWheels={hovered || open}
                steer={steer}
                drsOpen={drsOpen}
              />
            </group>
          </group>
        </group>
      )}
    </group>
  )
}
