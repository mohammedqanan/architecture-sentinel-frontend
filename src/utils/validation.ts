/**
 * src/utils/validation.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 Centralised Zod Validation — ArchitectureSentinel v2.0
 *
 * المصدر الوحيد للحقيقة لجميع schemas التحقق:
 *   • Auth (login, register, changePassword, refresh)
 *   • Projects (create, update)
 *   • Analyses (create)
 *   • HitL (feedback)
 *
 * ✅ جميع Auth schemas مطابقة 100% للـ Backend NestJS DTOs:
 *   • RegisterDto  — firstName + lastName + confirmPassword + tenantId
 *   • LoginDto     — email + password
 *   • ChangePasswordDto
 *
 * ✅ يستخدم PASSWORD_REQUIREMENTS و REGEX من `@/constants`.
 * ✅ Type-safe عبر z.infer.
 * ✅ يدعم Unicode في الأسماء.
 * ✅ رسائل خطأ متناسقة مع متطلبات الـ Backend.
 *
 * @module validation
 */

import { z } from 'zod';
import { PASSWORD_REQUIREMENTS, REGEX } from '@/constants';

// ════════════════════════════════════════════════════════════
// 1. Base Schemas (Reusable Primitives)
// ════════════════════════════════════════════════════════════

/**
 * 📧 Email Schema
 *
 * - Trim + Lowercase transformation
 * - Max 255 chars (مطابق للـ Backend)
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .transform((val) => val.trim().toLowerCase());

/**
 * 🔐 Password Schema
 *
 * ⚠️ مطابق 100% لـ `backend/src/auth/dto/register.dto.ts`:
 *   • min 8, max 128
 *   • at least 1 uppercase (A-Z)
 *   • at least 1 digit (0-9)
 *
 * ⚠️ رسائل الخطأ مُولَّدة من `PASSWORD_REQUIREMENTS` لضمان الاتساق.
 */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_REQUIREMENTS.minLength,
    `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`
  )
  .max(
    PASSWORD_REQUIREMENTS.maxLength,
    `Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`
  )
  .regex(
    REGEX.uppercase,
    'Password must contain at least one uppercase letter'
  )
  .regex(REGEX.digit, 'Password must contain at least one digit');

/**
 * 🔐 Confirm Password Schema
 *
 * مجرد string مطلوب — التحقق من التطابق يتم عبر `.refine()`.
 */
export const confirmPasswordSchema = z
  .string()
  .min(1, 'Please confirm your password');

/**
 * 👤 First Name Schema
 *
 * ✅ يدعم Unicode (عربي، فرنسي، إلخ) عبر `\p{L}`.
 * ✅ Trim.
 */
export const firstNameSchema = z
  .string()
  .min(1, 'First name is required')
  .min(2, 'First name must be at least 2 characters')
  .max(50, 'First name must be at most 50 characters')
  .regex(REGEX.name, 'First name contains invalid characters')
  .transform((val) => val.trim());

/**
 * 👤 Last Name Schema
 */
export const lastNameSchema = z
  .string()
  .min(1, 'Last name is required')
  .min(2, 'Last name must be at least 2 characters')
  .max(50, 'Last name must be at most 50 characters')
  .regex(REGEX.name, 'Last name contains invalid characters')
  .transform((val) => val.trim());

/**
 * 🏛️ Tenant ID Schema
 *
 * مطلوب للتسجيل في نظام Multi-tenant.
 */
export const tenantIdSchema = z
  .string()
  .min(1, 'Tenant ID is required')
  .max(100, 'Tenant ID is too long')
  .transform((val) => val.trim());

/**
 * 🔗 GitHub Repository URL Schema
 *
 * اختياري — يقبل `https://github.com/user/repo` فقط.
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(
    /^https?:\/\/(?:www\.)?github\.com\/[\w-]+\/[\w-]+(?:\/)?$/,
    'Must be a valid GitHub repository URL'
  )
  .optional()
  .or(z.literal(''));

/**
 * 🆔 UUID Schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

// ════════════════════════════════════════════════════════════
// 2. Auth Form Schemas
// ════════════════════════════════════════════════════════════

/**
 * 🔐 Login Form Schema
 *
 * ⚠️ لا يتحقق من تعقيد كلمة المرور (المستخدم قد يكون قديماً).
 *    فقط presence + email format.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * 🎯 Registration Form Schema
 *
 * ⚠️ CRITICAL: مطابق 100% لـ `RegisterDto` من الـ Backend:
 *   firstName, lastName, email, password, confirmPassword, tenantId
 *
 * ✅ `confirmPassword` verification عبر `.refine()`.
 * ✅ `password` يتحقق من uppercase + digit.
 */
export const registerSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    tenantId: tenantIdSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * 🔐 Change Password Form Schema
 *
 * ⚠️ مطابق لـ `backend/src/auth/dto/change-password.dto.ts`.
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ════════════════════════════════════════════════════════════
// 3. Feature Form Schemas
// ════════════════════════════════════════════════════════════

