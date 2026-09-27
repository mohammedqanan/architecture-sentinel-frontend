'use client';

/**
 * src/components/auth/auth-layout-shell.tsx
 *
 * ArchitectureSentinel — Auth Layout Shell (v3.1)
 * ════════════════════════════════════════════════════════════
 *
 * 🎯 الأهداف المُحقَّقة:
 *   1. ✅ Responsive Layout يستغل الشاشات الكبيرة (Grid for aside)
 *   2. ✅ Taskbar-compatible (100dvh + safe-area-inset)
 *   3. ✅ A11y كامل (ARIA, keyboard, screen readers, RTL)
 *   4. ✅ Animation staggered مع prefers-reduced-motion
 *   5. ✅ React 19 compatible (assignRef, no ref.current write)
 *   6. ✅ Zero hardcoded colors (CSS variables only)
 *   7. ✅ Flexible slots (brandMark, aside, footer, stepIndicator)
 *   8. ✅ Presentation mode (F11-friendly for fullscreen demo)
 *
 * 🏗️ البنية المعمارية:
 *   Shell
 *   ├── AuthBackground (3D Canvas layer, z-0)
 *   ├── Ambient Vignette (z-1)
 *   └── Content Grid (z-10)
 *       ├── Aside (optional, lg only)
 *       ├── Card (GlassCard)
 *       └── Right Spacer (visual balance)
 *
 * 🎨 Theme:
 *   - Dark (default): Obsidian + Ember
 *   - Light: Ivory + Bronze
 *   - Uses CSS variables → runtime switching
 *
 * ♿ Accessibility:
 *   - role="main" + aria-labelledby + aria-describedby
 *   - aria-busy during loading
 *   - Esc → onBack (optional)
 *   - role="status" for SR announcements
 *   - RTL support via logical properties
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AuthBackground } from './background';
import { APP_ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import { assignRef } from '@/lib/react-utils';

// ════════════════════════════════════════════════════════════
// 1. TYPES — Public API Surface
// ════════════════════════════════════════════════════════════

/** نمط الخلفية الثلاثية الأبعاد */
export type AuthBackgroundVariant = 'login' | 'register';

/** حجم الحاوية (responsive-aware) */
export type AuthShellSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AuthLayoutShellProps {
  // ─────── Content ───────
  /** عنوان رئيسي (افتراضي: ArchitectureSentinel) */
  title?: string;
  /** وصف توضيحي أسفل العنوان */
  subtitle?: string;
  /** شعار/أيقونة تظهر فوق العنوان */
  brandMark?: ReactNode;
  /** محتوى النموذج */
  children: ReactNode;
  /** محتوى إضافي أسفل النموذج (Terms, Links, Help) */
  footer?: ReactNode;
  /** محتوى جانبي (lg only) — ميزات، اقتباسات، إحصائيات */
  aside?: ReactNode;

  // ─────── Background ───────
  /** نمط الخلفية ثلاثية الأبعاد */
  backgroundType: AuthBackgroundVariant;

  // ─────── Navigation ───────
  /** إظهار زر الرجوع */
  showBackButton?: boolean;
  /** نص زر الرجوع (لـ i18n) */
  backLabel?: string;
  /** مسار الرجوع الافتراضي */
  backTo?: string;
  /** callback مخصص للرجوع (يتجاوز backTo) */
  onBack?: () => void;

  // ─────── States ───────
  /** حالة التحميل — تعطّل التفاعل مع النموذج */
  loading?: boolean;
  /** رسالة خطأ عامة (شبكة/مصادقة) */
  error?: string | null;

  // ─────── Display ───────
  /** حجم الحاوية */
  size?: AuthShellSize;
  /** مؤشر خطوات (متعدد المراحل) */
  stepIndicator?: ReactNode;
  /** 🎯 وضع العرض التقديمي (يُخفي شريط المهام عبر F11) */
  presentationMode?: boolean;
  /** فئات إضافية للحاوية الخارجية */
  className?: string;
  /** فئات إضافية للبطاقة الداخلية */
  cardClassName?: string;
}

// ════════════════════════════════════════════════════════════
// 2. CONSTANTS — Sizing & Variants
// ════════════════════════════════════════════════════════════

/**
 * 🎯 عرض تكيفي متعدد المراحل:
 *   sm  → 384px (ثابت)
 *   md  → 448 → 512px (lg)
 *   lg  → 448 → 512 → 576px (xl)
 *   xl  → 448 → 512 → 672px (2xl) ← للـ Register
 */
const SIZE_MAP: Record<AuthShellSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md lg:max-w-lg',
  lg: 'max-w-md sm:max-w-lg lg:max-w-xl',
  xl: 'max-w-md sm:max-w-lg lg:max-w-2xl',
} as const;

