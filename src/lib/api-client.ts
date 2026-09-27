/**
 * src/lib/api-client.ts
 * =====================
 * عميل HTTP موحد باستخدام Axios، مع دعم:
 * - JWT Tokens + Automatic Refresh
 * - Single-Flight Refresh (منع طلبات التحديث المتزامنة)
 * - Retry with Exponential Backoff
 * - Error Transformation إلى ApiError
 * - Request ID Tracking للتشخيص
 * - Tenant Header Injection تلقائي
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  API_BASE_URL,
  API_ROUTES,
  QUERY_DEFAULTS,
  ERROR_MESSAGES,
  HEADERS,
} from '../constants';
import type { ApiError } from '../types/api';

// ============================================================
// توسيع AxiosRequestConfig ليشمل skipAuth و skipTenant
// ============================================================

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipTenant?: boolean;
    _retry?: boolean;
  }
}

// ============================================================
// الحالة الداخلية (Internal State)
// ============================================================

let authTokenGetter: () => string | null = () => null;
let refreshTokenGetter: () => Promise<string> = () =>
  Promise.reject(new Error('No refresh token getter set'));
let logoutCallback: () => void = () => {};
let tenantIdGetter: () => string | null = () => null;
let requestIdGenerator: () => string = () =>
  `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

let refreshPromise: Promise<string> | null = null;

// ============================================================
// دوال الإعداد (Setup Functions)
// ============================================================

export function setAuthTokenGetter(getter: () => string | null): void {
  authTokenGetter = getter;
}

export function setRefreshTokenGetter(getter: () => Promise<string>): void {
  refreshTokenGetter = getter;
}

export function setLogoutCallback(cb: () => void): void {
  logoutCallback = cb;
}

export function setTenantIdGetter(getter: () => string | null): void {
  tenantIdGetter = getter;
}

export function setRequestIdGenerator(generator: () => string): void {
  requestIdGenerator = generator;
}

// ============================================================
// إنشاء عميل Axios
// ============================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ============================================================
// Request Interceptor
// ============================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const cfg = config as InternalAxiosRequestConfig & AxiosRequestConfig;

    // 1. Inject Authorization header (JWT)
    if (!cfg.skipAuth) {
      const token = authTokenGetter();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // 2. Inject Tenant ID header (Multi-Tenancy)
    if (!cfg.skipTenant) {
      const tenantId = tenantIdGetter();
      if (tenantId) {
        config.headers.set(HEADERS.tenantId, tenantId);
      }
    }

    // 3. Inject Request ID (Distributed Tracing)
    if (!config.headers.has(HEADERS.requestId)) {
      config.headers.set(HEADERS.requestId, requestIdGenerator());
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ============================================================
// Response Interceptor
// ============================================================

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig &
      AxiosRequestConfig & { _retry?: boolean };

    // 1. Non-401 errors → transform and reject
    if (error.response?.status !== 401 || originalRequest.skipAuth) {
      return Promise.reject(transformError(error));
    }

    // 2. If the failed request is the refresh endpoint itself
    if (originalRequest.url === API_ROUTES.auth.refresh) {
      logoutCallback();
      return Promise.reject(transformError(error));
    }

    // 3. Prevent infinite retry loops
    if (originalRequest._retry) {
      logoutCallback();
      return Promise.reject(transformError(error));
    }

    // 4. Single-Flight Refresh
    if (!refreshPromise) {
      refreshPromise = refreshTokenGetter()
        .then((newToken) => {
          refreshPromise = null;
          return newToken;
        })
        .catch((refreshError: unknown) => {
          refreshPromise = null;
          logoutCallback();
          throw refreshError;
        });
    }

    // 5. Await refresh, then retry the original request
    try {
      await refreshPromise;
      originalRequest._retry = true;
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(transformError(error));
    }
  },
);

// ============================================================
// Error Transformation
// ============================================================

function transformError(error: unknown): ApiError {
  // Already an ApiError
  if (isApiError(error)) {
    return error;
  }

  // Axios error
  if (axios.isAxiosError(error)) {
    const response = error.response;

    // 1. Backend returned structured error
    if (response?.data && typeof response.data === 'object') {
      const data = response.data as Partial<ApiError>;
      if (data.statusCode && data.message) {
        return {
          statusCode: data.statusCode,
          message: data.message,
          error: data.error || 'Unknown Error',
          details: data.details,
        };
      }
    }

    // 2. Network error (no response)
    if (!error.response) {
      return {
        statusCode: 0,
        message: ERROR_MESSAGES.network,
        error: 'NetworkError',
        details: { original: error.message },
      };
    }

    // 3. Fallback
    return {
      statusCode: error.response.status || 500,
      message: error.message || ERROR_MESSAGES.generic,
      error: error.code || 'UnknownError',
    };
  }

  // Unknown error type
  return {
    statusCode: 500,
    message: ERROR_MESSAGES.generic,
    error: 'UnknownError',
    details: { original: String(error) },
  };
}

// ============================================================
// Retry Helpers
// ============================================================

function shouldRetry(error: AxiosError): boolean {
  if (!error) return false;
  const { response } = error;
  if (!response) return true; // Network errors
  const status = response.status;
  return (status >= 500 && status !== 501) || status === 429 || status === 408;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Core Request Function
// ============================================================

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  let lastError: unknown;
  let attempts = 0;
  const maxRetries = QUERY_DEFAULTS.retryCount;

  while (attempts <= maxRetries) {
    try {
      const response = await apiClient.request<T>(config);
      // Response interceptor already unwraps .data
      return response as unknown as T;
    } catch (error) {
      lastError = error;

      if (!axios.isAxiosError(error) || !shouldRetry(error)) {
        break;
      }

      if (attempts === maxRetries) {
        break;
      }

      // Exponential backoff: 100ms, 200ms, 400ms, ...
      const delay = 100 * Math.pow(2, attempts);
      await sleep(delay);
      attempts++;
    }
  }

  throw transformError(lastError);
}

// ============================================================
// HTTP Method Helpers
// ============================================================

export function get<T>(
  url: string,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>,
): Promise<T> {
  return request<T>({ ...config, method: 'GET', url });
}

export function post<T, D = unknown>(
  url: string,
  data?: D,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>,
): Promise<T> {
  return request<T>({ ...config, method: 'POST', url, data });
}

export function put<T, D = unknown>(
  url: string,
  data?: D,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>,
): Promise<T> {
  return request<T>({ ...config, method: 'PUT', url, data });
}

export function patch<T, D = unknown>(
  url: string,
  data?: D,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>,
): Promise<T> {
  return request<T>({ ...config, method: 'PATCH', url, data });
}

export function del<T>(
  url: string,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>,
): Promise<T> {
  return request<T>({ ...config, method: 'DELETE', url });
}

// ============================================================
// Type Guard
// ============================================================

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number' &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

// ============================================================
// Exports
// ============================================================

export { apiClient };
export default apiClient;