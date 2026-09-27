/**
 * ArchitectureSentinel - Authentication Type Definitions
 * ======================================================
 * Centralized type definitions for the authentication domain.
 * Uses Zod for runtime validation and TypeScript inference for
 * compile-time type safety.
 *
 * Design Principles:
 * - Single Source of Truth: All auth types are defined here
 * - Runtime + Compile-time safety: Zod schemas + TS inference
 * - Zero `any`: Strict typing across the entire auth domain
 * - Framework-agnostic: No React/Vite-specific imports
 * - Backend-aligned: Matches NestJS DTOs exactly
 *
 * @module AuthTypes
 */

import { z } from 'zod';

// ============================================================
// Enums & Constants
// ============================================================

/**
 * User role enumeration. Mirrors the backend `UserRole` enum exactly.
 */
export const UserRoleSchema = z.enum([
  'admin',
  'engineer',
  'reviewer',
  'readonly',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Human-readable labels for each role.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  engineer: 'Engineer',
  reviewer: 'Reviewer',
  readonly: 'Read Only',
} as const;

/**
 * Token type emitted by the backend.
 */
export const TokenTypeSchema = z.literal('Bearer');
export type TokenType = z.infer<typeof TokenTypeSchema>;

// ============================================================
// Validation Rules (single source of truth)
// ============================================================

/**
 * Email validation rules (aligned with backend `@IsEmail` + `@MaxLength(255)`).
 */
export const EMAIL_RULES = {
  maxLength: 255,
  minLength: 5,
} as const;

/**
 * Password validation rules (aligned with backend `@MinLength(8)` + `@MaxLength(128)`).
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireDigit: true,
  requireLowercase: true,
  requireUppercase: true,
} as const;

/**
 * Tenant ID validation (UUID v4).
 */
export const TENANT_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================
// Primitive Schemas
// ============================================================

export const EmailSchema = z
  .string()
  .min(EMAIL_RULES.minLength, 'Email is too short')
  .max(EMAIL_RULES.maxLength, 'Email is too long')
  .email('Please enter a valid email address')
  .transform((value) => value.toLowerCase().trim());

export const PasswordSchema = z
  .string()
  .min(
    PASSWORD_RULES.minLength,
    `Password must be at least ${PASSWORD_RULES.minLength} characters`,
  )
  .max(
    PASSWORD_RULES.maxLength,
    `Password must not exceed ${PASSWORD_RULES.maxLength} characters`,
  )
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const TenantIdSchema = z
  .string()
  .regex(TENANT_ID_REGEX, 'Tenant ID must be a valid UUID v4')
  .transform((value) => value.toLowerCase().trim());

// ============================================================
// User Schema
// ============================================================

/**
 * Zod schema for a user entity.
 * Matches the backend `User.toSafeObject()` output exactly.
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  tenantId: z.string().uuid(),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================
// Login DTO
// ============================================================

/**
 * Zod schema for login credentials.
 * Matches the backend `LoginDto`.
 */
export const LoginCredentialsSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(PASSWORD_RULES.maxLength, 'Password is too long'),
  tenantId: TenantIdSchema,
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

// ============================================================
// Register DTO
// ============================================================

/**
 * Zod schema for user registration.
 * Matches the backend `RegisterDto`.
 *
 * Cross-field validation:
 * - `password` must match `confirmPassword`
 */
export const RegisterPayloadSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    tenantId: TenantIdSchema,
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name is too long')
      .transform((value) => value.trim()),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name is too long')
      .transform((value) => value.trim()),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match password',
    path: ['confirmPassword'],
  });

export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;

// ============================================================
// Refresh Token DTO
// ============================================================

/**
 * Zod schema for token refresh.
 * The refresh token is NOT included here — it lives in an HTTP-only cookie.
 */
export const RefreshTokenPayloadSchema = z.object({
  tenantId: TenantIdSchema.optional(),
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

// ============================================================
// Change Password DTO
// ============================================================

/**
 * Zod schema for password change requests.
 * Includes cross-field validation for password confirmation.
 */
export const ChangePasswordPayloadSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password confirmation does not match new password',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type ChangePasswordPayload = z.infer<typeof ChangePasswordPayloadSchema>;

// ============================================================
// API Response Schemas
// ============================================================

/**
 * Zod schema for successful authentication responses.
 * Matches the backend `AuthResponseDto`.
 */
export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  tokenType: TokenTypeSchema,
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Zod schema for refresh responses.
 * The refresh token itself is in an HTTP-only cookie.
 */
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  tokenType: TokenTypeSchema,
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/**
 * Zod schema for the `/auth/me` endpoint.
 */
export const CurrentUserResponseSchema = z.object({
  user: UserSchema,
});

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;

/**
 * Zod schema for the logout response.
 */
export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

/**
 * Zod schema for the change password response.
 */
export const ChangePasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ChangePasswordResponse = z.infer<
  typeof ChangePasswordResponseSchema
>;

// ============================================================
// Error Schemas
// ============================================================

/**
 * Zod schema for a single validation error field.
 */
export const ValidationErrorFieldSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ValidationErrorField = z.infer<typeof ValidationErrorFieldSchema>;

/**
 * Zod schema for API errors returned by the global exception filter.
 * Matches the backend `ErrorResponse` interface.
 */
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string(),
  timestamp: z.string().datetime(),
  path: z.string(),
  requestId: z.string(),
  errors: z.array(ValidationErrorFieldSchema).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Discriminated union for all authentication-related errors.
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DEACTIVATED'
  | 'EMAIL_ALREADY_EXISTS'
  | 'TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_REVOKED'
  | 'TENANT_MISSING'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_INACTIVE'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for authentication failures.
 * Provides structured error codes for programmatic handling.
 */
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;
  public readonly requestId?: string;
  public readonly validationErrors?: ValidationErrorField[];

  constructor(
    code: AuthErrorCode,
    message: string,
    statusCode: number,
    options?: {
      requestId?: string;
      validationErrors?: ValidationErrorField[];
    },
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = options?.requestId;
    this.validationErrors = options?.validationErrors;

    // Restore prototype chain for `instanceof` to work correctly
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// ============================================================
// Store State Types
// ============================================================

/**
 * Authentication status lifecycle.
 */
export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'refreshing'
  | 'error';

/**
 * Zustand store state for authentication.
 */
export interface AuthState {
  // State
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setStatus: (status: AuthStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  reset: () => void;
}

// ============================================================
// React Query Key Types
// ============================================================

/**
 * Query key factory for React Query.
 * Ensures consistent query keys across the application.
 */
export const authQueryKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authQueryKeys.all, 'me'] as const,
  session: () => [...authQueryKeys.all, 'session'] as const,
} as const;

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard to check if a value is a valid User.
 */
export function isUser(value: unknown): value is User {
  return UserSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid API error.
 */
export function isApiError(value: unknown): value is ApiError {
  return ApiErrorSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is an AuthError.
 */
export function isAuthError(value: unknown): value is AuthError {
  return value instanceof AuthError;
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Field-level errors for a form.
 * Maps field names to error messages.
 */
export type FormFieldErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Result of a form submission.
 */
export type FormSubmissionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: FormFieldErrors<T> };

/**
 * Extract Zod errors into a form-friendly structure.
 */
export function extractFormErrors<T extends z.ZodTypeAny>(
  error: z.ZodError<z.infer<T>>,
): FormFieldErrors<z.infer<T>> {
  const fieldErrors: FormFieldErrors<z.infer<T>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as keyof z.infer<T>;
    if (field !== undefined && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

// ============================================================
// Re-exports for Convenience
// ============================================================

export { z };