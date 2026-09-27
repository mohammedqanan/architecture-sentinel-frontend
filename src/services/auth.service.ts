/**
 * src/services/auth.service.ts
 * ════════════════════════════════════════════════════════════
 *
 * 📦 Authentication Service — ArchitectureSentinel v2.2
 *
 * Service طبقة يُنسّق بين:
 *   • @/lib/api-client      — HTTP client
 *   • @/stores/auth-store   — Zustand state
 *   • Backend (NestJS)      — Auth endpoints
 *
 * ✅ يُهيّئ api-client عبر `initAuthService()` عند bootstrap التطبيق:
 *      • setAuthTokenGetter
 *      • setRefreshTokenGetter
 *      • setLogoutCallback
 *      • setTenantIdGetter   ← 🆕 (v2.2)
 *
 * @module auth.service
 */

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  apiClient,
  setAuthTokenGetter,
  setRefreshTokenGetter,
  setLogoutCallback,
  setTenantIdGetter,
  isApiError,
  post,
  get,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  API_BASE_URL,
  API_ROUTES,
  DEFAULT_TENANT_ID,
  ERROR_MESSAGES,
  HEADERS,
  STORAGE_KEYS,
  IS_DEV,
} from '@/constants';
import type {
  PostLoginRequest,
  PostLoginResponse,
  PostRegisterRequest,
  PostRegisterResponse,
  PostRefreshRequest,
  PostRefreshResponse,
  GetMeResponse,
  PostChangePasswordRequest,
  PostChangePasswordResponse,
  PostLogoutResponse,
  SanitizedUser,
  ApiError,
  ValidationErrorField,
} from '@/types';

// ════════════════════════════════════════════════════════════
// 1. Constants
// ════════════════════════════════════════════════════════════

/** مفتاح BroadcastChannel للـ multi-tab sync */
const AUTH_CHANNEL_NAME = 'archsentinel:auth';

// ════════════════════════════════════════════════════════════
// 2. Tenant ID Helpers (sessionStorage)
// ════════════════════════════════════════════════════════════

function getStoredTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEYS.tenantId);
  } catch {
    return null;
  }
}

function setStoredTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.tenantId, tenantId);
  } catch {
    /* ignore quota errors */
  }
}

function clearStoredTenantId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.tenantId);
  } catch {
    /* ignore */
  }
}

// ════════════════════════════════════════════════════════════
// 3. Single-Flight Refresh Manager
// ════════════════════════════════════════════════════════════

class RefreshManager {
  private readonly inflight = new Map<string, Promise<string>>();

  async execute(key: string, factory: () => Promise<string>): Promise<string> {
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = factory().finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }

  isRefreshing(key: string): boolean {
    return this.inflight.has(key);
  }

  clear(): void {
    this.inflight.clear();
  }
}

export const refreshManager = new RefreshManager();

// ════════════════════════════════════════════════════════════
// 4. Request Queue
// ════════════════════════════════════════════════════════════

interface QueuedRequest {
  config: InternalAxiosRequestConfig;
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];

  enqueue(request: QueuedRequest): void {
    this.queue.push(request);
  }

  flush(newToken: string): void {
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach(({ config, resolve }) => {
      config.headers.Authorization = `Bearer ${newToken}`;
      resolve(newToken);
    });
  }

  rejectAll(error: unknown): void {
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach(({ reject }) => reject(error));
  }

  get size(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();

// ════════════════════════════════════════════════════════════
// 5. Multi-Tab Synchronization
// ════════════════════════════════════════════════════════════

let authChannel: BroadcastChannel | null = null;

function initMultiTabSync(): void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  if (authChannel) return;

  authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);

  authChannel.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string } | undefined;

    if (data?.type === 'LOGOUT') {
      useAuthStore.getState().clearAuth();
      refreshManager.clear();
      requestQueue.rejectAll(new Error('Logged out from another tab'));
      clearStoredTenantId();
    }

    if (data?.type === 'LOGIN') {
      void getCurrentUser().catch(() => {
        /* ignore */
      });
    }
  });
}

function broadcastAuthEvent(type: 'LOGOUT' | 'LOGIN'): void {
  authChannel?.postMessage({ type });
}

// ════════════════════════════════════════════════════════════
// 6. Error Conversion
// ════════════════════════════════════════════════════════════

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const status = axiosError.response?.status ?? 0;
    const data = axiosError.response?.data;

    if (data && typeof data === 'object' && 'statusCode' in data) {
      return {
        statusCode: data.statusCode ?? status,
        message: data.message ?? extractAxiosMessage(axiosError),
        error: data.error ?? 'RequestFailed',
        details: data.details,
        requestId: data.requestId,
        errors: data.errors,
      };
    }

    return {
      statusCode: status,
      message: extractAxiosMessage(axiosError),
      error: axiosError.code ?? 'RequestFailed',
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 0,
      message: error.message,
      error: 'UnknownError',
    };
  }

  return {
    statusCode: 0,
    message: ERROR_MESSAGES.generic,
    error: 'UnknownError',
    details: { original: String(error) },
  };
}

