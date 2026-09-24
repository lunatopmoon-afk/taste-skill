import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { LedFrame } from './LedFrame.jsx'
import { useWallTexture } from './GalleryWall.jsx'

// Con el auto fuera del cuadro, las ruedas delanteras siguen al cursor.
function SteeringFrame(props) {
  const [steer, setSteer] = useState(0)
  const last = useRef(0)
  useFrame(({ pointer }) => {
    const next = props.open ? Math.round(-pointer.x * 0.45 * 20) / 20 : 0
    if (next !== last.current) {
      last.current = next
      setSteer(next)
    }
  })
  return <LedFrame {...props} steer={steer} />
}

// Gira el cuadro para verlo de lado, como en la foto lateral del producto.
function Turntable({ angle, children }) {
  const ref = useRef()
  useFrame((_, dt) => {
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, angle, 3, dt)
  })
  return <group ref={ref}>{children}</group>
}

// Visor individual del cuadro: girar, vista lateral, LED (y sacar el auto / DRS en modelos 3D).
export function FrameViewer({
  product,
  finish,
  open,
  ledOn,
  drsOpen,
  sideView,
  paused = false,
  onToggleOpen,
}) {
  const wall = useWallTexture()
  return (
    <Canvas
      shadows
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 3]}
      camera={{ position: [0, 0, 7.6], fov: 38 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#060607']} />
      <ambientLight intensity={ledOn ? 0.2 : 0.35} />
      <directionalLight
        position={[-3, 6, 7]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <Suspense fallback={null}>
        {/* La pared gira con el cuadro: es como caminar hacia un lado */}
        <Turntable angle={sideView ? 0.45 : 0}>
          <mesh position={[0, 0, -0.06]} receiveShadow>
            <planeGeometry args={[30, 20]} />
            <meshBasicMaterial color="#0b0b0c" map={wall} toneMapped={false} />
          </mesh>
          <group
            onDoubleClick={(e) => {
              e.stopPropagation()
              onToggleOpen()
            }}
          >
            <SteeringFrame
              product={product}
              finish={finish}
              open={open}
              hovered={open}
              ledOn={ledOn}
              drsOpen={drsOpen}
            />
          </group>
        </Turntable>
      </Suspense>
      {/* Solo se gira de izquierda a derecha, en un rango corto: sin subir, bajar, acercar
          ni alejar, y sin llegar a ver el borde de la pared */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        minAzimuthAngle={-0.45}
        maxAzimuthAngle={0.45}
        target={[0, 0, 0.3]}
      />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 5, 3]} scale={[8, 2, 1]} />
        <Lightformer
          intensity={0.9}
          position={[-5, 1, 2]}
          rotation-y={Math.PI / 3}
          scale={[3, 6, 1]}
        />
        <Lightformer
          intensity={0.9}
          position={[5, 1, 2]}
          rotation-y={-Math.PI / 3}
          scale={[3, 6, 1]}
        />
      </Environment>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={1.1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
