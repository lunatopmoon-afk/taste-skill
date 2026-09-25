import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { LedFrame, FRAME_H, INNER_H, RELIEF_DEPTH } from './LedFrame.jsx'
import { LOW_POWER } from './Intro.jsx'
import { useWallTexture } from './GalleryWall.jsx'

// Sección del cuadro panorámico "Lights Out Legends Live" (12 autos).
// Cuando entra en pantalla corre la largada de F1: se encienden 5 luces rojas una por una,
// se apagan de golpe ("lights out") y en ese instante se prende el neón blanco del cuadro.
// Tocar o pasar el cursor por un auto lo resalta y muestra su equipo.

export const START = {
  red: 0.5, // primera luz roja
  step: 0.55, // una luz cada 0.55 s
  out: 0.5 + 0.55 * 4 + 0.9, // "lights out": se apagan las 5
  neon: 0.45, // subida del neón blanco
}

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const SMALL = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const BORDER = 0.07

// Semáforo de largada: barra negra con 5 columnas de 2 luces rojas
function StartLights({ clock, y }) {
  const mats = useMemo(
    () =>
      Array.from(
        { length: 5 },
        () => new THREE.MeshBasicMaterial({ color: '#2a0405', toneMapped: false }),
      ),
    [],
  )
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  const off = useMemo(() => new THREE.Color('#2a0405'), [])
  const on = useMemo(() => new THREE.Color('#ff1a1a').multiplyScalar(2.2), [])
  useFrame(() => {
    const t = clock.current
    mats.forEach((m, i) => {
      const lit = t >= START.red + i * START.step && t < START.out
      m.color.copy(lit ? on : off)
    })
  })
  const gap = 0.62
  return (
    <group position={[0, y, 0.25]}>
      <mesh>
        <boxGeometry args={[gap * 5 + 0.3, 1.25, 0.3]} />
        <meshStandardMaterial color="#0b0b0c" roughness={0.5} metalness={0.4} />
      </mesh>
      {mats.map((m, i) =>
        [0.28, -0.28].map((dy) => (
          <mesh
            key={`${i}${dy}`}
            position={[(i - 2) * gap, dy, 0.16]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m}
          >
            <cylinderGeometry args={[0.2, 0.2, 0.04, 28]} />
          </mesh>
        )),
      )}
    </group>
  )
}

