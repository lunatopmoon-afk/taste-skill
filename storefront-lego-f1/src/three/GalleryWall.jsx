import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { LedFrame, FRAME_W, FRAME_H, INNER_H } from './LedFrame.jsx'
import { IntroCars, INTRO, LOW_POWER } from './Intro.jsx'
import { useTexture } from '@react-three/drei'
import { MODELS } from '../lib/models.js'

// Precarga de todas las imágenes de la entrada y los cuadros, en cuanto carga la página
const SMALL = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
Object.values(MODELS).forEach((m) =>
  [
    SMALL ? m.posterSmall : m.poster,
    m.relief,
    m.posterEmpty,
    m.shadow,
    SMALL ? m.cutout : m.cutout4k,
    m.cutout,
    m.realCar,
  ]
    .filter(Boolean)
    .forEach((url) => useTexture.preload(url)),
)

// Pared de la galería. Al entrar corre la secuencia de Intro.jsx: autos reales que caen,
// estallan en piezas LEGO, se rearman, los cuadros llegan desde el fondo, el LEGO encaja
// y se prenden las tres luces a la vez. Luego, pasar el cursor gira el cuadro a los lados.

const GAP = 1.3
const SPACING = FRAME_W + GAP

// Textura de pared tipo cuero/estuco, como en las fotos de producto
export function useWallTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 26000; i++) {
      const v = 90 + Math.random() * 80
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`
      const r = Math.random() * 2.4 + 0.4
      ctx.beginPath()
      ctx.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2)
      ctx.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 4)
    return t
  }, [])
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const span = (t, a, b) => clamp01((t - a) / (b - a))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Separación entre cuadros: en pantallas verticales (celular) van más juntos para que quepan los tres
function spacingFor(aspect) {
  return FRAME_W + (aspect < 1 ? 0.3 : GAP)
}

// Un solo reloj para toda la entrada (ver Intro.jsx). Con "reducir movimiento" se salta.
// Para revisar la entrada cuadro a cuadro: ?introT=4.2 congela el reloj en ese segundo
const FROZEN_T =
  typeof window !== 'undefined'
    ? parseFloat(new URLSearchParams(window.location.search).get('introT'))
    : NaN

function Timeline({ timeline, onDone }) {
  const fired = useRef(false)
  useFrame((_, rawDt) => {
    const tl = timeline.current
    if (!Number.isNaN(FROZEN_T)) {
      tl.t = FROZEN_T
      return
    }
    // tiempo real: aunque un cuadro tarde, la animación sigue a su velocidad (sin cámara lenta
    // ni tirones). Solo se limitan pausas largas, como la subida inicial de texturas 4K.
    tl.t += Math.min(rawDt, 0.1)
    if (!fired.current && tl.t >= INTRO.done) {
      fired.current = true
      onDone?.()
    }
  })
  return null
}

function HangingFrame({
  product,
  index,
  x,
  onSelect,
  onHover,
  lightsOn,
  light,
  timeline,
  interactive,
}) {
  const arrive = useRef()
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const [showCar, setShowCar] = useState(REDUCED_MOTION)

  useFrame(({ pointer }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const t = timeline.current.t
    // Los cuadros llegan desde el fondo oscuro, uno tras otro
    const p = easeOutCubic(span(t, INTRO.framesIn + index * 0.12, INTRO.framesSet))
    const a = arrive.current
    a.visible = p > 0
    a.position.z = THREE.MathUtils.lerp(-26, 0, p)
    a.rotation.y = (1 - p) * 0.5 * (index - 1)
    if (!showCar && t >= INTRO.integrated) setShowCar(true)

    const g = ref.current
    // Al pasar el cursor el cuadro gira solo de izquierda a derecha, para ver las llantas
    const on = hovered && interactive
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, on ? pointer.x * 0.28 : 0, 4, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, on ? 0.4 : 0, 4, dt)
  })

  return (
    <group position={[x, 0, 0]}>
      <group ref={arrive}>
        <group
          ref={ref}
          onPointerOver={(e) => {
            if (!interactive) return
            e.stopPropagation()
            setHovered(true)
            onHover(index)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            if (!interactive) return
            e.stopPropagation()
            onSelect(product)
          }}
        >
          <LedFrame
            product={product}
            hovered={hovered && interactive && !LOW_POWER}
            powered={lightsOn}
            lightRef={light}
            showCar={showCar}
            introDelay={0}
          />
        </group>
      </group>
    </group>
  )
}

// Distancia y altura de la cámara para que se vean los tres cuadros completos
function cameraLayout(size, fovDeg, total, spacing) {
  const aspect = size.width / size.height
  const portrait = aspect < 1
  const fov = THREE.MathUtils.degToRad(fovDeg)
  const fitW = total * spacing + (portrait ? 0.5 : 0.4)
  const distW = fitW / 2 / Math.tan(fov / 2) / aspect
  const distH = (FRAME_H + 2.4) / 2 / Math.tan(fov / 2)
  const dist = Math.max(distW, distH)
  // En vertical el texto ocupa la parte de abajo: los cuadros suben al tercio superior
  const visibleH = 2 * dist * Math.tan(fov / 2)
  const baseY = portrait ? -visibleH * 0.16 : -0.95
  return { dist, baseY }
}

function CameraRig({ total, spacing, timeline }) {
  const { camera, size, scene } = useThree()
  useFrame(({ pointer }, dt) => {
    const { dist, baseY } = cameraLayout(size, camera.fov, total, spacing)

    // Entrada: la cámara se acerca despacio durante toda la secuencia y tiembla en el estallido
    const t = timeline.current.t
    const push = 1 + 0.22 * (1 - easeOutCubic(span(t, 0, INTRO.framesSet)))
    // mientras los autos se rompen, la cámara se mete hacia ellos (como en el video)
    const dive =
      1 -
      0.12 *
        easeInOutCubic(span(t, INTRO.burst, INTRO.burst + INTRO.dissolve)) *
        (1 - easeInOutCubic(span(t, INTRO.reform, INTRO.reformed)))
    const hit = t > INTRO.burst ? Math.exp(-(t - INTRO.burst) * 7) * 0.5 : 0
    const land = t > INTRO.integrated ? Math.exp(-(t - INTRO.integrated) * 12) : 0
    const shake = (hit * 0.12 + land * 0.04) * Math.sin(t * 70)

    // Cámara de frente y a la altura de los cuadros: todos quedan derechos y en línea
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.12 + shake, 2.5, dt)
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      baseY + pointer.y * 0.08 + shake * 0.6,
      2.5,
      dt,
    )
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist * push * dive, 3, dt)
    camera.lookAt(camera.position.x, camera.position.y, 0)
    // La niebla se mide desde la cámara: lo que está detrás de la pared se funde con el negro
    if (scene.fog) {
      scene.fog.near = dist * 1.05
      scene.fog.far = dist * 1.9
    }
  })
  return null
}

// La pared negra aparece cuando los cuadros ya llegaron (antes, los cuadros vienen desde atrás)
function Wall({ timeline }) {
  const wall = useWallTexture()
  const ref = useRef()
  useFrame(() => {
    ref.current.visible = timeline.current.t >= INTRO.framesSet
  })
  return (
    <mesh ref={ref} position={[0, 0, -0.06]}>
      <planeGeometry args={[70, 40]} />
      <meshBasicMaterial color="#0b0b0c" map={wall} toneMapped={false} />
    </mesh>
  )
}

function Frames({ products, onActiveChange, onSelect, onIntroDone, skip }) {
  const size = useThree((state) => state.size)
  const fov = useThree((state) => state.camera.fov)
  const spacing = spacingFor(size.width / size.height)
  const layout = cameraLayout(size, fov, products.length, spacing)
  const timeline = useRef({ t: REDUCED_MOTION ? INTRO.integrated : 0 })
  const [lightsOn, setLightsOn] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const xs = products.map((_, i) => (i - (products.length - 1) / 2) * spacing)
  const sizes = products.map((p) => [INNER_H * (p.model.posterAspect ?? 0.6), INNER_H])

  // Las tres luces se prenden juntas cuando los tres LEGO ya encajaron en su cuadro:
  // una sola subida suave de medio segundo, calculada del reloj de la entrada (no oscila)
  const light = useMemo(() => ({ current: 0 }), [])
  useFrame(() => {
    const p = Math.min(1, Math.max(0, (timeline.current.t - INTRO.lights) / 0.5))
    light.current = p * p * (3 - 2 * p)
    if (skip && timeline.current.t < INTRO.integrated) timeline.current.t = INTRO.integrated
    if (!lightsOn && timeline.current.t >= INTRO.lights) setLightsOn(true)
  })

  return (
    <>
      <Wall timeline={timeline} />
      <Suspense fallback={null}>
        {products.map((p, i) => (
          <HangingFrame
            key={p.id}
            product={p}
            index={i}
            x={xs[i]}
            onHover={onActiveChange}
            onSelect={onSelect}
            lightsOn={lightsOn}
            light={light}
            timeline={timeline}
            interactive={interactive}
          />
        ))}
        {!REDUCED_MOTION && (
          <IntroCars
            products={products}
            xs={xs}
            sizes={sizes}
            layout={layout}
            timeline={timeline}
          />
        )}
        <Timeline
          timeline={timeline}
          onDone={() => {
            setInteractive(true)
            onIntroDone?.()
          }}
        />
      </Suspense>
      <CameraRig total={products.length} spacing={spacing} timeline={timeline} />
    </>
  )
}

// paused: el visor de producto está abierto encima, así que la pared deja de dibujar
export function GalleryWall({
  products,
  onActiveChange,
  onSelect,
  onIntroDone,
  skipIntro = false,
  paused = false,
}) {
  return (
    <Canvas
      shadows={!LOW_POWER}
      frameloop={paused ? 'never' : 'always'}
      dpr={LOW_POWER ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, -0.95, 24], fov: 22 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <color attach="background" args={['#060607']} />
      {/* Niebla negra: lo que está lejos se funde con la oscuridad (los cuadros "emergen") */}
      <fog attach="fog" args={['#060607', 30, 55]} />
      <ambientLight intensity={0.18} />
      {/* Luz principal desde arriba a la izquierda: proyecta la sombra del auto sobre el póster */}
      <directionalLight
        position={[-3, 6, 7]}
        intensity={1.6}
        castShadow
        shadow-mapSize={LOW_POWER ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      <Frames
        products={products}
        onActiveChange={onActiveChange}
        onSelect={onSelect}
        onIntroDone={onIntroDone}
        skip={skipIntro}
      />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer
          intensity={0.7}
          position={[-6, 0, 3]}
          rotation-y={Math.PI / 3}
          scale={[4, 6, 1]}
        />
        <Lightformer
          intensity={0.7}
          position={[6, 0, 3]}
          rotation-y={-Math.PI / 3}
          scale={[4, 6, 1]}
        />
      </Environment>

      {/* En teléfono/tablet sin bloom: el LED queda justo en el umbral y parpadeaba */}
      {!LOW_POWER && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={1} intensity={1.1} radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
