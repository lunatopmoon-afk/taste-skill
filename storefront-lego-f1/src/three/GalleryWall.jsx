import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { LedFrame, FRAME_W, FRAME_H } from './LedFrame.jsx'

// Pared de la galería: los cuadros cuelgan sobre una pared oscura texturizada.
// Al entrar, los LED se encienden uno por uno con parpadeo de neón.
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

function HangingFrame({ product, index, total, onSelect, onHover }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const x = (index - (total - 1) / 2) * SPACING

  useFrame(({ pointer }, dt) => {
    const g = ref.current
    // Inclinación suave para que se note el relieve del LEGO, sin perder la fila
    const tx = hovered ? -pointer.y * 0.14 : 0
    const ty = hovered ? pointer.x * 0.2 : 0
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 4, dt)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 4, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, hovered ? 0.4 : 0, 4, dt)
  })

  return (
    <group position={[x, 0, 0]}>
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
        <LedFrame product={product} hovered={hovered} introDelay={0.6 + index * 0.45} />
      </group>
    </group>
  )
}

function CameraRig({ total, active }) {
  const { camera, size } = useThree()
  useFrame(({ pointer }, dt) => {
    const aspect = size.width / size.height
    const carousel = aspect < 1.05
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const fitW = carousel ? SPACING * 1.02 : total * SPACING + 0.4
    const distW = fitW / 2 / Math.tan(fov / 2) / aspect
    const distH = (FRAME_H + 2.4) / 2 / Math.tan(fov / 2)
    const dist = Math.max(distW, distH)
    const focusX = carousel ? (active - (total - 1) / 2) * SPACING : 0

    // Cámara de frente y a la altura de los cuadros: todos quedan derechos y en línea
    camera.position.x = THREE.MathUtils.damp(camera.position.x, focusX + pointer.x * 0.12, 2.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -0.95 + pointer.y * 0.08, 2.5, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 2.5, dt)
    camera.lookAt(camera.position.x, camera.position.y, 0)
  })
  return null
}

// paused: el visor de producto está abierto encima, así que la pared deja de dibujar
export function GalleryWall({ products, active, onActiveChange, onSelect, paused = false }) {
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
      <color attach="background" args={['#0b0b0c']} />
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
        <planeGeometry args={[70, 24]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.95} bumpMap={wall} bumpScale={1.4} />
      </mesh>

      <Suspense fallback={null}>
        {products.map((p, i) => (
          <HangingFrame
            key={p.id}
            product={p}
            index={i}
            total={products.length}
            onHover={onActiveChange}
            onSelect={onSelect}
          />
        ))}
      </Suspense>

      <CameraRig total={products.length} active={active} />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer intensity={0.7} position={[-6, 0, 3]} rotation-y={Math.PI / 3} scale={[4, 6, 1]} />
        <Lightformer intensity={0.7} position={[6, 0, 3]} rotation-y={-Math.PI / 3} scale={[4, 6, 1]} />
      </Environment>

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={1.1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
