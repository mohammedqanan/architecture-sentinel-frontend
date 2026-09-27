/**
 * Shared Spatial Background Scene - Production Grade
 * Unified, highly optimized WebGL background for auth and immersive views.
 * Replaces redundant scene files with a modular, configurable architecture.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

// ---- Non-reactive pointer state (Zero re-render overhead) -----------------

const pointer = { x: 0, y: 0 };

function usePointerTracking(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);
}

// ---- Particle field engine -----------------------------------------------

const PARTICLE_COUNT = 1800;
const HELIX_RADIUS = 7.0;
const HELIX_TURNS = 3;

function createHelixPositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = (i / PARTICLE_COUNT) * Math.PI * 2 * HELIX_TURNS;
    const r = HELIX_RADIUS * (i / PARTICLE_COUNT);
    positions[i * 3] = Math.cos(t) * r;
    positions[i * 3 + 1] = Math.sin(t) * r * 0.6;
    positions[i * 3 + 2] = Math.sin(t * 1.2) * r * 0.5;
  }
  return positions;
}

interface ParticleFieldProps {
  still: boolean;
  particleColor?: string;
}

function ParticleField({ still, particleColor = '#818cf8' }: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(createHelixPositions, []);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    const drift = still ? 0 : 1;
    points.rotation.y += delta * 0.04 * drift + pointer.x * 0.001 * drift;
    points.rotation.x += delta * 0.015 * drift + pointer.y * 0.001 * drift;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={particleColor}
        size={0.042}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </Points>
  );
}

// ---- Floating geometric structures ---------------------------------------

function FloatingGeometry({ still }: { still: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (still) return;
    const t = state.clock.elapsedTime;
    if (a.current) {
      a.current.rotation.x += delta * 0.1;
      a.current.rotation.y += delta * 0.15;
      a.current.position.y = Math.sin(t * 0.4) * 0.4 + 0.2;
    }
    if (b.current) {
      b.current.rotation.x += delta * 0.07;
      b.current.rotation.z += delta * 0.09;
    }
  });

  return (
    <>
      <Float speed={still ? 0 : 1.0} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh ref={a} position={[-3.5, 0.8, -2.5]}>
          <icosahedronGeometry args={[1.4, 1]} />
          <meshStandardMaterial
            color="#60a5fa"
            wireframe
            transparent
            opacity={0.4}
            emissive="#3b82f6"
            emissiveIntensity={0.7}
          />
        </mesh>
      </Float>
      <Float speed={still ? 0 : 0.7} rotationIntensity={0.6} floatIntensity={0.4}>
        <mesh ref={b} position={[3.8, -0.6, -3.5]}>
          <torusKnotGeometry args={[1.0, 0.28, 64, 8]} />
          <meshStandardMaterial
            color="#a78bfa"
            wireframe
            transparent
            opacity={0.35}
            emissive="#8b5cf6"
            emissiveIntensity={0.6}
          />
        </mesh>
      </Float>
    </>
  );
}

// ---- Camera dynamic rig --------------------------------------------------

function CameraRig({ still }: { still: boolean }) {
  const camera = useThree((state) => state.camera);
  const target = useRef(new THREE.Vector3(0, 0, 7.5));

  useFrame(() => {
    if (still) return;
    target.current.set(pointer.x * 0.3, pointer.y * 0.2, camera.position.z);
    camera.position.lerp(target.current, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---- Main Component Entry ------------------------------------------------

export interface SpatialBackgroundProps {
  particleColor?: string;
  mode?: 'login' | 'register';
}

export default function SpatialBackground({ particleColor }: SpatialBackgroundProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const still = prefersReducedMotion;

  usePointerTracking(!still);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Tailwind v4 gradient backing */}
      <div className="absolute inset-0 bg-linear-to-tr from-[#030712] via-[#0b0f19] to-[#111827] opacity-95" />

      {/* Ambient glowing light portals for volumetric depth (Optimized Tailwind v4 classes) */}
      <div className="absolute top-1/3 left-1/3 w-120 h-120 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-120 h-120 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 0, 7.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 5]} intensity={1.8} color="#818cf8" />
        <pointLight position={[-6, -5, 3]} intensity={1.4} color="#c084fc" />
        <pointLight position={[6, -5, -4]} intensity={1.0} color="#22d3ee" />

        <CameraRig still={still} />
        <ParticleField still={still} particleColor={particleColor} />
        <FloatingGeometry still={still} />
      </Canvas>
    </div>
  );
}