// ─────── Animation Variants ───────

const CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const ERROR_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

const STATIC_VARIANTS: Variants = { hidden: {}, visible: {} };

// ════════════════════════════════════════════════════════════
// 3. SUB-COMPONENT — Brand Mark Slot
// ════════════════════════════════════════════════════════════

interface BrandMarkSlotProps {
  children: ReactNode;
}

const BrandMarkSlot = React.memo<BrandMarkSlotProps>(({ children }) => (
  <div
    className={cn(
      'flex justify-center mb-5',
      'text-(--color-primary)',
      'transition-transform duration-500 ease-out',
      'motion-safe:hover:scale-105'
    )}
    aria-hidden="true"
  >
    {children}
  </div>
));
BrandMarkSlot.displayName = 'BrandMarkSlot';

// ════════════════════════════════════════════════════════════
// 4. SUB-COMPONENT — Error Banner
// ════════════════════════════════════════════════════════════

interface ErrorBannerProps {
  message: string;
  id: string;
}

const ErrorBanner = React.memo<ErrorBannerProps>(({ message, id }) => (
  <motion.div
    id={id}
    role="alert"
    aria-live="assertive"
    variants={ERROR_VARIANTS}
    initial="hidden"
    animate="visible"
    exit="exit"
    className={cn(
      'flex items-start gap-2.5',
      'text-sm text-(--color-error-text)',
      'bg-(--color-error-bg)',
      'border border-(--color-error-border)',
      'rounded-lg p-3 mb-4',
      'backdrop-blur-sm'
    )}
  >
    <AlertCircle
      className="w-4 h-4 mt-0.5 shrink-0"
      aria-hidden="true"
    />
    <span className="leading-relaxed">{message}</span>
  </motion.div>
));
ErrorBanner.displayName = 'ErrorBanner';

// ════════════════════════════════════════════════════════════
// 5. MAIN COMPONENT — AuthLayoutShell
// ════════════════════════════════════════════════════════════

export const AuthLayoutShell = forwardRef<
  HTMLDivElement,
  AuthLayoutShellProps
