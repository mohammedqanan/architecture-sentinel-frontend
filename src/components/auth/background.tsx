'use client';

/**
 * src/components/auth/background.tsx
 *
 * ArchitectureSentinel — Spatial Background (v5.0)
 * ════════════════════════════════════════════════════════════
 *
 * 🎨 "Resilient Ember Cosmos" — 5 طبقات + استدامة كاملة
 *
 * ════════════════════════════════════════════════════════════
 * 🛡️ المعالجات الحرجة (Critical Fixes):
 * ════════════════════════════════════════════════════════════
 *
 *   ✅ #1 WebGL Context Loss Handling
 *      - يستمع لـ webglcontextlost / webglcontextrestored
 *      - يمنع الشاشة السوداء عبر Fallback UI
 *      - يعيد بناء الـ Canvas تلقائياً بعد الاستعادة
 *
 *   ✅ #2 Zero Mouse Listener Duplication
 *      - يستخدم state.pointer المدمج في React Three Fiber
 *      - لا مزيد من window.addEventListener('mousemove', ...)
 *      - أداء أعلى + كود أنظف
 *
 *   ✅ #3 Responsive Scaling (no magic numbers)
 *      - useResponsiveScale يحسب المقياس حسب aspect ratio
 *      - يدعم portrait / standard / wide / ultra-wide
 *      - كل الإحداثيات نسبية للـ scale
 *
 *   ✅ #4 prefers-reduced-motion (actual implementation)
 *      - useReducedMotion من framer-motion
 *      - يوقف كل الحركات في useFrame
 *      - يقلل عدد الجسيمات تلقائياً
 *
 * ════════════════════════════════════════════════════════════
 *
 * 🎨 الطبقات البصرية:
 *   L1. Starfield     → نجوم بعيدة (عمق لانهائي)
 *   L2. Ember Helix   → حلزون مزدوج ذهبي
 *   L3. Floating Shapes → 5 مجسمات هندسية
 *   L4. Orbital Rings → 3 حلقات مدارية
 *   L5. Ambient Glow  → 3 تدرجات aurora
 */

import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import { SpatialLoader } from '@/components/ui/spatial-loader';

// ════════════════════════════════════════════════════════════
// 1. COLOR PALETTE
// ════════════════════════════════════════════════════════════

const PALETTE = {
  ember: '#E8A33D',
  emberBright: '#F5B658',
  emberDeep: '#C68A28',
  steel: '#5B7FA8',
  steelBright: '#7B9DC4',
  copper: '#C66B3D',
  copperBright: '#DD7F4E',
  warmWhite: '#F5F2ED',
  star: '#F5E6C8',
} as const;

// ════════════════════════════════════════════════════════════
// 2. VARIANT CONFIG
// ════════════════════════════════════════════════════════════

interface VariantConfig {
  helixCount: number;
  starCount: number;
  helixColor: string;
  starColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  rotationSpeed: number;
  shapeScale: number;
  auroraColor1: string;
  auroraColor2: string;
  primaryIntensity: number;
  ringColor: string;
}

const VARIANT_CONFIG: Record<'login' | 'register', VariantConfig> = {
  login: {
    helixCount: 3500,
    starCount: 1200,
    helixColor: PALETTE.ember,
    starColor: PALETTE.star,
    primaryColor: PALETTE.ember,
    secondaryColor: PALETTE.steel,
    accentColor: PALETTE.copper,
    rotationSpeed: 0.05,
    shapeScale: 1.0,
    auroraColor1: PALETTE.ember,
    auroraColor2: PALETTE.steel,
    primaryIntensity: 1.4,
    ringColor: PALETTE.steel,
  },
  register: {
    helixCount: 4500,
    starCount: 1500,
    helixColor: PALETTE.emberBright,
    starColor: PALETTE.star,
    primaryColor: PALETTE.ember,
    secondaryColor: PALETTE.copper,
    accentColor: PALETTE.steel,
    rotationSpeed: 0.08,
    shapeScale: 1.15,
    auroraColor1: PALETTE.copperBright,
    auroraColor2: PALETTE.ember,
    primaryIntensity: 1.6,
    ringColor: PALETTE.copper,
  },
};

