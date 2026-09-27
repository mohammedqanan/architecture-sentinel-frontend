'use client';

/**
 * src/hooks/use-auth.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 useAuth Hook — ArchitectureSentinel v2.1
 *
 * واجهة عالية المستوى للمصادقة تُدمج:
 *   • State من `@/stores/auth-store`      — user, tokens
 *   • Actions من `@/services/auth.service` — login/register/logout
 *   • Local UI state                      — isLoading, error
 *
 * ✅ يحل مشاكل الإصدارات السابقة:
 *   • ✅ stale closure في `withLoading`      → useRef-based concurrency guard
 *   • ✅ `instanceof Error` على ApiError     → isApiError type guard
 *   • ✅ hydration مع [] + eslint-disable     → isMountedRef + hasHydratedRef
 *   • ✅ خلط hydration و action loading       → state منفصل
 *   • ✅ عدم وجود clearError                 → مضاف
 *   • ✅ عدم وجود changePassword             → مضاف
 *   • ✅ عدم وجود isHydrating                → مضاف
 *   • ✅ StrictMode double-mount              → guard بـ ref
 *   • ✅ `refreshTokenValue` غير مُستخدم       → محذوف (v2.1)
 *
 * 🔒 ملاحظة أمنية:
 *   الـ `refreshToken` يبقى داخل `auth-store` + `auth.service` فقط.
 *   لا يُكشَف في return value للـ hook — تطبيقاً لمبدأ Least Privilege.
 *   الـ access token وحده كافٍ للطلبات.
 *
 * ✅ يلتزم بـ:
 *   • Rules of Hooks كاملة
 *   • Type Safety (لا any)
 *   • Separation of Concerns
 *
 * @module use-auth
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';

import { useAuthStore } from '@/stores/auth-store';
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  refreshToken as refreshTokenService,
  getMe as getMeService,
  changePassword as changePasswordService,
} from '@/services/auth.service';
import { isApiError } from '@/lib/api-client';
import { ERROR_MESSAGES } from '@/constants';
import type {
  SanitizedUser,
  PostLoginRequest,
  PostLoginResponse,
  PostRegisterRequest,
  PostRegisterResponse,
  PostRefreshResponse,
  PostChangePasswordRequest,
  PostChangePasswordResponse,
  ApiError,
} from '@/types';

// ════════════════════════════════════════════════════════════
// 1. Return Type Interface
// ════════════════════════════════════════════════════════════

export interface UseAuthReturn {
  // ───── State ─────
  /** المستخدم الحالي (null إذا لم يكن مسجلاً) */
  user: SanitizedUser | null;
  /** Access token الحالي */
  accessToken: string | null;
  /** هل المستخدم مسجل دخول؟ */
  isAuthenticated: boolean;
  /** هل هناك عملية auth جارية؟ (login/register/logout/changePassword) */
  isLoading: boolean;
  /** هل hydration الجلسة الأولية جارية؟ (يُستخدم لـ splash screen) */
  isHydrating: boolean;
  /** رسالة الخطأ الأخيرة (null إذا لا يوجد) */
  error: string | null;
  /** تفاصيل الخطأ الأخير (statusCode, errors[]) */
  errorDetails: ApiError | null;

  // ───── Actions ─────
  login: (credentials: PostLoginRequest) => Promise<PostLoginResponse>;
  register: (data: PostRegisterRequest) => Promise<PostRegisterResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<PostRefreshResponse>;
  getMe: () => Promise<SanitizedUser | null>;
  changePassword: (
    data: PostChangePasswordRequest
  ) => Promise<PostChangePasswordResponse>;

  // ───── Utilities ─────
  /** مسح رسالة الخطأ */
  clearError: () => void;
  /** إعادة محاولة hydration (للاستخدام بعد فشل مؤقت) */
  retryHydration: () => Promise<void>;
}

// ════════════════════════════════════════════════════════════
// 2. Internal Helpers — Error Extraction
// ════════════════════════════════════════════════════════════