/**
 * 📁 Create Project Schema
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be at most 100 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .transform((val) => val?.trim() || ''),
  repoUrl: urlSchema,
});

/**
 * 📁 Update Project Schema (all fields optional)
 */
export const updateProjectSchema = createProjectSchema.partial();

/**
 * 🔬 Create Analysis Schema
 */
export const createAnalysisSchema = z.object({
  projectId: uuidSchema,
  branch: z
    .string()
    .max(100, 'Branch name is too long')
    .optional()
    .transform((val) => val?.trim() || ''),
});

/**
 * 👥 Submit HitL Feedback Schema
 */
export const submitHitLFeedbackSchema = z.object({
  feedback: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be at most 2000 characters')
    .transform((val) => val.trim()),
  approved: z.boolean(),
});

// ════════════════════════════════════════════════════════════
// 4. Inferred Type Exports
// ════════════════════════════════════════════════════════════

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;
export type CreateAnalysisFormValues = z.infer<typeof createAnalysisSchema>;
export type SubmitHitLFeedbackFormValues = z.infer<
  typeof submitHitLFeedbackSchema
>;

// ════════════════════════════════════════════════════════════
// 5. 🆕 Shared Error Types
// ════════════════════════════════════════════════════════════

/**
 * نموذج موحّد لأخطاء الحقول.
 *
 * يُستخدم في جميع components لتفادي إعادة تعريف الأنواع.
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * نتيجة `safeParse` — نجاح أو فشل مع أخطاء.
 */
export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: FormErrors<T>; rawErrors: z.ZodIssue[] };

// ════════════════════════════════════════════════════════════
// 6. Utility Functions
// ════════════════════════════════════════════════════════════

/**
 * 🎯 `validate` — Parse data & throw formatted Error.
 *
 * @example
 * ```ts
 * try {
 *   const valid = validate(registerSchema, formData);
 *   await register(valid);
 * } catch (err) {
 *   const errors = JSON.parse((err as Error).message);
 * }
 * ```
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of error.errors) {
        const path = issue.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = issue.message;
        }
      }
      throw new Error(JSON.stringify(formattedErrors));
    }
    throw error;
  }
}

/**
 * 🎯 `safeParse` — Parse data & return result (لا يرمي).
 *
 * ✅ مثالي للاستخدام في components للتحقق قبل الإرسال.
 *
 * @example
 * ```ts
 * const result = safeParse(registerSchema, formData);
 * if (!result.success) {
 *   setErrors(result.errors);
 *   return;
 * }
 * await register(result.data);
 * ```
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): SafeParseResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: FormErrors<T> = {};
  for (const issue of result.error.errors) {
    const path = issue.path[0] as keyof T;
    if (path !== undefined && !errors[path]) {
      errors[path] = issue.message;
    }
  }

  return {
    success: false,
    errors,
    rawErrors: result.error.errors,
  };
}

/**
 * 🎯 `validateField` — Validate a single field value.
 *
 * ✅ يُستخدم في inline validation (onChange / onBlur).
 *
 * @example
 * ```ts
 * const result = validateField(emailSchema, email);
 * if (!result.valid) setError(result.error);
 * ```
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { valid: true } | { valid: false; error: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { valid: true };
  }
  const firstError = result.error.errors[0];
  return {
    valid: false,
    error: firstError?.message || 'Invalid value',
  };
}

/**
 * 🎯 `isValidUUID` — Quick check for UUID format.
 */
export function isValidUUID(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * 🆕 `isStrongPassword` — تحقق سريع (بدون Zod) لتعقيد كلمة المرور.
 *
 * ✅ مثالي لـ real-time password strength meter.
 */
export function isStrongPassword(password: string): {
  isValid: boolean;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
  };
} {
  const checks = {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: REGEX.uppercase.test(password),
    lowercase: REGEX.lowercase.test(password),
    digit: REGEX.digit.test(password),
    special: REGEX.special.test(password),
  };

  const isValid =
    checks.length &&
    (!PASSWORD_REQUIREMENTS.requireUppercase || checks.uppercase) &&
    (!PASSWORD_REQUIREMENTS.requireLowercase || checks.lowercase) &&
    (!PASSWORD_REQUIREMENTS.requireDigit || checks.digit) &&
    (!PASSWORD_REQUIREMENTS.requireSpecial || checks.special);

  return { isValid, checks };
}

/**
 * 🆕 `getPasswordStrengthScore` — نقاط 0-100 لقوة كلمة المرور.
 *
 * ✅ مثالي للـ strength meter bar.
 */
export function getPasswordStrengthScore(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
} {
  if (!password) return { score: 0, level: 'weak' };

  let score = 0;
  if (password.length >= 8) score += 30;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (REGEX.uppercase.test(password)) score += 20;
  if (REGEX.lowercase.test(password)) score += 10;
  if (REGEX.digit.test(password)) score += 20;
  if (REGEX.special.test(password)) score += 15;

  const finalScore = Math.min(score, 100);

  let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (finalScore >= 80) level = 'strong';
  else if (finalScore >= 60) level = 'good';
  else if (finalScore >= 40) level = 'fair';

  return { score: finalScore, level };
}