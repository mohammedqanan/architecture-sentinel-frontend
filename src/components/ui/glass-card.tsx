'use client';

/**
 * src/app/components/ui/glass-card.tsx
 *
 * Enterprise-grade polymorphic Glassmorphic Component.
 * Engineered for high-performance rendering contexts, multi-theme awareness,
 * strict TypeScript type boundaries, and spatial UI consistency.
 */

import React, { ElementType, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

export interface GlassCardProps
  extends Omit<
    React.ComponentPropsWithoutRef<ElementType>,
    'variant' | 'padding' | 'rounded' | 'as' | 'className' | 'children'
  > {
  variant?: 'default' | 'glow' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  as?: ElementType;
  children?: React.ReactNode;
  className?: string;
}

export const GlassCard = forwardRef<HTMLElement, GlassCardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      rounded = 'lg',
      as: Component = 'div',
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Dynamic global theme state subscription
    const theme = useUIStore((state) => state.theme);
    const isDark = theme === 'dark';

    // Core layout and glass blur baseline styles
    const baseStyles = cn(
      'backdrop-blur-xl transition-all duration-300',
      isDark
        ? 'bg-white/[0.04] border border-white/10 text-gray-100'
        : 'bg-black/[0.03] border border-black/10 text-gray-900',
      
      // Radius mapping matrix
      rounded === 'none' && 'rounded-none',
      rounded === 'sm' && 'rounded-sm',
      rounded === 'md' && 'rounded-md',
      rounded === 'lg' && 'rounded-xl',
      rounded === 'full' && 'rounded-full',
      
      // Padding density boundaries
      padding === 'none' && 'p-0',
      padding === 'sm' && 'p-3',
      padding === 'md' && 'p-5',
      padding === 'lg' && 'p-7',
      padding === 'xl' && 'p-10'
    );

    // Advanced visual architectural variant layer
    const variantStyles: Record<NonNullable<GlassCardProps['variant']>, string> = {
      default: '',
      glow: isDark
        ? 'shadow-[0_0_35px_rgba(79,70,229,0.18)] border-primary/40'
        : 'shadow-[0_0_35px_rgba(79,70,229,0.1)] border-primary/30',
      elevated: isDark
        ? 'shadow-2xl shadow-black/40 border-white/20 bg-white/[0.07]'
        : 'shadow-xl shadow-black/5 border-black/20 bg-black/[0.05]',
      interactive: cn(
        'cursor-pointer hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/50 active:translate-y-0 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      ),
    };

    // Safe dynamic index lookup with compile-time type enforcement
    const variantStyle = variantStyles[variant as keyof typeof variantStyles] || '';

    return (
      <Component
        ref={ref}
        className={cn(baseStyles, variantStyle, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;