/**
 * 🎯 استخراج رسالة خطأ من أي `unknown` throw.
 *
 * ⚠️ الأولوية:
 *   1. `ApiError` — أخطاء الـ Backend المُوحَّدة
 *   2. `Error` — أخطاء JavaScript القياسية
 *   3. `string` — قيم نصية مباشرة
 *   4. fallback — رسالة عامة
 */
function extractErrorMessage(err: unknown): string {
  // ✅ ApiError (plain object, not instanceof Error)
  if (isApiError(err)) {
    return err.message || ERROR_MESSAGES.generic;
  }

  // ✅ Error
  if (err instanceof Error) {
    return err.message || ERROR_MESSAGES.generic;
  }

  // ✅ String
  if (typeof err === 'string') {
    return err;
  }

  // ✅ Fallback
  return ERROR_MESSAGES.generic;
}

/**
 * 🎯 استخراج تفاصيل الخطأ كـ ApiError كامل.
 *
 * يُستخدم في `errorDetails` state ليعرض المستهلك أخطاء الحقول
 * (field-level validation errors) من الـ Backend.
 */
function extractErrorDetails(err: unknown): ApiError | null {
  if (isApiError(err)) {
    return err;
  }

  if (err instanceof Error) {
    return {
      statusCode: 0,
      message: err.message,
      error: 'UnknownError',
    };
  }

  return null;
}

// ════════════════════════════════════════════════════════════
// 3. Hook Implementation
// ════════════════════════════════════════════════════════════