function extractAxiosMessage(error: AxiosError<ApiError>): string {
  const backendMessage = error.response?.data?.message;
  if (backendMessage) return backendMessage;

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  if (!error.response) {
    return ERROR_MESSAGES.network;
  }

  switch (error.response.status) {
    case 400:
      return 'Invalid request data.';
    case 401:
      return ERROR_MESSAGES.invalidCredentials;
    case 403:
      return ERROR_MESSAGES.forbidden;
    case 404:
      return ERROR_MESSAGES.notFound;
    case 409:
      return ERROR_MESSAGES.emailExists;
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again later.';
    default:
      return ERROR_MESSAGES.generic;
  }
}

// ════════════════════════════════════════════════════════════
// 7. Internal Helpers
// ════════════════════════════════════════════════════════════

async function performTokenRefresh(
  refreshToken: string | null,
): Promise<string> {
  const tenantId = getStoredTenantId() ?? DEFAULT_TENANT_ID;

  try {
    const body: PostRefreshRequest | Record<string, never> = refreshToken
      ? { refreshToken }
      : {};

    const response = await axios.post<PostRefreshResponse>(
      `${API_BASE_URL}${API_ROUTES.auth.refresh}`,
      body,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          [HEADERS.tenantId]: tenantId,
        },
        timeout: 15_000,
      },
    );

    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = response.data;

    useAuthStore.getState().setTokens({
      accessToken,
      refreshToken: newRefreshToken ?? refreshToken ?? '',
      expiresIn: expiresIn ?? 900,
    });

    return accessToken;
  } catch (error) {
    requestQueue.rejectAll(error);
    throw toApiError(error);
  }
}

function handleAuthFailure(): void {
  refreshManager.clear();
  requestQueue.rejectAll(new Error('Authentication failed'));
  clearStoredTenantId();
  useAuthStore.getState().clearAuth();
  broadcastAuthEvent('LOGOUT');
}

// ════════════════════════════════════════════════════════════
// 8. Service Initialization
// ════════════════════════════════════════════════════════════

/**
 * 🎯 Initializes the api-client with getters sourced from the auth store.
 *
 * ⚠️ MUST be called ONCE at application startup (see `main.tsx`),
 *    BEFORE any authenticated request is dispatched.
 *
 * Wires:
 *   1. Auth token getter      → Authorization: Bearer header
 *   2. Refresh token getter   → Single-flight refresh on 401
 *   3. Logout callback        → Hard 401 handling
 *   4. Tenant ID getter       → X-Tenant-Id header
 *   5. Multi-tab sync         → BroadcastChannel subscription
 */
export function initAuthService(): void {
  // ✅ 1. Access token getter
  setAuthTokenGetter(() => {
    const state = useAuthStore.getState();
    return state.accessToken ?? null;
  });

  // ✅ 2. Refresh token getter — Single-Flight pattern
  setRefreshTokenGetter(async () => {
    const state = useAuthStore.getState();
    const tenantId = getStoredTenantId() ?? DEFAULT_TENANT_ID;

    return refreshManager.execute(tenantId, () =>
      performTokenRefresh(state.refreshToken),
    );
  });

  // ✅ 3. Logout callback — best-effort server notification
  setLogoutCallback(() => {
    post(API_ROUTES.auth.logout, {}, { skipAuth: true }).catch(() => {
      /* best-effort */
    });
    handleAuthFailure();
  });

  // ✅ 4. Tenant ID getter — injects X-Tenant-Id header
  setTenantIdGetter(() => {
    const state = useAuthStore.getState();
    return state.tenantId ?? getStoredTenantId() ?? DEFAULT_TENANT_ID;
  });

  // ✅ 5. Multi-tab sync
  initMultiTabSync();
}

// ════════════════════════════════════════════════════════════
// 9. Public Service Object
// ════════════════════════════════════════════════════════════

