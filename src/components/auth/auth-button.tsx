'use client';

/**
 * src/components/auth/auth-button.tsx
 *
 * زر CTA مع Gradient Ember→Copper + Glow قوي.
 * ════════════════════════════════════════════════════════════
 * ✅ حل مشكلة #4: زر بارز بصرياً (وليس مدمج مع الخلفية)
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** نص الزر */
  children: React.ReactNode;
  /** حالة التحميل */
  loading?: boolean;
  /** نص بديل أثناء التحميل */
  loadingText?: string;
}

const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      disabled,
      className,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn('auth-button', className)}
        {...rest}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{loadingText ?? children}</span>
            </>
          ) : (
            children
          )}
        </span>
      </button>
    );
  }
);

AuthButton.displayName = 'AuthButton';

export default React.memo(AuthButton) as typeof AuthButton;
export { AuthButton };