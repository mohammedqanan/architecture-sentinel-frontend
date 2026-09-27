'use client';

/**
 * src/components/3d/ThreeDBackground.tsx
 *
 * خلفية ثلاثية الأبعاد متحركة باستخدام React Three Fiber و Drei.
 * تحتوي على جسيمات نجوم، مجسمات عائمة (حلقة، مجسم عشري، كرة)،
 * وإضاءة ديناميكية تتكيف مع الثيم (داكن/فاتح).
 *
 * ✅ جميع عناصر Three.js معروفة بفضل jsxImportSource و three-jsx.d.ts
 * ✅ يستخدم React.memo و useMemo لتحسين الأداء
 * ✅ متوافق مع Vite + React + TypeScript
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Torus, Icosahedron, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '@/stores/ui-store';

// ============================================================
// المشهد الداخلي (SceneContent)
// ============================================================

const SceneContent: React.FC = () => {
  const theme = useUIStore((state) => state.theme);
  const isDark = theme === 'dark';

  // ألوان ديناميكية حسب الثيم
  const colors = useMemo(
    () => ({
      primary: isDark ? '#3B82F6' : '#2563EB',
      secondary: isDark ? '#8B5CF6' : '#7C3AED',
      accent: isDark ? '#06B6D4' : '#0891B2',
    }),
    [isDark]
  );

  // مراجع المجسمات للتحريك
  const torusRef = useRef<THREE.Mesh>(null);
  const icosaRef = useRef<THREE.Mesh>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  // حلقة التحديث (تحريك المجسمات مع الوقت)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.1;
      torusRef.current.rotation.y = t * 0.15;
      torusRef.current.position.y = Math.sin(t * 0.3) * 0.5;
    }
    if (icosaRef.current) {
      icosaRef.current.rotation.x = t * 0.08;
      icosaRef.current.rotation.z = t * 0.12;
      icosaRef.current.position.x = Math.sin(t * 0.2 + 1) * 1.2;
    }
    if (sphereRef.current) {
      sphereRef.current.position.y = Math.sin(t * 0.4 + 0.5) * 0.8;
    }
  });

  // خصائص النجوم (تُحفظ في الذاكرة لمنع إعادة الإنشاء)
  const starProps = useMemo(
    () => ({
      radius: 10,
      depth: 10,
      count: 800,
      factor: 0.4,
      saturation: 0.5,
      speed: 0.3,
    }),
    []
  );

  return (
    <>
      {/* إضاءة */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 7]} intensity={0.8} color={colors.primary} />
      <pointLight position={[-5, -5, 5]} intensity={0.6} color={colors.secondary} />
      <pointLight position={[5, -5, -5]} intensity={0.4} color={colors.accent} />

      {/* جسيمات النجوم */}
      <Stars
        radius={starProps.radius}
        depth={starProps.depth}
        count={starProps.count}
        factor={starProps.factor}
        saturation={starProps.saturation}
        speed={starProps.speed}
      />

      {/* المجسمات العائمة */}
      <group position={[0, 0, 0]}>
        <Torus ref={torusRef} args={[1.2, 0.3, 16, 32]} position={[-1.5, 0.5, 0]}>
          <meshStandardMaterial
            color={colors.primary}
            emissive={colors.primary}
            emissiveIntensity={0.2}
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.85}
          />
        </Torus>

        <Icosahedron ref={icosaRef} args={[0.8, 0]} position={[1.8, -0.2, -0.5]}>
          <meshStandardMaterial
            color={colors.secondary}
            emissive={colors.secondary}
            emissiveIntensity={0.15}
            roughness={0.4}
            metalness={0.6}
            transparent
            opacity={0.8}
          />
        </Icosahedron>

        <Sphere ref={sphereRef} args={[0.6, 24, 24]} position={[0, -1.2, 1.5]}>
          <meshStandardMaterial
            color={colors.accent}
            emissive={colors.accent}
            emissiveIntensity={0.1}
            roughness={0.2}
            metalness={0.9}
            transparent
            opacity={0.7}
          />
        </Sphere>
      </group>

      {/* شبكة أرضية */}
      <gridHelper args={[10, 20, colors.primary, '#333']} position={[0, -2.5, 0]} />
    </>
  );
};

// ============================================================
// المكون الرئيسي
// ============================================================

const ThreeDBackground: React.FC = () => {
  const theme = useUIStore((state) => state.theme);
  const bgColor = theme === 'dark' ? '#080C14' : '#f0f4f8';

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: bgColor }}
      >
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
        <SceneContent />
      </Canvas>
    </div>
  );
};

export default React.memo(ThreeDBackground);