export const authService = {
  // ──────── Login ────────
  async login(credentials: PostLoginRequest): Promise<PostLoginResponse> {
    const { setTokens, setUser } = useAuthStore.getState();
    const tenantId = getStoredTenantId() ?? DEFAULT_TENANT_ID;

    try {
      const response = await post<PostLoginResponse>(
        API_ROUTES.auth.login,
        {
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        },
        {
          skipAuth: true,
          headers: {
            [HEADERS.tenantId]: tenantId,
          },
        },
      );

      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      });
      setUser(response.user);
      setStoredTenantId(tenantId);

      broadcastAuthEvent('LOGIN');

      return response;
    } catch (error) {
      const apiError = toApiError(error);
      handleAuthFailure();
      throw apiError;
    }
  },

  // ──────── Register ────────
  async register(data: PostRegisterRequest): Promise<PostRegisterResponse> {
    const { setTokens, setUser } = useAuthStore.getState();

    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      throw {
        statusCode: 400,
        message: 'First name and last name are required.',
        error: 'ValidationError',
      } as ApiError;
    }
    if (data.password !== data.confirmPassword) {
      throw {
        statusCode: 400,
        message: 'Passwords do not match.',
        error: 'ValidationError',
      } as ApiError;
    }

    const tenantId = (data.tenantId || DEFAULT_TENANT_ID).trim();

    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        confirmPassword: data.confirmPassword,
        tenantId,
      };

      const response = await post<PostRegisterResponse>(
        API_ROUTES.auth.register,
        payload,
        {
          skipAuth: true,
          headers: {
            [HEADERS.tenantId]: tenantId,
          },
        },
      );

      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      });
      setUser(response.user);
      setStoredTenantId(tenantId);

      broadcastAuthEvent('LOGIN');

      return response;
    } catch (error) {
      const apiError = toApiError(error);
      handleAuthFailure();
      throw apiError;
    }
  },

  // ──────── Refresh ────────
  async refresh(): Promise<PostRefreshResponse> {
    const state = useAuthStore.getState();
    const tenantId = getStoredTenantId() ?? DEFAULT_TENANT_ID;

    try {
      const token = await refreshManager.execute(tenantId, () =>
        performTokenRefresh(state.refreshToken),
      );

      return {
        accessToken: token,
        expiresIn: 900,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  // ──────── Logout ────────
  async logout(): Promise<void> {
    try {
      await post<PostLogoutResponse>(
        API_ROUTES.auth.logout,
        {},
        { skipAuth: true },
      );
    } catch (error) {
      if (IS_DEV) {
        console.warn(
          '[auth.service] Logout request failed:',
          toApiError(error).message,
        );
      }
    } finally {
      handleAuthFailure();
    }
  },

  // ──────── Get Current User ────────
  async getCurrentUser(): Promise<SanitizedUser> {
    const { setUser } = useAuthStore.getState();

    try {
      const response = await get<GetMeResponse>(API_ROUTES.auth.me);
      setUser(response.user);
      return response.user;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.statusCode === 401) {
        handleAuthFailure();
      }
      throw apiError;
    }
  },

  async getMe(): Promise<SanitizedUser> {
    return this.getCurrentUser();
  },

  // ──────── Change Password ────────
  async changePassword(
    data: PostChangePasswordRequest,
  ): Promise<PostChangePasswordResponse> {
    if (data.newPassword !== data.confirmPassword) {
      throw {
        statusCode: 400,
        message: 'New passwords do not match.',
        error: 'ValidationError',
      } as ApiError;
    }

    try {
      const response = await post<PostChangePasswordResponse>(
        API_ROUTES.auth.changePassword,
        {
          oldPassword: data.oldPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        },
      );

      handleAuthFailure();

      return response;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // ──────── Synchronous Getters ────────
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  getCurrentUserSync(): SanitizedUser | null {
    return useAuthStore.getState().user;
  },

  getAccessTokenSync(): string | null {
    return useAuthStore.getState().accessToken;
  },
} as const;

// ════════════════════════════════════════════════════════════
// 10. Standalone Named Exports
// ════════════════════════════════════════════════════════════

export async function login(
  credentials: PostLoginRequest,
): Promise<PostLoginResponse> {
  return authService.login(credentials);
}

export async function register(
  data: PostRegisterRequest,
): Promise<PostRegisterResponse> {
  return authService.register(data);
}

export async function logout(): Promise<void> {
  return authService.logout();
}

export async function refreshToken(): Promise<PostRefreshResponse> {
  return authService.refresh();
}

export async function refreshAccessToken(): Promise<string> {
  const result = await authService.refresh();
  return result.accessToken;
}

export async function getCurrentUser(): Promise<SanitizedUser> {
  return authService.getCurrentUser();
}

export async function getMe(): Promise<SanitizedUser> {
  return authService.getMe();
}

export async function changePassword(
  data: PostChangePasswordRequest,
): Promise<PostChangePasswordResponse> {
  return authService.changePassword(data);
}

export function isAuthenticated(): boolean {
  return authService.isAuthenticated();
}

export function getCurrentUserSync(): SanitizedUser | null {
  return authService.getCurrentUserSync();
}

// ════════════════════════════════════════════════════════════
// 11. Additional Exports
// ════════════════════════════════════════════════════════════

export { apiClient };
export type { ValidationErrorField };

export default authService;