// ════════════════════════════════════════════════════════════
// 3. 🆕 HOOK: WebGL Context Loss Recovery
// ════════════════════════════════════════════════════════════

interface WebGLContextRecoveryResult {
  contextLost: boolean;
  recoveryKey: number;
  handleContextLost: (e: Event) => void;
  handleContextRestored: () => void;
}

/**
 * 🛡️ يستمع لأحداث WebGL Context Loss ويعيد البناء تلقائياً.
 *
 * آلية العمل:
 *   1. عند loss → preventDefault + set contextLost=true (يعرض fallback)
 *   2. عند restore → set contextLost=false + increment recoveryKey
 *   3. recoveryKey يُستخدَم كـ key على <Canvas> → يُعيد التركيب بالكامل
 *
 * الفائدة: يمنع "الشاشة السوداء" على الأجهزة الضعيفة.
 */
function useWebGLContextRecovery(): WebGLContextRecoveryResult {
  const [contextLost, setContextLost] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState(0);

  const handleContextLost = useCallback((e: Event) => {
    // ⚠️ preventDefault ضروري للسماح بالاستعادة
    e.preventDefault();
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    setContextLost(false);
    // 🎯 زيادة الـ key تُجبر React على إعادة تركيب Canvas
    setRecoveryKey((k) => k + 1);
  }, []);

  return { contextLost, recoveryKey, handleContextLost, handleContextRestored };
}

// ════════════════════════════════════════════════════════════
// 4. 🆕 HOOK: Responsive Scale (no magic numbers)
// ════════════════════════════════════════════════════════════

/**
 * 🎯 يحسب مقياساً نسبياً حسب aspect ratio للشاشة.
 *
 * المقاييس:
 *   portrait  (aspect < 1.0)       → 0.75  (Mobile portrait)
 *   compact   (1.0 ≤ aspect < 1.5) → 0.95  (Tablet portrait / small laptop)
 *   standard  (1.5 ≤ aspect < 1.9) → 1.00  (Standard 16:9 / 16:10)
 *   wide      (1.9 ≤ aspect < 2.3) → 1.20  (21:9)
 *   ultrawide (aspect ≥ 2.3)       → 1.45  (32:9)
 *
 * يُستخدَم لضبط scale لكل العناصر (shapes, rings).
 */
function useResponsiveScale(): number {
  const { viewport } = useThree();

  return useMemo(() => {
    const aspect = viewport.aspect || 1;

    if (aspect < 1.0) return 0.75;
    if (aspect < 1.5) return 0.95;
    if (aspect < 1.9) return 1.0;
    if (aspect < 2.3) return 1.2;
    return 1.45;
  }, [viewport.aspect]);
}

// ════════════════════════════════════════════════════════════
// 5. L1 — STARFIELD
// ════════════════════════════════════════════════════════════

interface StarfieldProps {
  count: number;
  color: string;
  reducedMotion: boolean;
}

const Starfield = React.memo<StarfieldProps>(
  ({ count, color, reducedMotion }) => {
    const pointsRef = useRef<THREE.Points>(null);

    // 🎯 تقليل عدد النجوم في وضع reduced-motion
    const effectiveCount = reducedMotion ? Math.floor(count * 0.4) : count;

    const positions = useMemo(() => {
      const arr = new Float32Array(effectiveCount * 3);
      const radius = 25;
      for (let i = 0; i < effectiveCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * (0.7 + Math.random() * 0.3);
        arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        arr[i * 3 + 2] = r * Math.cos(phi);
      }
      return arr;
    }, [effectiveCount]);

    useFrame((_, delta) => {
      // ✅ احترام reduced-motion
      if (reducedMotion) return;
      if (pointsRef.current) {
        pointsRef.current.rotation.y += delta * 0.008;
        pointsRef.current.rotation.x += delta * 0.004;
      }
    });

    return (
      <Points
        ref={pointsRef}
        positions={positions}
        stride={3}
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          color={color}
          size={0.08}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </Points>
    );
  }
);
Starfield.displayName = 'Starfield';