// Zonas táctiles sobre cada auto + resaltado del auto activo
function CarHotspots({ cars, innerW, active, onActive, onOpen }) {
  const colW = innerW * 0.068
  const colH = INNER_H * 0.545
  const y = -INNER_H / 2 + colH / 2
  const glow = useRef()
  useFrame((_, dt) => {
    if (!glow.current) return
    const target = active == null ? 0 : 0.16
    glow.current.material.opacity = THREE.MathUtils.damp(
      glow.current.material.opacity,
      target,
      8,
      dt,
    )
    if (active != null) glow.current.position.x = (cars[active].x - 0.5) * innerW
  })
  return (
    <group>
      <mesh ref={glow} position={[0, y, RELIEF_DEPTH + 0.01]} renderOrder={3}>
        <planeGeometry args={[colW * 1.04, colH * 1.02]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {cars.map((c, i) => (
        <mesh
          key={i}
          position={[(c.x - 0.5) * innerW, y, RELIEF_DEPTH + 0.02]}
          onPointerOver={(e) => {
            e.stopPropagation()
            onActive(i)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
          onClick={(e) => {
            e.stopPropagation()
            onActive(i)
            onOpen?.()
          }}
        >
          <planeGeometry args={[colW, colH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// Cámara: en pantalla ancha se ve el cuadro completo; en vertical (celular) se ve grande y se
// recorre deslizando de lado (panRef, de -1 a 1)
function Rig({ frameW, panRef }) {
  const { camera, size } = useThree()
  useFrame((_, dt) => {
    const aspect = size.width / size.height
    const fov = THREE.MathUtils.degToRad(camera.fov)
    // de la base del cuadro a lo alto del semáforo, con aire arriba y abajo (botones)
    const bottom = -FRAME_H / 2 - 0.9
    const top = FRAME_H / 2 + 1.05 + 0.62 + 0.35
    const totalH = top - bottom
    const centerY = (top + bottom) / 2
    const distH = totalH / 2 / Math.tan(fov / 2)
    const distW = (frameW + 1.2) / 2 / Math.tan(fov / 2) / aspect
    const portrait = aspect < 1
    const dist = portrait ? distH : Math.max(distW, distH)
    const visW = 2 * dist * Math.tan(fov / 2) * aspect
    const maxPan = Math.max(0, (frameW + 0.6 - visW) / 2)
    const x = panRef.current * maxPan
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 6, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, centerY, 6, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 4, dt)
    camera.lookAt(camera.position.x, camera.position.y, 0)
  })
  return null
}

function Scene({ product, running, active, onActive, onOpen, panRef }) {
  const wall = useWallTexture()
  const model = product.model
  const innerW = INNER_H * model.posterAspect
  const frameW = innerW + BORDER * 2
  const clock = useRef(REDUCED_MOTION ? 99 : 0)
  const light = useMemo(() => ({ current: REDUCED_MOTION ? 1 : 0 }), [])
  useFrame((_, dt) => {
    if (running) clock.current += Math.min(dt, 0.1)
    const p = Math.min(1, Math.max(0, (clock.current - START.out) / START.neon))
    light.current = p * p * (3 - 2 * p)
  })
  return (
    <>
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial color="#0b0b0c" map={wall} toneMapped={false} />
      </mesh>
      <Suspense fallback={null}>
        <LedFrame product={product} lightRef={light} powered />
        <CarHotspots
          cars={model.cars}
          innerW={innerW}
          active={active}
          onActive={onActive}
          onOpen={onOpen}
        />
      </Suspense>
      <StartLights clock={clock} y={FRAME_H / 2 + 1.05} />
      <Rig frameW={frameW} panRef={panRef} />
    </>
  )
}

export function GridShowcase({ product, onOpen, paused = false }) {
  const wrap = useRef()
  const [visible, setVisible] = useState(false)
  const [started, setStarted] = useState(false)
  const [active, setActive] = useState(null)
  const panRef = useRef(0)
  const drag = useRef(null)
  const maxDpr =
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, SMALL ? 3 : LOW_POWER ? 2 : 2.5)
      : 1
  const [dpr, setDpr] = useState(maxDpr)

  // Arranca la largada cuando la sección se ve; solo dibuja mientras está en pantalla
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.intersectionRatio > 0.45) setStarted(true)
      },
      { threshold: [0, 0.45] },
    )
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  const cars = product.model.cars
  const car = active != null ? cars[active] : null

  return (
    <div
      ref={wrap}
      className="relative h-[62svh] min-h-[380px] w-full touch-pan-y md:h-[78svh]"
      // en celular: deslizar de lado para recorrer los 12 autos
      onPointerDown={(e) => (drag.current = { x: e.clientX, pan: panRef.current })}
      onPointerMove={(e) => {
        if (!drag.current) return
        const dx = (e.clientX - drag.current.x) / (wrap.current.clientWidth * 0.9)
        panRef.current = Math.max(-1, Math.min(1, drag.current.pan - dx * 2))
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <Canvas
        frameloop={visible && !paused ? 'always' : 'never'}
        dpr={dpr}
        camera={{ position: [0, 0.55, 16], fov: 30 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onPointerMissed={() => setActive(null)}
      >
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => setDpr((d) => Math.max(1.5, Math.round((d - 0.25) * 4) / 4))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        />
        <color attach="background" args={['#060607']} />
        <ambientLight intensity={0.25} />
        <Scene
          product={product}
          running={started}
          active={active}
          onActive={setActive}
          onOpen={null}
          panRef={panRef}
        />
        <Environment resolution={128}>
          <Lightformer intensity={1.6} position={[0, 4, 5]} scale={[12, 2, 1]} />
        </Environment>
      </Canvas>

      {/* Equipo del auto señalado */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div
          className={`glass flex items-center gap-3 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity duration-300 ${
            car ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="size-2.5 rounded-full" style={{ background: car?.color }} />
          {car?.team ?? ''}
        </div>
      </div>
      <button
        onClick={() => onOpen(product)}
        className="btn-gold absolute bottom-3 right-5 rounded-full px-5 py-3 text-sm font-semibold md:right-10"
      >
        Ver cuadro
      </button>
      <p className="pointer-events-none absolute left-5 top-2 font-mono text-[11px] uppercase tracking-widest text-dim md:hidden">
        Desliza para ver los 12 autos
      </p>
    </div>
  )
}
