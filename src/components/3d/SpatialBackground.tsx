'use client';

/**
 * src/components/3d/SpatialBackground.tsx
 *
 * عزل كامل لطبقة WebGL مع تحسينات الأداء.
 * - يستخدم React.memo لمنع إعادة التصيير عند تغيير حالة النموذج.
 * - يدعم dpr ديناميكياً لتقليل العبء على المعالج الرسومي.
 * - شبكة جسيمات تفاعلية مع تأثير Parallax لحركة الماوس.
 * - مؤثرات Bloom و DepthOfField لإضافة عمق سينمائي.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';

// ============================================================
// 1. نظام الجسيمات العصبي (Neural Particle Field)
// ============================================================

interface NeuralParticleFieldProps {
  count?: number;
  radius?: number;
  color?: string;
  mouseInfluence?: number;
}

const NeuralParticleField = React.memo<NeuralParticleFieldProps>(({
  count = 2500,
  radius = 8,
  color = '#4f46e5',
  mouseInfluence = 0.003,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // توليد مواقع الجسيمات بشكل حلزوني فائق
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 8;
      const r = radius * (i / count);
      const noise = Math.sin(i * 0.01) * 0.5;
      pos[i * 3] = Math.cos(t + noise) * r;
      pos[i * 3 + 1] = Math.sin(t * 0.8 + noise) * r * 0.6;
      pos[i * 3 + 2] = Math.sin(t * 1.2 + noise * 2) * r * 0.4;
    }
    return pos;
  }, [count, radius]);

  // تفعيل Parallax للماوس
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const rotY = delta * 0.06 + mouse.current.x * mouseInfluence;
      const rotX = delta * 0.03 + mouse.current.y * mouseInfluence * 0.6;
      pointsRef.current.rotation.y += rotY;
      pointsRef.current.rotation.x += rotX;
      // اهتزاز طفيف يمنح حيوية
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.2;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.045}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.85}
      />
    </Points>
  );
});

// ============================================================
// 2. مجسمات عائمة مع توهج
// ============================================================

const FloatingShapes = React.memo(() => {
  const shape1Ref = useRef<THREE.Mesh>(null);
  const shape2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (shape1Ref.current) {
      shape1Ref.current.rotation.x += delta * 0.15;
      shape1Ref.current.rotation.y += delta * 0.2;
      shape1Ref.current.position.y = Math.sin(_.clock.elapsedTime * 0.4) * 0.4;
    }
    if (shape2Ref.current) {
      shape2Ref.current.rotation.x += delta * 0.1;
      shape2Ref.current.rotation.z += delta * 0.12;
    }
  });

  return (
    <>
      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh ref={shape1Ref} position={[-3, 0.5, -2]}>
          <icosahedronGeometry args={[1.6, 1]} />
          <meshStandardMaterial
            color="#3b82f6"
            wireframe
            transparent
            opacity={0.12}
            emissive="#3b82f6"
            emissiveIntensity={0.25}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      </Float>
      <Float speed={0.9} rotationIntensity={0.8} floatIntensity={0.6}>
        <mesh ref={shape2Ref} position={[3.2, -0.8, -4]}>
          <torusKnotGeometry args={[1.1, 0.35, 64, 8]} />
          <meshStandardMaterial
            color="#8b5cf6"
            wireframe
            transparent
            opacity={0.1}
            emissive="#8b5cf6"
            emissiveIntensity={0.2}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      </Float>
    </>
  );
});

// ============================================================
// 3. مكون محتوى المشهد الداخلي (حيث يُسمح باستخدام R3F Hooks بأمان)
// ============================================================

interface SceneContentProps {
  children?: React.ReactNode;
}

const SceneContent: React.FC<SceneContentProps> = ({ children }) => {
  const { camera } = useThree();

  // Parallax للكاميرا (تأثير سينمائي خفيف) داخل نطاق الـ Canvas
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      camera.position.x += (x * 0.2 - camera.position.x) * 0.015;
      camera.position.y += (y * 0.15 - camera.position.y) * 0.015;
      camera.lookAt(0, 0, 0);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [camera]);

  return (
    <>
      {/* إضاءة سينمائية */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 7]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#8b5cf6" />
      <pointLight position={[5, -5, -5]} intensity={0.6} color="#06b6d4" />

      {/* البيئة */}
      <Environment preset="city" background={false} />

      {/* عناصر المشهد */}
      <NeuralParticleField count={2000} radius={7} color="#4f46e5" />
      <FloatingShapes />

      {/* مؤثرات ما بعد المعالجة (سينمائية) */}
      <EffectComposer>
        <Bloom
          intensity={0.4}
          radius={0.3}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
        />
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.4}
          bokehScale={0.8}
          height={480}
        />
      </EffectComposer>

      {children}
    </>
  );
};

// ============================================================
// 4. المكون الرئيسي للخلفية المكانية
// ============================================================

interface SpatialBackgroundProps {
  children?: React.ReactNode;
}

export const SpatialBackground = React.memo<SpatialBackgroundProps>(({ children }) => {
  const [dpr, setDpr] = useState(1.5);

  // ضبط dpr ديناميكياً حسب أداء الجهاز
  useEffect(() => {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    setDpr(pixelRatio);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <SceneContent>{children}</SceneContent>
    </Canvas>
  );
});