// ════════════════════════════════════════════════════════════
// 6. L2 — EMBER HELIX (uses state.pointer, no listeners)
// ════════════════════════════════════════════════════════════

interface EmberHelixProps {
  count: number;
  color: string;
  rotationSpeed: number;
  reducedMotion: boolean;
}

const EmberHelix = React.memo<EmberHelixProps>(
  ({ count, color, rotationSpeed, reducedMotion }) => {
    const pointsRef = useRef<THREE.Points>(null);

    // 🎯 تقليل الجسيمات في وضع reduced-motion
    const effectiveCount = reducedMotion ? Math.floor(count * 0.5) : count;

    const positions = useMemo(() => {
      const arr = new Float32Array(effectiveCount * 3);
      const turns = 5;
      const height = 20;
      const radius = 5.5;

      for (let i = 0; i < effectiveCount; i++) {
        const t = i / effectiveCount;
        const strand = i % 2;
        const angle = t * Math.PI * 2 * turns + strand * Math.PI;
        const r = radius * (0.75 + Math.sin(t * Math.PI * 3) * 0.25);
        arr[i * 3] = Math.cos(angle) * r;
        arr[i * 3 + 1] = (t - 0.5) * height;
        arr[i * 3 + 2] = Math.sin(angle) * r;
      }
      return arr;
    }, [effectiveCount]);

    // ✅ لا listeners! state.pointer يوفر الإحداثيات المُعيّرة تلقائياً
    useFrame((state, delta) => {
      if (!pointsRef.current) return;

      // ✅ احترام reduced-motion (يُوقف الدوران المستمر)
      if (reducedMotion) return;

      const pointer = state.pointer; // Vector2 in [-1, 1]
      pointsRef.current.rotation.y +=
        delta * rotationSpeed + pointer.x * 0.0015;
      pointsRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
      pointsRef.current.rotation.x = pointer.y * 0.04;
    });

    return (
      <Points
        ref={pointsRef}
        positions={positions}
        stride={3}
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          color={color}
          size={0.06}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.95}
        />
      </Points>
    );
  }
);
EmberHelix.displayName = 'EmberHelix';

// ════════════════════════════════════════════════════════════
// 7. L4 — ORBITAL RINGS (responsive, reduced-motion aware)
// ════════════════════════════════════════════════════════════

interface OrbitalRingsProps {
  color: string;
  baseScale: number;
  reducedMotion: boolean;
}

