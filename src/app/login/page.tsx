'use client';

/**
 * src/app/login/page.tsx
 *
 * Login Page (v3.0)
 * ════════════════════════════════════════════════════════════
 * ✅ Inline validation
 * ✅ CTA بارز
 * ✅ Placeholder محسّن
 */

import { useState, useCallback, useMemo, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AuthField } from '@/components/auth/auth-field';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthLayoutShell } from '@/components/auth/auth-layout-shell';
import { REGEX, APP_ROUTES } from '@/constants';

interface LoginValues {
  email: string;
  password: string;
}

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

function validateLogin(values: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email) errors.email = 'Email is required';
  else if (!REGEX.email.test(values.email))
    errors.email = 'Invalid email address';
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error: authError } = useAuth();

  const [values, setValues] = useState<LoginValues>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof LoginValues, boolean>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = useCallback(
    (field: keyof LoginValues) => (value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const visibleErrors = useMemo<FieldErrors>(() => {
    const result: FieldErrors = {};
    if (touched.email && !values.email) result.email = 'Email is required';
    else if (touched.email && !REGEX.email.test(values.email))
      result.email = 'Invalid email address';
    if (touched.password && !values.password)
      result.password = 'Password is required';
    return result;
  }, [values, touched]);

  const fieldState = useCallback(
    (field: keyof LoginValues): 'idle' | 'valid' | 'invalid' => {
      if (!touched[field] || !values[field]) return 'idle';
      return visibleErrors[field] ? 'invalid' : 'valid';
    },
    [touched, values, visibleErrors]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    const nextErrors = validateLogin(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setTouched({ email: true, password: true });
      return;
    }
    setErrors({});
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(APP_ROUTES.home, { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
    }
  };

  const generalError = submitError ?? authError;

  return (
    <AuthLayoutShell
      title="ArchitectureSentinel"
      subtitle="Sign in to your account"
      backgroundType="login"
      size="md"
      error={generalError}
      footer={
        <p className="text-center text-sm text-(--color-text-secondary)">
          Don&apos;t have an account?{' '}
          <Link
            to={APP_ROUTES.register}
            className="text-(--color-primary) hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-label="Sign in"
      >
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={setField('email')}
          placeholder="jane@example.com"
          autoComplete="email"
          error={visibleErrors.email}
          validationState={fieldState('email')}
          disabled={isLoading}
        />

        <AuthField
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          onChange={setField('password')}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={visibleErrors.password}
          validationState={fieldState('password')}
          disabled={isLoading}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          }
        />

        <div className="pt-2">
          <AuthButton type="submit" loading={isLoading} loadingText="Signing in…">
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Sign in
          </AuthButton>
        </div>
      </form>
    </AuthLayoutShell>
  );
}