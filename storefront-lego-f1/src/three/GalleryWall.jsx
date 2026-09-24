import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { ShadowBox, FRAME_W } from './ShadowBox.jsx'

// Pared de galería: los cuadros colgados, con luz de museo.
// Pasar el cursor inclina el cuadro hacia ti y hace girar las ruedas; clic abre el visor.

const GAP = 1.1
const SPACING = FRAME_W + GAP

function HangingFrame({ product, index, total, onSelect, onHover, isActive }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const target = useMemo(() => new THREE.Object3D(), [])
  const x = (index - (total - 1) / 2) * SPACING

  useFrame(({ pointer }, dt) => {
    const g = ref.current
    const lift = hovered || isActive ? 1 : 0
    // Los cuadros se orientan suavemente hacia el cursor; el enfocado se acerca.
    const tx = hovered ? -pointer.y * 0.28 : 0
    const ty = hovered ? pointer.x * 0.35 : 0
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 4, dt)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 4, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, lift * 0.35, 4, dt)
    // Balanceo muy leve, como si colgara de un clavo
    g.rotation.z = Math.sin(performance.now() / 1400 + index * 1.7) * 0.004
  })

  return (
    <group position={[x, 0.15, 0]}>
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
        <ShadowBox product={product} finish={product.variants[0]?.title} hovered={hovered} />
      </group>
      {/* Luz de museo sobre cada cuadro */}
      <primitive object={target} position={[0, -0.2, 0]} />
      <spotLight
        position={[0, 3.6, 2.4]}
        angle={0.55}
        penumbra={0.8}
        intensity={hovered ? 42 : 26}
        distance={9}
        color="#fff4e6"
        target={target}
      />
    </group>
  )
}

function CameraRig({ total, active }) {
  const { camera, size } = useThree()
  useFrame(({ pointer }, dt) => {
    const aspect = size.width / size.height
    const rowWidth = total * SPACING
    // En pantallas anchas se ve la fila completa; en móvil, el cuadro activo.
    const carousel = aspect < 1.05
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const fitW = carousel ? SPACING * 1.05 : rowWidth + 0.6
    const distW = fitW / 2 / Math.tan(fov / 2) / aspect
    const distH = 6.4 / 2 / Math.tan(fov / 2)
    const dist = Math.max(distW, distH)
    const focusX = carousel ? (active - (total - 1) / 2) * SPACING : 0

    camera.position.x = THREE.MathUtils.damp(camera.position.x, focusX + pointer.x * 0.4, 2.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -0.2 + pointer.y * 0.25, 2.5, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 2.5, dt)
    camera.lookAt(focusX, -0.75, 0)
  })
  return null
}

export function GalleryWall({ products, active, onActiveChange, onSelect }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 11], fov: 35 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <color attach="background" args={['#0e0f11']} />
      <fog attach="fog" args={['#0e0f11', 12, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3, 5, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />

      {/* Pared */}
      <mesh position={[0, 0, -0.06]} receiveShadow>
        <planeGeometry args={[60, 20]} />
        <meshStandardMaterial color="#1b1c1f" roughness={0.95} />
      </mesh>

      <Suspense fallback={null}>
        {products.map((p, i) => (
          <HangingFrame
            key={p.id}
            product={p}
            index={i}
            total={products.length}
            isActive={i === active}
            onHover={onActiveChange}
            onSelect={onSelect}
          />
        ))}
      </Suspense>

      <CameraRig total={products.length} active={active} />

      {/* Reflejos locales (sin descargar HDRIs externos) */}
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer intensity={0.8} position={[-6, 0, 3]} rotation-y={Math.PI / 3} scale={[4, 6, 1]} />
        <Lightformer intensity={0.8} position={[6, 0, 3]} rotation-y={-Math.PI / 3} scale={[4, 6, 1]} />
      </Environment>
    </Canvas>
  )
}
