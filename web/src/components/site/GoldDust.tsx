import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

interface MotionState {
  x: number;
  y: number;
  scroll: number;
}

interface DustProps {
  count: number;
  motionRef: MutableRefObject<MotionState>;
}

function Dust({ count, motionRef }: DustProps) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const positions = useMemo<Float32Array>(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const m = motionRef.current;
    ref.current.rotation.y = t * 0.018 + m.x * 0.14 + m.scroll * 0.00012;
    ref.current.rotation.x = Math.sin(t * 0.05) * 0.04 + m.y * 0.09;
    ref.current.position.y = Math.sin(t * 0.14) * 0.22;
    if (matRef.current) {
      matRef.current.opacity = 0.6 + Math.sin(t * 0.7) * 0.14;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.032}
        color="#CFA85A"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface RingProps {
  radius: number;
  tilt: number;
  speed: number;
  opacity: number;
  z: number;
  motionRef: MutableRefObject<MotionState>;
}

function RitualRing({ radius, tilt, speed, opacity, z, motionRef }: RingProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const m = motionRef.current;
    ref.current.rotation.x = tilt + Math.sin(t * speed * 0.6) * 0.12 + m.y * 0.06;
    ref.current.rotation.y = t * speed + m.x * 0.1;
  });

  return (
    <mesh ref={ref} position={[0, 0, z]}>
      <torusGeometry args={[radius, 0.0045, 12, 160]} />
      <meshBasicMaterial color="#B8963E" transparent opacity={opacity} />
    </mesh>
  );
}

interface GoldDustProps {
  density?: number;
  rings?: boolean;
}

/**
 * Slow-drifting 3D golden starfield with orbiting ritual rings.
 * Pointer and scroll are tracked on `window`, so the canvas can live
 * inside a pointer-events-none layer and still parallax with the user.
 */
export default function GoldDust({ density = 800, rings = true }: GoldDustProps) {
  const motionRef = useRef<MotionState>({ x: 0, y: 0, scroll: 0 });

  const reduced = useMemo<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      motionRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      motionRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      motionRef.current.scroll = window.scrollY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />
    );
  }

  return (
    <div aria-hidden className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 58 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Dust count={density} motionRef={motionRef} />
        {rings && (
          <>
            <RitualRing radius={2.7} tilt={1.15} speed={0.09} opacity={0.3} z={-1.4} motionRef={motionRef} />
            <RitualRing radius={3.6} tilt={1.45} speed={-0.06} opacity={0.18} z={-2.4} motionRef={motionRef} />
            <RitualRing radius={1.9} tilt={0.9} speed={0.13} opacity={0.24} z={-0.8} motionRef={motionRef} />
          </>
        )}
      </Canvas>
    </div>
  );
}
