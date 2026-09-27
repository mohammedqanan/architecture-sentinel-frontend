'use client';

/**
 * src/app/register/page.tsx
 * ════════════════════════════════════════════════════════════
 *
 * 📦 Register Page — ArchitectureSentinel v4.2
 *
 * نموذج التسجيل الكامل مع:
 *   • firstName + lastName
 *   • confirmPassword (يُرسل للـ Backend للتوافق)
 *   • tenantId (يُرسل في Body + Header)
 *   • Inline validation (Zod + custom)
 *   • Password strength meter
 *   • Full accessibility (ARIA, keyboard, focus management)
 *
 * 🆕 إصلاحات v4.2:
 *   ✅ إرسال tenantId في Body (بجانب Header) لضمان التوافق
 *   ✅ الـ Backend يقبل كلا المصدرين
 *
 * @module register-page
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Check, X, AlertCircle } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { AuthField } from '@/components/auth/auth-field';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthLayoutShell } from '@/components/auth/auth-layout-shell';
import {
  REGEX,
  APP_ROUTES,
  DEFAULT_TENANT_ID,
  PASSWORD_REQUIREMENTS,
  ERROR_MESSAGES,
} from '@/constants';
import { registerSchema } from '@/utils/validation';
import { isApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════
// 1. Types
// ════════════════════════════════════════════════════════════

interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  tenantId: string;
}

type RegisterField = keyof RegisterValues;
type FieldErrors = Partial<Record<RegisterField, string>>;

// ════════════════════════════════════════════════════════════
// 2. Password Strength
// ════════════════════════════════════════════════════════════

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  special: boolean;
}

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  checks: PasswordChecks;
}

function getPasswordStrength(password: string): StrengthResult {
  const checks: PasswordChecks = {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: REGEX.uppercase.test(password),
    lowercase: REGEX.lowercase.test(password),
    digit: REGEX.digit.test(password),
    special: REGEX.special.test(password),
  };

  let score = 0;
  if (checks.length) score += 30;
  if (password.length >= 12) score += 15;
  if (checks.uppercase) score += 20;
  if (checks.lowercase) score += 10;
  if (checks.digit) score += 20;
  if (checks.special) score += 5;

  const finalScore = Math.min(score, 100);

  let level: StrengthLevel = 'weak';
  if (finalScore >= 80) level = 'strong';
  else if (finalScore >= 60) level = 'good';
  else if (finalScore >= 40) level = 'fair';

  return { level, score: finalScore, checks };
}

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  weak: 'bg-(--color-error)',
  fair: 'bg-(--color-warning)',
  good: 'bg-(--color-primary)',
  strong: 'bg-(--color-valid)',
};

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

// ════════════════════════════════════════════════════════════
// 3. Password Checklist Component
// ════════════════════════════════════════════════════════════

interface PasswordChecklistProps {
  checks: PasswordChecks;
}

const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ checks }) => {
  const items: Array<{ key: keyof PasswordChecks; label: string; ok: boolean }> = [
    {
      key: 'length',
      label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      ok: checks.length,
    },
    { key: 'uppercase', label: 'One uppercase letter', ok: checks.uppercase },
    { key: 'lowercase', label: 'One lowercase letter', ok: checks.lowercase },
    { key: 'digit', label: 'One digit', ok: checks.digit },
  ];

  return (
    <ul
      className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1"
      aria-live="polite"
    >
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            'flex items-center gap-1.5 text-xs transition-colors duration-200',
            item.ok ? 'text-(--color-valid-text)' : 'text-(--color-text-muted)'
          )}
        >
          {item.ok ? (
            <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          ) : (
            <X className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
};

// ════════════════════════════════════════════════════════════
// 4. Inline Validation Helper
// ════════════════════════════════════════════════════════════

function validateRegisterField(
  field: RegisterField,
  allValues: RegisterValues
): string | undefined {
  const value = allValues[field];

  switch (field) {
    case 'firstName': {
      if (!value?.trim()) return 'First name is required';
      if (value.trim().length < 2) return 'At least 2 characters';
      if (!REGEX.name.test(value.trim())) return 'Invalid characters';
      return undefined;
    }
    case 'lastName': {
      if (!value?.trim()) return 'Last name is required';
      if (value.trim().length < 2) return 'At least 2 characters';
      if (!REGEX.name.test(value.trim())) return 'Invalid characters';
      return undefined;
    }
    case 'email': {
      if (!value) return 'Email is required';
      if (!REGEX.email.test(value)) return 'Invalid email address';
      return undefined;
    }
    case 'password': {
      if (!value) return 'Password is required';
      if (value.length < PASSWORD_REQUIREMENTS.minLength) {
        return `At least ${PASSWORD_REQUIREMENTS.minLength} characters`;
      }
      if (PASSWORD_REQUIREMENTS.requireUppercase && !REGEX.uppercase.test(value)) {
        return 'Must contain at least one uppercase letter';
      }
      if (PASSWORD_REQUIREMENTS.requireDigit && !REGEX.digit.test(value)) {
        return 'Must contain at least one digit';
      }
      return undefined;
    }
    case 'confirmPassword': {
      if (!value) return 'Please confirm your password';
      if (value !== allValues.password) return 'Passwords do not match';
      return undefined;
    }
    case 'tenantId': {
      if (!value?.trim()) return 'Tenant ID is required';
      return undefined;
    }
    default:
      return undefined;
  }
}

// ════════════════════════════════════════════════════════════
// 5. Component
// ════════════════════════════════════════════════════════════

export default function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    isLoading,
    error: authError,
    errorDetails,
    clearError,
  } = useAuth();

  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantId: DEFAULT_TENANT_ID,
  });

  const [touched, setTouched] = useState<
    Partial<Record<RegisterField, boolean>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const setField = useCallback(
    (field: RegisterField) => (value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (submitError) setSubmitError(null);
      if (authError) clearError();
    },
    [submitError, authError, clearError]
  );

  const visibleErrors = useMemo<FieldErrors>(() => {
    const result: FieldErrors = {};
    (Object.keys(values) as RegisterField[]).forEach((field) => {
      if (touched[field]) {
        const err = validateRegisterField(field, values);
        if (err) result[field] = err;
      }
    });
    return result;
  }, [values, touched]);

  const fieldState = useCallback(
    (field: RegisterField): 'idle' | 'valid' | 'invalid' => {
      if (!touched[field] || !values[field]) return 'idle';
      return visibleErrors[field] ? 'invalid' : 'valid';
    },
    [touched, values, visibleErrors]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(values.password),
    [values.password]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    clearError();

    const result = registerSchema.safeParse(values);

    if (!result.success) {
      const fieldErrs: FieldErrors = {};
      for (const issue of result.error.errors) {
        const path = issue.path[0] as RegisterField;
        if (!fieldErrs[path]) {
          fieldErrs[path] = issue.message;
        }
      }

      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        confirmPassword: true,
        tenantId: true,
      });

      const firstErrorField = Object.keys(fieldErrs)[0] as
        | RegisterField
        | undefined;
      if (firstErrorField) {
        const el = formRef.current?.querySelector<HTMLElement>(
          `[data-field="${firstErrorField}"] input`
        );
        el?.focus();
      }
      return;
    }

    try {
      // ✅ إرسال جميع الحقول — بما فيها tenantId و confirmPassword
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        tenantId: values.tenantId.trim() || DEFAULT_TENANT_ID,
      });

      navigate(APP_ROUTES.home, { replace: true });
    } catch (err) {
      let message: string = ERROR_MESSAGES.registrationFailed;

      if (isApiError(err)) {
        message = err.message || ERROR_MESSAGES.registrationFailed;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setSubmitError(message);
    }
  };

  const generalError = submitError ?? authError;

  return (
    <AuthLayoutShell
      title="ArchitectureSentinel"
      subtitle="Create your account to begin"
      backgroundType="register"
      size="xl"
      error={generalError}
      footer={
        <p className="text-center text-sm text-(--color-text-secondary)">
          Already have an account?{' '}
          <Link
            to={APP_ROUTES.login}
            className={cn(
              'text-(--color-primary) hover:underline font-medium',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)',
              'rounded-sm px-1'
            )}
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-label="Create account"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div data-field="firstName">
            <AuthField
              ref={firstFieldRef}
              id="firstName"
              label="First name"
              type="text"
              value={values.firstName}
              onChange={setField('firstName')}
              placeholder="Jane"
              autoComplete="given-name"
              error={visibleErrors.firstName}
              validationState={fieldState('firstName')}
              disabled={isLoading}
              required
            />
          </div>

          <div data-field="lastName">
            <AuthField
              id="lastName"
              label="Last name"
              type="text"
              value={values.lastName}
              onChange={setField('lastName')}
              placeholder="Doe"
              autoComplete="family-name"
              error={visibleErrors.lastName}
              validationState={fieldState('lastName')}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div data-field="email">
          <AuthField
            id="email"
            label="Email address"
            type="email"
            value={values.email}
            onChange={setField('email')}
            placeholder="jane.doe@example.com"
            autoComplete="email"
            error={visibleErrors.email}
            validationState={fieldState('email')}
            disabled={isLoading}
            required
          />
        </div>

        <div data-field="password">
          <AuthField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={setField('password')}
            placeholder={`At least ${PASSWORD_REQUIREMENTS.minLength} characters`}
            autoComplete="new-password"
            error={visibleErrors.password}
            validationState={fieldState('password')}
            disabled={isLoading}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className={cn(
                  'p-1 rounded-md',
                  'text-(--color-text-muted)',
                  'hover:text-(--color-text-primary)',
                  'transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2',
                  'focus-visible:ring-(--color-primary)'
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
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

          {values.password && (
            <div className="mt-3 space-y-2" aria-live="polite">
              <div className="flex gap-1" role="presentation">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      passwordStrength.score >= (i + 1) * 25
                        ? STRENGTH_COLORS[passwordStrength.level]
                        : 'bg-(--color-surface-hover)'
                    )}
                  />
                ))}
              </div>

              <p className="text-xs text-(--color-text-muted)">
                Password strength:{' '}
                <span
                  className={cn(
                    'font-medium',
                    passwordStrength.level === 'strong' &&
                      'text-(--color-valid-text)',
                    passwordStrength.level === 'good' &&
                      'text-(--color-primary)',
                    passwordStrength.level === 'fair' &&
                      'text-(--color-warning-text)',
                    passwordStrength.level === 'weak' &&
                      'text-(--color-error-text)'
                  )}
                >
                  {STRENGTH_LABELS[passwordStrength.level]}
                </span>
              </p>

              <PasswordChecklist checks={passwordStrength.checks} />
            </div>
          )}
        </div>

        <div data-field="confirmPassword">
          <AuthField
            id="confirmPassword"
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            value={values.confirmPassword}
            onChange={setField('confirmPassword')}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={visibleErrors.confirmPassword}
            validationState={fieldState('confirmPassword')}
            disabled={isLoading}
            required
          />
        </div>

        {errorDetails?.errors && errorDetails.errors.length > 0 && (
          <div
            className={cn(
              'flex items-start gap-2.5',
              'text-xs text-(--color-error-text)',
              'bg-(--color-error-bg)',
              'border border-(--color-error-border)',
              'rounded-lg p-3'
            )}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <ul className="space-y-1 list-disc list-inside">
              {errorDetails.errors.map((fieldError, index) => (
                <li key={`${fieldError.field}-${index}`}>
                  <span className="font-medium">{fieldError.field}:</span>{' '}
                  {fieldError.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-3">
          <AuthButton
            type="submit"
            loading={isLoading}
            loadingText="Creating account…"
          >
            <Shield className="w-4 h-4" aria-hidden="true" />
            Create account
          </AuthButton>
        </div>
      </form>
    </AuthLayoutShell>
  );
}