/**
 * Circular SVG progress ring.
 * The animation is disabled under prefers-reduced-motion.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface LiveProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  isActive?: boolean;
}

const LiveProgressRing: React.FC<LiveProgressRingProps> = ({
  value,
  size = 96,
  strokeWidth = 8,
  label,
  isActive = false,
}) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary, #3B82F6)" />
            <stop offset="100%" stopColor="var(--color-secondary, #8B5CF6)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeOut' }}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.35))',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white tabular-nums">
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">
            {label}
          </span>
        )}
        {isActive && (
          <span
            className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>

      <span className="sr-only">
        Progress: {Math.round(clamped)}%
      </span>
    </div>
  );
};

export default React.memo(LiveProgressRing);