const OrbitalRings = React.memo<OrbitalRingsProps>(
  ({ color, baseScale, reducedMotion }) => {
    const groupRef = useRef<THREE.Group>(null);

    // 🎯 Responsive: يضرب baseScale في المقياس المُحسَّب
    const responsiveScale = useResponsiveScale();
    const finalScale = baseScale * responsiveScale;

    useFrame((state, delta) => {
      if (!groupRef.current) return;
      if (reducedMotion) return; // ✅ احترام reduced-motion

      groupRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
      groupRef.current.rotation.y += delta * 0.05;
    });

    // 🎯 نُمرّر كل النسب عبر finalScale — لا magic numbers
    const ring1Radius = 7 * finalScale;
    const ring2Radius = 9 * finalScale;
    const ring3Radius = 11 * finalScale;

    return (
      <group ref={groupRef}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[ring1Radius, 0.015, 8, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
          <torusGeometry args={[ring2Radius, 0.012, 8, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[ring3Radius, 0.008, 8, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }
);
OrbitalRings.displayName = 'OrbitalRings';

// ════════════════════════════════════════════════════════════
// 8. L3 — FLOATING SHAPES (responsive positions)
// ════════════════════════════════════════════════════════════

interface FloatingShapesProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  baseScale: number;
  reducedMotion: boolean;
}

const FloatingShapes = React.memo<FloatingShapesProps>(
  ({ primaryColor, secondaryColor, accentColor, baseScale, reducedMotion }) => {
    const mesh1Ref = useRef<THREE.Mesh>(null);
    const mesh2Ref = useRef<THREE.Mesh>(null);
    const mesh3Ref = useRef<THREE.Mesh>(null);
    const mesh4Ref = useRef<THREE.Mesh>(null);
    const mesh5Ref = useRef<THREE.Mesh>(null);

    // 🎯 Responsive scale — كل الإحداثيات نسبية
    const responsiveScale = useResponsiveScale();
    const s = baseScale * responsiveScale;

    useFrame((state, delta) => {
      if (reducedMotion) return; // ✅ احترام reduced-motion

      const t = state.clock.elapsedTime;

      if (mesh1Ref.current) {
        mesh1Ref.current.rotation.x += delta * 0.15;
        mesh1Ref.current.rotation.y += delta * 0.2;
        mesh1Ref.current.position.y = 0.8 * s + Math.sin(t * 0.4) * 0.4;
      }
      if (mesh2Ref.current) {
        mesh2Ref.current.rotation.x += delta * 0.1;
        mesh2Ref.current.rotation.z += delta * 0.12;
        mesh2Ref.current.position.y = -0.6 * s + Math.cos(t * 0.35) * 0.5;
      }
      if (mesh3Ref.current) {
        mesh3Ref.current.rotation.y += delta * 0.18;
        mesh3Ref.current.rotation.z -= delta * 0.08;
        mesh3Ref.current.position.y = 2 * s + Math.sin(t * 0.5) * 0.3;
      }
      if (mesh4Ref.current) {
        mesh4Ref.current.rotation.x -= delta * 0.12;
        mesh4Ref.current.rotation.y += delta * 0.15;
        mesh4Ref.current.position.y = -2.5 * s + Math.sin(t * 0.3) * 0.4;
      }
      if (mesh5Ref.current) {
        mesh5Ref.current.rotation.y -= delta * 0.2;
        mesh5Ref.current.position.y = 1.5 * s + Math.cos(t * 0.45) * 0.35;
      }
    });

    return (
      <>
        {/* ─── 1. Icosahedron (Ember) ─── */}
        <Float
          speed={reducedMotion ? 0 : 1.2}
          rotationIntensity={reducedMotion ? 0 : 0.6}
          floatIntensity={reducedMotion ? 0 : 0.8}
        >
          <mesh ref={mesh1Ref} position={[-3.5 * s, 0.8 * s, -3]}>
            <icosahedronGeometry args={[1.8 * s, 1]} />
            <meshStandardMaterial
              color={primaryColor}
              wireframe
              transparent
              opacity={0.22}
              emissive={primaryColor}
              emissiveIntensity={0.45}
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>
        </Float>

        {/* ─── 2. Torus Knot (Steel/Copper) ─── */}
        <Float
          speed={reducedMotion ? 0 : 0.9}
          rotationIntensity={reducedMotion ? 0 : 0.8}
          floatIntensity={reducedMotion ? 0 : 0.6}
        >
          <mesh ref={mesh2Ref} position={[3.8 * s, -0.6 * s, -4.5]}>
            <torusKnotGeometry args={[1.3 * s, 0.38 * s, 96, 12]} />
            <meshStandardMaterial
              color={secondaryColor}
              wireframe
              transparent
              opacity={0.18}
              emissive={secondaryColor}
              emissiveIntensity={0.35}
              roughness={0.4}
              metalness={0.7}
            />
          </mesh>
        </Float>

        {/* ─── 3. Octahedron (Copper) ─── */}
        <Float
          speed={reducedMotion ? 0 : 1.5}
          rotationIntensity={reducedMotion ? 0 : 0.5}
          floatIntensity={reducedMotion ? 0 : 1.0}
        >
          <mesh ref={mesh3Ref} position={[0.5 * s, 2 * s, -5]}>
            <octahedronGeometry args={[1.1 * s, 0]} />
            <meshStandardMaterial
              color={accentColor}
              wireframe
              transparent
              opacity={0.16}
              emissive={accentColor}
              emissiveIntensity={0.3}
            />
          </mesh>
        </Float>

        {/* ─── 4. Dodecahedron (Ember) ─── */}
        <Float
          speed={reducedMotion ? 0 : 1.0}
          rotationIntensity={reducedMotion ? 0 : 0.7}
          floatIntensity={reducedMotion ? 0 : 0.7}
        >
          <mesh ref={mesh4Ref} position={[-2.8 * s, -2.5 * s, -6]}>
            <dodecahedronGeometry args={[1.4 * s, 0]} />
            <meshStandardMaterial
              color={primaryColor}
              wireframe
              transparent
              opacity={0.12}
              emissive={primaryColor}
              emissiveIntensity={0.25}
            />
          </mesh>
        </Float>

        {/* ─── 5. Tetrahedron (Steel) ─── */}
        <Float
          speed={reducedMotion ? 0 : 1.4}
          rotationIntensity={reducedMotion ? 0 : 0.6}
          floatIntensity={reducedMotion ? 0 : 0.9}
        >
          <mesh ref={mesh5Ref} position={[2.5 * s, 1.5 * s, -6.5]}>
            <tetrahedronGeometry args={[1.2 * s, 0]} />
            <meshStandardMaterial
              color={secondaryColor}
              wireframe
              transparent
              opacity={0.14}
              emissive={secondaryColor}
              emissiveIntensity={0.28}
            />
          </mesh>
        </Float>
      </>
    );
  }
);
FloatingShapes.displayName = 'FloatingShapes';

// ════════════════════════════════════════════════════════════
// 9. CAMERA PARALLAX (uses state.pointer — no listeners!)
// ════════════════════════════════════════════════════════════

interface CameraParallaxProps {
  reducedMotion: boolean;
}

const CameraParallax = React.memo<CameraParallaxProps>(({ reducedMotion }) => {
  const { camera } = useThree();

  // ✅ state.pointer — بدلاً من window.addEventListener
  useFrame((state) => {
    if (reducedMotion) return;

    const targetX = state.pointer.x * 0.4;
    const targetY = state.pointer.y * 0.3;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });

  return null;
});
CameraParallax.displayName = 'CameraParallax';

// ════════════════════════════════════════════════════════════
// 10. SCENE COMPOSER
// ════════════════════════════════════════════════════════════

interface SceneProps {
  config: VariantConfig;
  reducedMotion: boolean;
}

const Scene = React.memo<SceneProps>(({ config, reducedMotion }) => (
  <>
    {/* ─── Lighting ─── */}
    <ambientLight intensity={0.5} color={config.primaryColor} />
    <directionalLight
      position={[5, 10, 7]}
      intensity={config.primaryIntensity}
      color={config.primaryColor}
    />
    <pointLight position={[-5, -5, 5]} intensity={0.9} color={config.secondaryColor} />
    <pointLight position={[5, -5, -5]} intensity={0.7} color={config.accentColor} />
    <pointLight position={[0, 8, -8]} intensity={0.5} color={config.primaryColor} />

    {/* ─── Camera ─── */}
    <CameraParallax reducedMotion={reducedMotion} />

    {/* ─── L1: Starfield ─── */}
    <Starfield
      count={config.starCount}
      color={config.starColor}
      reducedMotion={reducedMotion}
    />

    {/* ─── L2: Ember Helix ─── */}
    <EmberHelix
      count={config.helixCount}
      color={config.helixColor}
      rotationSpeed={config.rotationSpeed}
      reducedMotion={reducedMotion}
    />

    {/* ─── L4: Orbital Rings ─── */}
    <OrbitalRings
      color={config.ringColor}
      baseScale={config.shapeScale}
      reducedMotion={reducedMotion}
    />

    {/* ─── L3: Floating Shapes ─── */}
    <FloatingShapes
      primaryColor={config.primaryColor}
      secondaryColor={config.secondaryColor}
      accentColor={config.accentColor}
      baseScale={config.shapeScale}
      reducedMotion={reducedMotion}
    />
  </>
));
Scene.displayName = 'Scene';

// ════════════════════════════════════════════════════════════
// 11. 🆕 FALLBACK UI (WebGL Context Lost)
// ════════════════════════════════════════════════════════════

interface ContextLostFallbackProps {
  onRetry: () => void;
}

const ContextLostFallback: React.FC<ContextLostFallbackProps> = ({ onRetry }) => (
  <div
    className="absolute inset-0 flex items-center justify-center"
    role="alert"
    aria-live="assertive"
  >
    <div className="text-center space-y-3 px-6 max-w-sm">
      <div
        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'oklch(72% 0.135 65 / 0.10)',
          border: '1px solid oklch(72% 0.135 65 / 0.30)',
        }}
      >
        <span className="text-2xl" role="img" aria-label="Warning">
          ⚠️
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        3D rendering is temporarily unavailable
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs px-4 py-2 rounded-md transition-colors"
        style={{
          color: 'var(--color-primary)',
          backgroundColor: 'oklch(72% 0.135 65 / 0.10)',
          border: '1px solid oklch(72% 0.135 65 / 0.30)',
        }}
      >
        Retry
      </button>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
// 12. MAIN COMPONENT
// ════════════════════════════════════════════════════════════

interface AuthBackgroundProps {
  variant: 'login' | 'register';
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ variant }) => {
  const config = VARIANT_CONFIG[variant];
  const prefersReducedMotion = useReducedMotion() ?? false;

  // 🛡️ WebGL Context Recovery
  const { contextLost, recoveryKey, handleContextLost, handleContextRestored } =
    useWebGLContextRecovery();

  // ✅ Dynamic DPR — يُعاد حسابها عند mount فقط
  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio, 2);
  }, []);

  // ✅ Aurora gradient (memoized)
  const auroraBackground = useMemo(
    () =>
      `radial-gradient(
        ellipse 80% 60% at 30% 40%,
        ${config.auroraColor1}18 0%,
        transparent 60%
      ), radial-gradient(
        ellipse 70% 50% at 70% 60%,
        ${config.auroraColor2}14 0%,
        transparent 60%
      ), radial-gradient(
        ellipse 50% 40% at 50% 50%,
        ${config.primaryColor}10 0%,
        transparent 70%
      )`,
    [config.auroraColor1, config.auroraColor2, config.primaryColor]
  );

  // ✅ Retry handler for context lost
  const handleRetry = useCallback(() => {
    // في حال الفشل، نطلب من Canvas إعادة البناء
    window.location.reload();
  }, []);

  // ✅ Canvas onCreated — ربط listeners للـ WebGL context
  const handleCanvasCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      const canvas = gl.domElement;
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener(
        'webglcontextrestored',
        handleContextRestored,
        false
      );
    },
    [handleContextLost, handleContextRestored]
  );

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* ─── Aurora Layer ─── */}
      <div
        className="absolute inset-0 opacity-60 animate-aurora"
        style={{ background: auroraBackground }}
      />

      {/* ─── Context Lost Fallback ─── */}
      {contextLost ? (
        <ContextLostFallback onRetry={handleRetry} />
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center justify-center w-full h-full">
              <SpatialLoader
                size="lg"
                color="primary"
                message="Initializing spatial environment…"
              />
            </div>
          }
        >
          {/* 🎯 recoveryKey يُجبر إعادة التركيب عند context restore */}
          <Canvas
            key={recoveryKey}
            camera={{ position: [0, 0, 10], fov: 55 }}
            dpr={dpr}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
            frameloop="always"
            onCreated={handleCanvasCreated}
          >
            <Scene config={config} reducedMotion={prefersReducedMotion} />
          </Canvas>
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(AuthBackground);
export { AuthBackground };