import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { LedFrame, FRAME_H, INNER_H, RELIEF_DEPTH } from './LedFrame.jsx'
import { LOW_POWER } from './Intro.jsx'
import { useWallTexture } from './GalleryWall.jsx'
import { RaceScene, LegoExplosion, RACE, flashAt } from './GridRace.jsx'

// Sección del cuadro panorámico "Lights Out Legends Live" (12 autos).
// Al llegar con el scroll corre la carrera (GridRace.jsx): los 12 autos LEGO a tamaño real
// pasan rozando la cámara, explota una nube de piezas LEGO y aparece el cuadro, colgado en
// la pared negra con su luz LED encendida, tal como es en la realidad.
// Con el cursor la vista se corre un poco de lado para que se note el relieve de los autos.
// Tocar o pasar el cursor por un auto muestra su equipo.

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// ?raceT=2.5 congela la carrera en ese segundo (para revisar un momento exacto)
const FROZEN_T =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('raceT')
    ? Number(new URLSearchParams(window.location.search).get('raceT'))
    : null
const SMALL = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
const BORDER = 0.07

// Zonas táctiles sobre cada auto (invisibles)
function CarHotspots({ cars, innerW, onActive }) {
  const colW = innerW * 0.075
  const colH = INNER_H * 0.62
  const y = -INNER_H / 2 + colH / 2
  return (
    <group>
      {cars.map((c, i) => (
        <mesh
          key={i}
          position={[(c.x - 0.5) * innerW, y, RELIEF_DEPTH + 0.02]}
          onPointerOver={(e) => {
            e.stopPropagation()
            onActive(i)
          }}
          onClick={(e) => {
            e.stopPropagation()
            onActive(i)
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
  const look = useRef({ x: 0 })
  const first = useRef(true)
  useFrame(({ pointer }, dt) => {
    if (camera.fov !== 30) {
      camera.fov = 30
      camera.updateProjectionMatrix()
    }
    // al aparecer (bajo el destello) la cámara salta directo a su lugar
    if (first.current) dt = 10
    first.current = false
    const aspect = size.width / size.height
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const totalH = FRAME_H + 0.9
    const distH = totalH / 2 / Math.tan(fov / 2)
    const distW = (frameW + 0.9) / 2 / Math.tan(fov / 2) / aspect
    const portrait = aspect < 1
    const dist = portrait ? distH : Math.max(distW, distH)
    const visW = 2 * dist * Math.tan(fov / 2) * aspect
    const maxPan = Math.max(0, (frameW + 0.5 - visW) / 2)
    const x = panRef.current * maxPan
    // con el cursor la cámara se corre apenas de lado: se nota el relieve de los autos
    const peek = LOW_POWER ? 0 : pointer.x * 0.9
    look.current.x = THREE.MathUtils.damp(look.current.x, x, 6, dt)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x + peek, 3, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 6, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 4, dt)
    camera.lookAt(look.current.x, 0, 0)
  })
  return null
}

// Reloj de la carrera: avanza mientras corre; bajo el destello pasa de la pista al cuadro
function Sequence({ clock, phase, setPhase, flashEl, done, setDone }) {
  useFrame((_, dt) => {
    if (FROZEN_T !== null) clock.current = FROZEN_T
    else if (phase !== 'idle' && clock.current < RACE.end + 1) clock.current += Math.min(dt, 0.1)
    if (phase === 'race' && clock.current >= RACE.swap) setPhase('frame')
    if (!done && clock.current >= RACE.end) setDone(true)
    if (flashEl.current) flashEl.current.style.opacity = String(flashAt(clock.current))
  })
  return null
}

function Scene({ product, onActive, panRef }) {
  const wall = useWallTexture()
  const model = product.model
  const innerW = INNER_H * model.posterAspect
  const frameW = innerW + BORDER * 2
  // la luz del cuadro queda siempre encendida
  const light = useMemo(() => ({ current: 1 }), [])
  return (
    <>
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial color="#0b0b0c" map={wall} toneMapped={false} />
      </mesh>
      <Suspense fallback={null}>
        <LedFrame product={product} lightRef={light} powered />
        <CarHotspots cars={model.cars} innerW={innerW} onActive={onActive} />
      </Suspense>
      <Rig frameW={frameW} panRef={panRef} />
    </>
  )
}

export function GridShowcase({ product, onOpen, paused = false }) {
  const wrap = useRef()
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState(null)
  // idle: esperando el scroll · race: carrera y explosión · frame: el cuadro
  const initial =
    FROZEN_T !== null ? (FROZEN_T >= RACE.swap ? 'frame' : 'race') : REDUCED_MOTION ? 'frame' : 'idle'
  const [phase, setPhase] = useState(initial)
  const clock = useRef(initial === 'frame' && FROZEN_T === null ? RACE.end + 1 : -1)
  const flashEl = useRef()
  const [done, setDone] = useState(false)
  const panRef = useRef(0)
  const drag = useRef(null)
  const maxDpr =
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, SMALL ? 3 : LOW_POWER ? 2 : 2.5)
      : 1
  const [dpr, setDpr] = useState(maxDpr)

  // Solo dibuja mientras la sección está en pantalla
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        // la carrera arranca cuando se ve casi toda la sección
        if (e.intersectionRatio > 0.55)
          setPhase((p) => {
            if (p !== 'idle') return p
            clock.current = 0
            return 'race'
          })
      },
      { threshold: [0, 0.55] },
    )
    io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  const cars = product.model.cars
  const car = active != null ? cars[active] : null
  const framed = phase === 'frame'

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
      onPointerLeave={() => setActive(null)}
    >
      <Canvas
        frameloop={visible && !paused ? 'always' : 'never'}
        dpr={dpr}
        camera={{ position: [0, 0, 16], fov: 30 }}
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
        <Sequence
          clock={clock}
          phase={phase}
          setPhase={setPhase}
          flashEl={flashEl}
          done={done}
          setDone={setDone}
        />
        {phase === 'frame' ? (
          <Scene product={product} onActive={setActive} panRef={panRef} />
        ) : (
          <RaceScene clock={clock} />
        )}
        <LegoExplosion clock={clock} />
        <Environment resolution={128}>
          <Lightformer intensity={1.6} position={[0, 4, 5]} scale={[12, 2, 1]} />
        </Environment>
      </Canvas>

      {/* Destello de la explosión */}
      <div
        ref={flashEl}
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0,
          background:
            'radial-gradient(ellipse at 50% 55%, #fffaf0 0%, #ffe3b0 35%, rgba(255,190,110,0.85) 70%, rgba(40,20,5,0.9) 100%)',
        }}
      />

      {!framed && (
        <button
          onClick={() => {
            clock.current = Math.max(clock.current, RACE.boom - 0.05)
            setPhase('race')
          }}
          className="glass absolute right-5 top-3 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-dim transition hover:text-chalk md:right-10"
        >
          Saltar
        </button>
      )}
      {framed && done && !REDUCED_MOTION && (
        <button
          onClick={() => {
            clock.current = 0
            setActive(null)
            setDone(false)
            setPhase('race')
          }}
          className="glass absolute bottom-3 left-5 rounded-full px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-dim transition hover:text-chalk md:left-10"
        >
          Ver la carrera
        </button>
      )}

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
        className={`btn-gold absolute bottom-3 right-5 rounded-full px-5 py-3 text-sm font-semibold transition-opacity duration-500 md:right-10 ${
          framed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        Ver cuadro
      </button>
      {framed && (
        <p className="pointer-events-none absolute left-5 top-2 font-mono text-[11px] uppercase tracking-widest text-dim md:hidden">
          Desliza para ver los 12 autos
        </p>
      )}
    </div>
  )
}
