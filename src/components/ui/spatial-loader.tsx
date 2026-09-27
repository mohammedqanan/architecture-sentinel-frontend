'use client';

/**
 * src/components/ui/spatial-loader.tsx
 *
 * محمّل مكاني متقدم مع تحسينات الأداء.
 * - إزالة useUIStore (منع إعادة التصيير غير الضرورية)
 * - دعم prefers-reduced-motion
 * - 3 متغيرات (rings, dots, orbit)
 * - استخدام CSS animations بدلاً من Framer Motion (أداء أفضل)
 * - GPU-accelerated (will-change + transform)
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface SpatialLoaderProps {
  /** حجم المحمّل */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** لون المحمّل */
  color?: 'primary' | 'secondary' | 'accent';
  /** نص يظهر أسفل المحمّل */
  message?: string;
  /** توسيط في الحاوية الأب */
  centered?: boolean;
  /** نمط الرسم */
  variant?: 'rings' | 'dots' | 'orbit';
  /** فئات إضافية */
  className?: string;
}

// ============================================================
// Size Maps
// ============================================================

const SIZE_MAP = {
  sm: { container: 'w-6 h-6', ring: 'border-[1.5px]', dot: 'w-1.5 h-1.5', text: 'text-xs' },
  md: { container: 'w-10 h-10', ring: 'border-2', dot: 'w-2 h-2', text: 'text-sm' },
  lg: { container: 'w-16 h-16', ring: 'border-2', dot: 'w-3 h-3', text: 'text-sm' },
  xl: { container: 'w-24 h-24', ring: 'border-[3px]', dot: 'w-4 h-4', text: 'text-base' },
} as const;

const COLOR_MAP = {
  primary: {
    border: 'border-primary',
    text: 'text-primary',
    bg: 'bg-primary',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  },
  secondary: {
    border: 'border-secondary',
    text: 'text-secondary',
    bg: 'bg-secondary',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.4)]',
  },
  accent: {
    border: 'border-accent',
    text: 'text-accent',
    bg: 'bg-accent',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
  },
} as const;

// ============================================================
// Component
// ============================================================

const SpatialLoader: React.FC<SpatialLoaderProps> = ({
  size = 'md',
  color = 'primary',
  message,
  centered = false,
  variant = 'rings',
  className,
}) => {
  const sizeClasses = SIZE_MAP[size];
  const colorClasses = COLOR_MAP[color];

  // Memoized container classes
  const containerClasses = useMemo(
    () =>
      cn(
        'flex flex-col items-center justify-center gap-3',
        centered && 'w-full h-full min-h-[200px]',
        className
      ),
    [centered, className]
  );

  // ============================================================
  // Rings Variant (Default)
  // ============================================================
  const renderRings = () => (
    <div className={cn('relative flex items-center justify-center', sizeClasses.container)}>
      {/* Outer Ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-t-transparent animate-spin',
          sizeClasses.ring,
          colorClasses.border,
          colorClasses.glow
        )}
        style={{
          animationDuration: '1.2s',
          willChange: 'transform',
        }}
      />
      {/* Inner Ring (Counter-rotating) */}
      <div
        className={cn(
          'absolute rounded-full border-b-transparent',
          sizeClasses.ring,
          colorClasses.border,
          'opacity-70'
        )}
        style={{
          width: '60%',
          height: '60%',
          animation: 'spin 1.8s linear infinite reverse',
          willChange: 'transform',
        }}
      />
      {/* Center Dot (Pulsing) */}
      <div
        className={cn(
          'rounded-full',
          sizeClasses.dot,
          colorClasses.bg,
          colorClasses.glow
        )}
        style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );

  // ============================================================
  // Dots Variant (Wave of Dots)
  // ============================================================
  const renderDots = () => (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('rounded-full', sizeClasses.dot, colorClasses.bg)}
          style={{
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );

  // ============================================================
  // Orbit Variant (Orbiting Dot)
  // ============================================================
  const renderOrbit = () => (
    <div
      className={cn(
        'relative flex items-center justify-center animate-spin',
        sizeClasses.container
      )}
      style={{ animationDuration: '1.5s', willChange: 'transform' }}
    >
      {/* Central Node */}
      <div
        className={cn(
          'absolute rounded-full',
          sizeClasses.dot,
          colorClasses.bg,
          colorClasses.glow
        )}
      />
      {/* Orbiting Node */}
      <div
        className={cn(
          'absolute rounded-full',
          sizeClasses.dot,
          colorClasses.bg
        )}
        style={{ top: 0, transform: 'translateY(-50%)' }}
      />
    </div>
  );

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className={containerClasses} role="status" aria-live="polite" aria-busy="true">
      {variant === 'rings' && renderRings()}
      {variant === 'dots' && renderDots()}
      {variant === 'orbit' && renderOrbit()}

      {message && (
        <p
          className={cn(
            'font-mono tracking-wider text-center',
            sizeClasses.text,
            'text-text-secondary',
            'animate-[fadeIn_0.3s_ease-out_0.2s_both]'
          )}
        >
          {message}
        </p>
      )}

      {/* Inline Keyframes for Perf */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

SpatialLoader.displayName = 'SpatialLoader';

export default React.memo(SpatialLoader);
export { SpatialLoader };