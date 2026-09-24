import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ShadowBox } from './ShadowBox.jsx'

// Visor individual: se puede girar el cuadro, abrir la vitrina y sacar el auto.
export function FrameViewer({ product, finish, open, onToggleOpen }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.2, 0.6, 7.2], fov: 38 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#101113']} />
      <ambientLight intensity={0.3} />
      <spotLight
        position={[2, 5, 5]}
        angle={0.6}
        penumbra={0.7}
        intensity={70}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <Suspense fallback={null}>
        <group
          position={[0, 0.2, 0]}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onToggleOpen()
          }}
        >
          <ShadowBox product={product} finish={finish} open={open} hovered />
        </group>
        <ContactShadows position={[0, -2.1, 0.8]} opacity={0.5} scale={9} blur={2.6} far={3} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4}
        maxDistance={10}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.62}
        minAzimuthAngle={-Math.PI * 0.45}
        maxAzimuthAngle={Math.PI * 0.45}
        target={[0, 0.2, 0.6]}
      />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 5, 3]} scale={[8, 2, 1]} />
        <Lightformer intensity={1} position={[-5, 1, 2]} rotation-y={Math.PI / 3} scale={[3, 6, 1]} />
        <Lightformer intensity={1} position={[5, 1, 2]} rotation-y={-Math.PI / 3} scale={[3, 6, 1]} />
      </Environment>
    </Canvas>
  )
}
