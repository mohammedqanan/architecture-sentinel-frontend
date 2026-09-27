'use client';

/**
 * src/components/auth/auth-field.tsx
 * ════════════════════════════════════════════════════════════
 *
 * Advanced input field with inline validation.
 *
 * 🏗️ States:
 *   - idle       → neutral (default border)
 *   - validating → validating (spinner)
 *   - valid      → valid (Sage green + ✓)
 *   - invalid    → error (Crimson + ⚠)
 *
 * ♿ a11y:
 *   - aria-invalid, aria-describedby
 *   - role="alert" on error message
 *   - SR-friendly announcements
 *
 * ════════════════════════════════════════════════════════════
 * Architecture Notes:
 * ════════════════════════════════════════════════════════════
 *
 * ✅ `onChange` is OMITTED from the extended HTML attributes
 *    because this component uses a VALUE-based callback:
 *        onChange: (value: string) => void
 *    rather than the native event-based signature:
 *        onChange: (event: ChangeEvent<HTMLInputElement>) => void
 *
 *    Extending the native attributes without omitting `onChange`
 *    causes a TS2322 conflict — the two signatures are incompatible.
 *
 * ✅ `size` is also omitted because it has a conflicting semantics
 *    in HTML (`size` = visible width in characters) vs. common UI
 *    usage (small/medium/large). Not used here, but reserved.
 *
 * @module components/auth/auth-field
 */

import React, {
  forwardRef,
  useId,
  useCallback,
  type ChangeEvent,
} from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * 🎯 Props for `AuthField`.
 *
 * ⚠️ We omit BOTH `'size'` and `'onChange'` from the native input
 *    attributes:
 *    - `size` → has conflicting HTML semantics.
 *    - `onChange` → replaced with a value-based callback below.
 */
export interface AuthFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'onChange'
  > {
  /** Visible label text (required). */
  label: string;

  /** Current field value (controlled). */
  value: string;

  /**
   * 🎯 Value-based change handler.
   *
   * Receives the raw string value rather than the DOM event, keeping
   * the component API clean and framework-agnostic at the call site:
   *
   *     <AuthField onChange={(v) => setEmail(v)} />
   *
   * instead of:
   *
   *     <AuthField onChange={(e) => setEmail(e.target.value)} />
   */
  onChange: (value: string) => void;

  /** Error message (activates `invalid` state when present). */
  error?: string;

  /** Helper/hint text displayed below the field. */
  hint?: string;

  /** Validation state (controls right-side indicator icon). */
  validationState?: ValidationState;

  /** Whether to show the validation indicator. Defaults to `true`. */
  showIndicator?: boolean;

  /** Optional element on the right (e.g., password visibility toggle). */
  rightSlot?: React.ReactNode;
}

// ============================================================
// Validation Indicator
// ============================================================

interface ValidationIndicatorProps {
  state: ValidationState;
}

const ValidationIndicator: React.FC<ValidationIndicatorProps> = React.memo(
  ({ state }) => {
    if (state === 'idle') return null;

    const baseClass = 'w-4 h-4 shrink-0 transition-colors duration-200';

    switch (state) {
      case 'validating':
        return (
          <Loader2
            className={cn(baseClass, 'animate-spin text-(--color-text-muted)')}
            aria-hidden="true"
          />
        );
      case 'valid':
        return (
          <CheckCircle2
            className={cn(baseClass, 'text-(--color-valid-text)')}
            aria-hidden="true"
          />
        );
      case 'invalid':
        return (
          <AlertCircle
            className={cn(baseClass, 'text-(--color-error-text)')}
            aria-hidden="true"
          />
        );
      default:
        return null;
    }
  },
);
ValidationIndicator.displayName = 'ValidationIndicator';

// ============================================================
// Component
// ============================================================

const AuthFieldInner = forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    {
      id: providedId,
      label,
      value,
      onChange,
      error,
      hint,
      validationState,
      showIndicator = true,
      rightSlot,
      className,
      disabled,
      type = 'text',
      ...rest
    },
    ref,
  ) => {
    // ───── Stable IDs (a11y) ─────
    const reactId = useId();
    const id = providedId ?? reactId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    // ───── Effective state ─────
    const state: ValidationState =
      validationState ?? (error ? 'invalid' : 'idle');

    // ───── ARIA wiring ─────
    const describedBy = error ? errorId : hint ? hintId : undefined;

    // ───── Native onChange → value-based onChange bridge ─────
    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
      },
      [onChange],
    );

    // ───── Padding right (reserve space for icons) ─────
    const hasRightContent = (showIndicator && state !== 'idle') || rightSlot;

    return (
      <div className="space-y-1.5">
        {/* ---- Label ---- */}
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium',
            'text-(--color-text-secondary)',
            'transition-colors duration-200',
          )}
        >
          {label}
        </label>

        {/* ---- Input Wrapper ---- */}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={type}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            data-validation={state !== 'idle' ? state : undefined}
            className={cn(
              'auth-field',
              hasRightContent ? 'pr-10' : 'pr-4',
              className,
            )}
            {...rest}
          />

          {/* ---- Right Side (Indicator + Slot) ---- */}
          {hasRightContent && (
            <div
              className={cn(
                'pointer-events-none',
                'absolute inset-y-0 right-3',
                'flex items-center gap-2',
              )}
            >
              {showIndicator && <ValidationIndicator state={state} />}
              {rightSlot && (
                <span className="pointer-events-auto">{rightSlot}</span>
              )}
            </div>
          )}
        </div>

        {/* ---- Hint / Error Message ---- */}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className={cn(
              'text-xs font-medium',
              'text-(--color-error-text)',
              'animate-[fadeIn_0.15s_ease-out]',
            )}
          >
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-(--color-text-muted)">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

AuthFieldInner.displayName = 'AuthField';

/**
 * ✅ `AuthField` — memoized forwardRef component.
 *
 * The `as typeof AuthFieldInner` cast preserves the ref-forwarding
 * type signature when wrapping with `React.memo`.
 */
export const AuthField = React.memo(AuthFieldInner) as typeof AuthFieldInner;

export default AuthField;