export function useAuth(): UseAuthReturn {
  // ════════════════════════════════════════════════════════════
  // Store State (selectors)
  // ════════════════════════════════════════════════════════════

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // ════════════════════════════════════════════════════════════
  // Local UI State
  // ════════════════════════════════════════════════════════════

  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiError | null>(null);

  // ════════════════════════════════════════════════════════════
  // Refs for Concurrency & Mount Safety
  // ════════════════════════════════════════════════════════════

  /** 🎯 يمنع setState على component غير مُثبَّت */
  const isMountedRef = useRef(true);

  /** 🎯 يمنع double hydration في StrictMode */
  const hasHydratedRef = useRef(false);

  /** 🎯 concurrency guard — ref-based, دائماً محدّث */
  const isOperationInFlightRef = useRef(false);

  // ───── Mount tracking ─────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ════════════════════════════════════════════════════════════
  // Error Setters
  // ════════════════════════════════════════════════════════════

  const setErrorWithDetails = useCallback((err: unknown) => {
    if (!isMountedRef.current) return;
    setError(extractErrorMessage(err));
    setErrorDetails(extractErrorDetails(err));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorDetails(null);
  }, []);

  // ════════════════════════════════════════════════════════════
  // Generic Async Wrapper
  // ════════════════════════════════════════════════════════════

  /**
   * 🎯 يُغلّف عملية async بـ:
   *   • concurrency guard (ref-based, ليس state-based)
   *   • error extraction (ApiError أو Error)
   *   • mounted safety
   *
   * ⚠️ يستخدم `isOperationInFlightRef` بدلاً من `isLoading` لتجنب
   *    stale closure — `isLoading` داخل deps كان يعيد إنشاء الدالة.
   */
  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      // ✅ concurrency guard — ref-based, دائماً محدّث
      if (isOperationInFlightRef.current) {
        throw new Error(
          'An authentication operation is already in progress.'
        );
      }

      isOperationInFlightRef.current = true;

      if (isMountedRef.current) {
        setError(null);
        setErrorDetails(null);
        setIsLoading(true);
      }

      try {
        return await operation();
      } catch (err) {
        setErrorWithDetails(err);
        throw err;
      } finally {
        isOperationInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [setErrorWithDetails]
  );

  // ════════════════════════════════════════════════════════════
  // Session Hydration (mount only, StrictMode-safe)
  // ════════════════════════════════════════════════════════════

  const hydrateSession = useCallback(async (): Promise<void> => {
    // ✅ إذا لا token → لا حاجة للـ hydration
    if (!accessToken) return;

    // ✅ إذا لدينا user بالفعل → لا حاجة للـ hydration
    if (user) return;

    // ✅ يمنع double hydration في StrictMode
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    setIsHydrating(true);

    try {
      const userData = await getMeService();
      if (isMountedRef.current && userData) {
        setUser(userData);
      }
    } catch {
      // ✅ silent failure — token منتهي أو غير صالح
      if (isMountedRef.current) {
        clearAuth();
      }
    } finally {
      if (isMountedRef.current) {
        setIsHydrating(false);
      }
    }
  }, [accessToken, user, setUser, clearAuth]);

  useEffect(() => {
    void hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← mount-only: نستخدم hasHydratedRef لمنع التكرار

  const retryHydration = useCallback(async (): Promise<void> => {
    hasHydratedRef.current = false;
    await hydrateSession();
  }, [hydrateSession]);

  // ════════════════════════════════════════════════════════════
  // Actions
  // ════════════════════════════════════════════════════════════

  const login = useCallback(
    (credentials: PostLoginRequest): Promise<PostLoginResponse> => {
      return withLoading(() => loginService(credentials));
    },
    [withLoading]
  );

  const register = useCallback(
    (data: PostRegisterRequest): Promise<PostRegisterResponse> => {
      // ✅ pre-flight validation
      if (!data.firstName?.trim() || !data.lastName?.trim()) {
        const err: ApiError = {
          statusCode: 400,
          message: 'First name and last name are required.',
          error: 'ValidationError',
        };
        setErrorWithDetails(err);
        return Promise.reject(err);
      }

      if (data.password !== data.confirmPassword) {
        const err: ApiError = {
          statusCode: 400,
          message: 'Passwords do not match.',
          error: 'ValidationError',
        };
        setErrorWithDetails(err);
        return Promise.reject(err);
      }

      return withLoading(() => registerService(data));
    },
    [withLoading, setErrorWithDetails]
  );

  const logout = useCallback(async (): Promise<void> => {
    // ✅ concurrency guard
    if (isOperationInFlightRef.current) return;
    isOperationInFlightRef.current = true;

    if (isMountedRef.current) {
      setError(null);
      setErrorDetails(null);
      setIsLoading(true);
    }

    try {
      await logoutService();
      // ✅ service يُنظّف الـ store تلقائياً، لكن للأمان:
      clearAuth();
    } catch (err) {
      setErrorWithDetails(err);
      // ✅ دائماً نظّف الحالة المحلية
      clearAuth();
      throw err;
    } finally {
      isOperationInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [clearAuth, setErrorWithDetails]);

  const refreshToken = useCallback(
    (): Promise<PostRefreshResponse> => {
      return withLoading(() => refreshTokenService());
    },
    [withLoading]
  );

  const getMe = useCallback(async (): Promise<SanitizedUser | null> => {
    return withLoading(async () => {
      try {
        const userData = await getMeService();
        if (isMountedRef.current && userData) {
          setUser(userData);
        }
        return userData;
      } catch (err) {
        // ✅ إذا كان 401 → امسح الحالة
        if (isApiError(err) && err.statusCode === 401) {
          clearAuth();
        }
        throw err;
      }
    });
  }, [withLoading, setUser, clearAuth]);

  const changePassword = useCallback(
    (
      data: PostChangePasswordRequest
    ): Promise<PostChangePasswordResponse> => {
      return withLoading(() => changePasswordService(data));
    },
    [withLoading]
  );

  // ════════════════════════════════════════════════════════════
  // Memoized Return Object
  // ════════════════════════════════════════════════════════════

  return useMemo<UseAuthReturn>(
    () => ({
      // State
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      isHydrating,
      error,
      errorDetails,

      // Actions
      login,
      register,
      logout,
      refreshToken,
      getMe,
      changePassword,

      // Utilities
      clearError,
      retryHydration,
    }),
    [
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      isHydrating,
      error,
      errorDetails,
      login,
      register,
      logout,
      refreshToken,
      getMe,
      changePassword,
      clearError,
      retryHydration,
    ]
  );
}