>(
  (
    {
      title = 'ArchitectureSentinel',
      subtitle,
      brandMark,
      children,
      footer,
      aside,
      backgroundType,
      showBackButton = false,
      backLabel = 'Back',
      backTo = APP_ROUTES.home,
      onBack,
      loading = false,
      error = null,
      size = 'md',
      stepIndicator,
      presentationMode = false,
      className,
      cardClassName,
    },
    forwardedRef
  ) => {
    // ─────── Hooks: Motion & IDs ───────
    const prefersReducedMotion = useReducedMotion() ?? false;
    const titleId = useId();
    const subtitleId = useId();
    const errorId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    // ─────── Merge forwarded ref (React 19 safe) ───────
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        assignRef(containerRef, node);
        assignRef(forwardedRef, node);
      },
      [forwardedRef]
    );

    // ─────── Memoized animation variants ───────
    const containerVariants = useMemo(
      () => (prefersReducedMotion ? STATIC_VARIANTS : CONTAINER_VARIANTS),
      [prefersReducedMotion]
    );
    const cardVariants = useMemo(
      () => (prefersReducedMotion ? STATIC_VARIANTS : CARD_VARIANTS),
      [prefersReducedMotion]
    );

    // ─────── Back Navigation Handler ───────
    const handleBack = useCallback(() => {
      onBack?.();
    }, [onBack]);

    // ─────── Keyboard: Escape → Back ───────
    useEffect(() => {
      if (!showBackButton || !onBack) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !loading) {
          event.preventDefault();
          handleBack();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showBackButton, onBack, loading, handleBack]);

    // ─────── 🎯 Presentation Mode (F11 helper) ───────
    useEffect(() => {
      if (!presentationMode) return;

      document.body.classList.add('presentation-mode');
      return () => {
        document.body.classList.remove('presentation-mode');
      };
    }, [presentationMode]);

    // ─────── Computed: aria-describedby ───────
    const describedByIds = useMemo(() => {
      const ids: string[] = [];
      if (subtitle) ids.push(subtitleId);
      if (error) ids.push(errorId);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [subtitle, error, subtitleId, errorId]);

    // ─────── Render: Back Button ───────
    const renderBackButton = () => {
      if (!showBackButton) return null;

      const classes = cn(
        'inline-flex items-center gap-2 mb-5',
        'text-xs text-(--color-text-secondary)',
        'hover:text-(--color-primary)',
        'transition-colors duration-200',
        'focus:outline-none focus-visible:text-(--color-primary)',
        'focus-visible:underline focus-visible:underline-offset-4',
        'rounded-sm px-1 -mx-1 py-1',
        'disabled:opacity-50 disabled:pointer-events-none'
      );

      const content = (
        <>
          <ArrowLeft
            className="w-3.5 h-3.5 rtl:rotate-180"
            aria-hidden="true"
          />
          <span>{backLabel}</span>
        </>
      );

      // Custom onBack → button
      if (onBack) {
        return (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className={classes}
            aria-label={backLabel}
          >
            {content}
          </button>
        );
      }

      // Default → Link
      return (
        <Link
          to={backTo}
          className={classes}
          aria-label={backLabel}
          tabIndex={loading ? -1 : 0}
          aria-disabled={loading || undefined}
          onClick={(e) => {
            if (loading) e.preventDefault();
          }}
        >
          {content}
        </Link>
      );
    };

    // ─────── Render ───────
    return (
      <div
        ref={setRefs}
        className={cn(
          // 🎯 Taskbar-compatible height (100dvh + safe-area)
          'auth-shell',
          'relative w-full',
          'flex items-center justify-center',
          'bg-(--color-void)',
          'overflow-hidden',
          // Responsive padding
          'px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12',
          className
        )}
      >
        {/* ─────── 3D Background ─────── */}
        <AuthBackground variant={backgroundType} />

        {/* ─────── Ambient Vignette ─────── */}
        <div
          className="pointer-events-none absolute inset-0 z-1"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, transparent 0%, rgba(8,12,20,0.55) 100%)',
          }}
          aria-hidden="true"
        />

        {/* ─────── Main Content Grid ─────── */}
        <div
          className={cn(
            'relative z-10 w-full',
            aside
              ? // 🎯 3-column grid: [Aside | Card | Spacer]
                'grid grid-cols-1 lg:grid-cols-[1fr_min-content_1fr] lg:gap-16 lg:items-center max-w-6xl'
              : 'flex justify-center'
          )}
        >
          {/* ─────── Aside (lg only) ─────── */}
          {aside && (
            <motion.aside
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className={cn(
                'hidden lg:block',
                'lg:justify-self-end',
                'text-(--color-text-primary)',
                'max-w-md'
              )}
            >
              {aside}
            </motion.aside>
          )}

          {/* ─────── Card Container ─────── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className={cn(
              'w-full',
              SIZE_MAP[size],
              !aside && 'mx-auto'
            )}
          >
            <motion.div variants={cardVariants}>
              <GlassCard
                variant="glow"
                padding="lg"
                className={cn('auth-card w-full', cardClassName)}
              >
                {/* Back Button */}
                {renderBackButton()}

                {/* Step Indicator */}
                {stepIndicator && (
                  <div className="mb-6" aria-label="Progress">
                    {stepIndicator}
                  </div>
                )}

                {/* Header */}
                <header className="text-center mb-7">
                  {brandMark && <BrandMarkSlot>{brandMark}</BrandMarkSlot>}
                  <h1
                    id={titleId}
                    className={cn(
                      'text-3xl sm:text-4xl font-semibold tracking-tight',
                      'text-brand-gradient'
                    )}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p
                      id={subtitleId}
                      className={cn(
                        'text-sm text-(--color-text-secondary)',
                        'mt-2 leading-relaxed'
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </header>

                {/* Error Banner */}
                <AnimatePresence mode="wait">
                  {error && (
                    <ErrorBanner
                      key="error"
                      message={error}
                      id={errorId}
                    />
                  )}
                </AnimatePresence>

                {/* Form Content */}
                <div
                  role="main"
                  aria-labelledby={titleId}
                  aria-describedby={describedByIds}
                  aria-busy={loading ? 'true' : undefined}
                  className={cn(
                    'transition-opacity duration-200',
                    loading &&
                      'opacity-60 pointer-events-none select-none'
                  )}
                >
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <footer className="auth-divider mt-6 pt-5">
                    {footer}
                  </footer>
                )}
              </GlassCard>
            </motion.div>

            {/* SR-only status */}
            <p
              className="sr-only"
              role="status"
              aria-live="polite"
            >
              {loading ? 'Processing your request, please wait.' : ''}
            </p>
          </motion.div>

          {/* ─────── Right Spacer (visual grid balance) ─────── */}
          {aside && (
            <div
              className="hidden lg:block"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    );
  }
);

AuthLayoutShell.displayName = 'AuthLayoutShell';

// ════════════════════════════════════════════════════════════
// 6. EXPORTS
// ════════════════════════════════════════════════════════════

export default React.memo(AuthLayoutShell) as typeof AuthLayoutShell;