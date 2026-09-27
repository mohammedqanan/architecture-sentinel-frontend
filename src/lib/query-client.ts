/**
 * src/lib/query-client.ts
 * ════════════════════════════════════════════════════════════
 * Singleton TanStack Query v5 client for the entire application.
 *
 * Architecture Decisions:
 *   • SSR-safe: fresh client per request on server, singleton on browser.
 *   • Vite-native env detection (`import.meta.env.DEV`), NOT `process.env`.
 *   • Smart retry: respects HTTP semantics (no retry on 4xx).
 *   • Centralised query-key factory for cache invalidation consistency.
 *
 * @module lib/query-client
 */

import {
  QueryClient,
  type QueryClientConfig,
} from '@tanstack/react-query';

import { QUERY_DEFAULTS } from '@/constants';
import { isApiError } from '@/lib/api-client';

// ════════════════════════════════════════════════════════════
// 1. Vite-native environment detection
// ════════════════════════════════════════════════════════════

/**
 * 🎯 WHY `import.meta.env.DEV` (not `process.env.NODE_ENV`):
 *   Vite replaces `import.meta.env.DEV` at build time with a literal
 *   boolean. `process` is NOT defined in the browser by default and
 *   requires the `vite-plugin-node-polyfills` polyfill — which we
 *   don't want for a single check.
 */
const IS_DEV: boolean = import.meta.env.DEV;

// ════════════════════════════════════════════════════════════
// 2. Smart retry policy
// ════════════════════════════════════════════════════════════

/**
 * 🎯 Decides whether a failed query should be retried.
 *
 * Rules:
 *   • 4xx client errors (400, 401, 403, 404, 422) → NO retry.
 *   • 5xx / network errors → up to `retryCount` retries.
 *   • Non-ApiError unknowns → up to `retryCount` retries.
 */
function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (isApiError(error)) {
    const status = error.statusCode ?? 0;
    if (status >= 400 && status < 500) return false;
  }
  return failureCount < QUERY_DEFAULTS.retryCount;
}

// ════════════════════════════════════════════════════════════
// 3. Default configuration
// ════════════════════════════════════════════════════════════

const defaultConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: QUERY_DEFAULTS.staleTime,
      gcTime: QUERY_DEFAULTS.gcTime,
      retry: shouldRetryQuery,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: QUERY_DEFAULTS.refetchOnWindowFocus,
      refetchOnMount: true,
      refetchOnReconnect: true,
      throwOnError: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
      throwOnError: false,
      onError: (error: unknown) => {
        if (!IS_DEV) return;
        // eslint-disable-next-line no-console
        console.error('[Mutation Error]', error);
        if (isApiError(error)) {
          // eslint-disable-next-line no-console
          console.error(`[API Error ${error.statusCode}]`, error.message);
        }
      },
    },
  },
};

// ════════════════════════════════════════════════════════════
// 4. Singleton / SSR management
// ════════════════════════════════════════════════════════════

let browserQueryClient: QueryClient | undefined;

function makeQueryClient(): QueryClient {
  return new QueryClient(defaultConfig);
}

/**
 * 🎯 Returns a QueryClient instance.
 *   • Server → fresh client per call (prevents cross-request leakage).
 *   • Browser → shared singleton across the app.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// ════════════════════════════════════════════════════════════
// 5. Query Key Factory
// ════════════════════════════════════════════════════════════

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.projects.lists(), params] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.projects.details(), id] as const,
  },
  analyses: {
    all: ['analyses'] as const,
    lists: () => [...queryKeys.analyses.all, 'list'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.analyses.lists(), params] as const,
    details: () => [...queryKeys.analyses.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.analyses.details(), id] as const,
    hitl: (analysisId: string) =>
      [...queryKeys.analyses.detail(analysisId), 'hitl'] as const,
    rag: (analysisId: string) =>
      [...queryKeys.analyses.detail(analysisId), 'rag'] as const,
  },
} as const;