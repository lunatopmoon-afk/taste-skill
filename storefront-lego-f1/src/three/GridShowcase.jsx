import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import { LedFrame, FRAME_H, INNER_H, RELIEF_DEPTH } from "./LedFrame.jsx";
import { LOW_POWER } from "./Intro.jsx";
import { useWallTexture } from "./GalleryWall.jsx";

// Sección del cuadro panorámico "Lights Out Legends Live" (12 autos): solo el cuadro,
// colgado en la pared negra con su luz LED encendida, tal como es en la realidad.
// Se ve completo en cualquier pantalla. Con el cursor la vista se corre un poco de lado para
// que se note el relieve de los autos. Tocar o pasar el cursor por un auto muestra su equipo.

const SMALL =
  typeof window !== "undefined" &&
  Math.min(window.innerWidth, window.innerHeight) < 700;
const BORDER = 0.07;

// Zonas táctiles sobre cada auto (invisibles)
function CarHotspots({ cars, innerW, onActive }) {
  const colW = innerW * 0.075;
  const colH = INNER_H * 0.62;
  const y = -INNER_H / 2 + colH / 2;
  return (
    <group>
      {cars.map((c, i) => (
        <mesh
          key={i}
          position={[(c.x - 0.5) * innerW, y, RELIEF_DEPTH + 0.02]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onActive(i);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onActive(i);
          }}
        >
          <planeGeometry args={[colW, colH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Cámara: el cuadro se ve completo en cualquier pantalla (también en celular o iPad en
// vertical), sin tener que deslizar
function Rig({ frameW }) {
  const { camera, size } = useThree();
  useFrame(({ pointer }, dt) => {
    const aspect = size.width / size.height;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const distH = (FRAME_H + 0.7) / 2 / Math.tan(fov / 2);
    const distW = (frameW + 0.9) / 2 / Math.tan(fov / 2) / aspect;
    const dist = Math.max(distW, distH);
    // con el cursor la cámara se corre apenas de lado: se nota el relieve de los autos
    const peek = LOW_POWER ? 0 : pointer.x * 0.9;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, peek, 3, dt);
    camera.position.y = 0;
    camera.position.z = dist;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ product, onActive }) {
  const wall = useWallTexture();
  const model = product.model;
  const innerW = INNER_H * model.posterAspect;
  const frameW = innerW + BORDER * 2;
  // la luz del cuadro queda siempre encendida
  const light = useMemo(() => ({ current: 1 }), []);
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
      <Rig frameW={frameW} />
    </>
  );
}

export function GridShowcase({ product, onOpen, paused = false }) {
  const wrap = useRef();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(null);
  const maxDpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, SMALL ? 3 : LOW_POWER ? 2 : 2.5)
      : 1;
  const [dpr, setDpr] = useState(maxDpr);

  // Solo dibuja mientras la sección está en pantalla
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const cars = product.model.cars;
  const car = active != null ? cars[active] : null;

  return (
    <div className="relative w-full" onPointerLeave={() => setActive(null)}>
      {/* en vertical el alto sigue al ancho: el cuadro completo llena la pantalla de lado a lado */}
      <div
        ref={wrap}
        className="relative h-[62svh] min-h-[380px] w-full md:h-[78svh] portrait:aspect-[2.35/1] portrait:h-auto portrait:min-h-0 md:portrait:h-auto"
      >
        <Canvas
          frameloop={visible && !paused ? "always" : "never"}
          dpr={dpr}
          camera={{ position: [0, 0, 16], fov: 30 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          onPointerMissed={() => setActive(null)}
        >
          <PerformanceMonitor
            flipflops={2}
            onDecline={() =>
              setDpr((d) => Math.max(1.5, Math.round((d - 0.25) * 4) / 4))
            }
            onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
          />
          <color attach="background" args={["#060607"]} />
          <ambientLight intensity={0.25} />
          <Scene product={product} onActive={setActive} />
          <Environment resolution={128}>
            <Lightformer
              intensity={1.6}
              position={[0, 4, 5]}
              scale={[12, 2, 1]}
            />
          </Environment>
        </Canvas>
      </div>

      {/* Equipo del auto señalado y botón: debajo del cuadro en vertical, encima en horizontal */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 md:px-10 landscape:pointer-events-none landscape:absolute landscape:inset-x-0 landscape:bottom-3 landscape:pt-0">
        <div
          className={`glass flex items-center gap-3 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity duration-300 ${
            car ? "opacity-100" : "opacity-0"
          }`}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: car?.color }}
          />
          {car?.team ?? ""}
        </div>
        <button
          onClick={() => onOpen(product)}
          className="btn-gold pointer-events-auto shrink-0 rounded-full px-5 py-3 text-sm font-semibold"
        >
          Ver cuadro
        </button>
      </div>
    </div>
  );
}
