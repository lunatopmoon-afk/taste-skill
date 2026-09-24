import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { LedFrame, FRAME_W, FRAME_H } from './LedFrame.jsx'

// Pared de la galería: los cuadros cuelgan sobre una pared oscura texturizada.
// Al entrar, los cuadros caen uno por uno, se balancean y luego se encienden sus LED.
// Pasar el cursor inclina el cuadro hacia ti, sube el LED y hace girar las ruedas.

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

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Separación entre cuadros: en pantallas verticales (celular) van más juntos para que quepan los tres
function spacingFor(aspect) {
  return FRAME_W + (aspect < 1 ? 0.3 : GAP)
}

// Caída de entrada: cada cuadro cae desde arriba, rebota al "engancharse" en el clavo
// y se balancea hasta quedar quieto. Luego se encienden sus luces.
const DROP_HEIGHT = 9
const GRAVITY = 34
const DROP_START = 0.25
const DROP_STAGGER = 0.28
const FALL_TIME = Math.sqrt((2 * DROP_HEIGHT) / GRAVITY)

function HangingFrame({ product, index, x, onSelect, onHover }) {
  const drop = useRef()
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const sim = useRef({
    y: REDUCED_MOTION ? 0 : DROP_HEIGHT,
    vy: 0,
    rz: 0,
    vrz: 0,
    t: 0,
    done: REDUCED_MOTION,
  })
  const startAt = DROP_START + index * DROP_STAGGER

  useFrame(({ pointer }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const st = sim.current
    if (!st.done) {
      st.t += dt
      if (st.t > startAt) {
        st.vy -= GRAVITY * dt
        st.y += st.vy * dt
        if (st.y <= 0) {
          const impact = -st.vy
          st.y = 0
          st.vy = impact > 1.2 ? impact * 0.22 : 0
          // el golpe lo hace balancearse, cada cuadro hacia un lado distinto
          st.vrz += impact * 0.006 * (index % 2 ? 1 : -1)
        }
      }
      // balanceo amortiguado sobre el clavo
      st.vrz += (-38 * st.rz - 2.4 * st.vrz) * dt
      st.rz += st.vrz * dt
      if (st.t > startAt + FALL_TIME + 3 && Math.abs(st.rz) < 0.0005 && st.y === 0) {
        st.done = true
        st.rz = 0
      }
    }
    drop.current.position.y = st.y
    drop.current.rotation.z = st.rz

    const g = ref.current
        // Al pasar el cursor el cuadro gira solo de izquierda a derecha, para ver las llantas
    const ty = hovered ? pointer.x * 0.28 : 0
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 4, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, hovered ? 0.4 : 0, 4, dt)
  })

  return (
    // El pivote del balanceo está arriba, donde iría el clavo
    <group position={[x, FRAME_H / 2, 0]}>
      <group ref={drop}>
        <group position={[0, -FRAME_H / 2, 0]}>
          <group
            ref={ref}
            onPointerOver={(e) => {
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
              e.stopPropagation()
              onSelect(product)
            }}
          >
            <LedFrame
              product={product}
              hovered={hovered}
              introDelay={REDUCED_MOTION ? 0.3 + index * 0.3 : startAt + FALL_TIME}
            />
          </group>
        </group>
      </group>
    </group>
  )
}

function CameraRig({ total, spacing }) {
  const { camera, size } = useThree()
  useFrame(({ pointer }, dt) => {
    const aspect = size.width / size.height
    const portrait = aspect < 1
    const fov = THREE.MathUtils.degToRad(camera.fov)
    // Siempre se ven los tres cuadros completos, también en el celular
    const fitW = total * spacing + (portrait ? 0.5 : 0.4)
    const distW = fitW / 2 / Math.tan(fov / 2) / aspect
    const distH = (FRAME_H + 2.4) / 2 / Math.tan(fov / 2)
    const dist = Math.max(distW, distH)
    // En vertical el texto ocupa la parte de abajo: los cuadros suben al tercio superior
    const visibleH = 2 * dist * Math.tan(fov / 2)
    const baseY = portrait ? -visibleH * 0.16 : -0.95

    // Cámara de frente y a la altura de los cuadros: todos quedan derechos y en línea
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.12, 2.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, baseY + pointer.y * 0.08, 2.5, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 2.5, dt)
    camera.lookAt(camera.position.x, camera.position.y, 0)
  })
  return null
}

function Frames({ products, onActiveChange, onSelect }) {
  const size = useThree((state) => state.size)
  const spacing = spacingFor(size.width / size.height)
  return (
    <>
      <Suspense fallback={null}>
        {products.map((p, i) => (
          <HangingFrame
            key={p.id}
            product={p}
            index={i}
            x={(i - (products.length - 1) / 2) * spacing}
            onHover={onActiveChange}
            onSelect={onSelect}
          />
        ))}
      </Suspense>
      <CameraRig total={products.length} spacing={spacing} />
    </>
  )
}

// paused: el visor de producto está abierto encima, así que la pared deja de dibujar
export function GalleryWall({ products, onActiveChange, onSelect, paused = false }) {
  const wall = useWallTexture()
  return (
    <Canvas
      shadows
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 2]}
      camera={{ position: [0, -0.95, 24], fov: 22 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <color attach="background" args={['#060607']} />
      <ambientLight intensity={0.18} />
      {/* Luz principal desde arriba a la izquierda: proyecta la sombra del auto sobre el póster */}
      <directionalLight
        position={[-3, 6, 7]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      <mesh position={[0, 0, -0.06]} receiveShadow>
        <planeGeometry args={[70, 40]} />
        <meshStandardMaterial color="#141416" roughness={0.95} bumpMap={wall} bumpScale={1.4} />
      </mesh>

      <Frames products={products} onActiveChange={onActiveChange} onSelect={onSelect} />

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

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={1.1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
