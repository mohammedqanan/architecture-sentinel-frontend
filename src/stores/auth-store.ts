/**
 * src/stores/auth-store.ts
 * ========================
 * Enterprise-grade Zustand store for authentication state management.
 *
 * Handles:
 *   - User identity
 *   - JWT tokens (access + refresh)
 *   - Tenant ID (multi-tenancy support)
 *   - Session lifecycle (login, refresh, logout)
 *   - Persistence to localStorage
 *
 * @module AuthStore
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

// Export type alias to maintain API compatibility across the codebase
export type SanitizedUser = User;

// ============================================================
// State & Actions Contracts
// ============================================================

export interface AuthStateValues {
  /** Authenticated user entity excluding sensitive security attributes */
  user: SanitizedUser | null;

  /** JWT bearer access token for API authorization */
  accessToken: string | null;

  /** Refresh token for acquiring new access tokens */
  refreshToken: string | null;

  /** Time-to-live threshold for the access token in seconds */
  expiresIn: number | null;

  /**
   * Tenant ID for multi-tenancy isolation.
   * ⚠️ CRITICAL: Sent with every API request as `X-Tenant-Id` header.
   * Extracted from `user.tenantId` on login, or set manually.
   */
  tenantId: string | null;

  /** Global loading state during authentication transactions */
  isLoading: boolean;

  /** Computed authentication status */
  isAuthenticated: boolean;

  /** Human-readable error message for failure modes */
  error: string | null;

  /** Flag indicating whether state has hydrated from persistent storage */
  isHydrated: boolean;
}

export interface AuthActions {
  /** Updates the active user profile and re-evaluates session validity */
  setUser: (user: SanitizedUser | null) => void;

  /** Stores new token pairs and sets authenticated state */
  setTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) => void;

  /** Sets the tenant ID explicitly */
  setTenantId: (tenantId: string | null) => void;

  /** Purges session state, clears storage, and unauthenticates user */
  clearAuth: () => void;

  /** Sets runtime error state */
  setError: (error: string | null) => void;

  /** Toggles global loading flag */
  setLoading: (loading: boolean) => void;

  /** Sets internal hydration status */
  setHydrated: (hydrated: boolean) => void;
}

export type AuthStore = AuthStateValues & AuthActions;

// ============================================================
// Initial State
// ============================================================

const initialState: AuthStateValues = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
  tenantId: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  isHydrated: false,
};

// ============================================================
// Store Implementation
// ============================================================

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // ----------------------------------------------------------
        // setUser
        // ----------------------------------------------------------
        setUser: (user) => {
          set(
            (state) => ({
              user,
              tenantId: user?.tenantId ?? state.tenantId,
              isAuthenticated: Boolean(user && state.accessToken),
              error: null,
            }),
            false,
            'auth/setUser',
          );
        },

        // ----------------------------------------------------------
        // setTokens
        // ----------------------------------------------------------
        setTokens: ({ accessToken, refreshToken, expiresIn }) => {
          set(
            (state) => ({
              accessToken,
              refreshToken,
              expiresIn,
              isAuthenticated: Boolean(state.user || accessToken),
              error: null,
            }),
            false,
            'auth/setTokens',
          );
        },

        // ----------------------------------------------------------
        // setTenantId
        // ----------------------------------------------------------
        setTenantId: (tenantId) => {
          set({ tenantId }, false, 'auth/setTenantId');
        },

        // ----------------------------------------------------------
        // clearAuth
        // ----------------------------------------------------------
        clearAuth: () => {
          set(
            {
              ...initialState,
              isHydrated: true,
            },
            false,
            'auth/clearAuth',
          );
        },

        // ----------------------------------------------------------
        // setError
        // ----------------------------------------------------------
        setError: (error) => {
          set({ error }, false, 'auth/setError');
        },

        // ----------------------------------------------------------
        // setLoading
        // ----------------------------------------------------------
        setLoading: (isLoading) => {
          set({ isLoading }, false, 'auth/setLoading');
        },

        // ----------------------------------------------------------
        // setHydrated
        // ----------------------------------------------------------
        setHydrated: (isHydrated) => {
          set({ isHydrated }, false, 'auth/setHydrated');
        },
      }),
      {
        // ----------------------------------------
        // Persistence Configuration
        // ----------------------------------------
        name: 'archsentinel_auth_state',

        storage: createJSONStorage(() =>
          typeof window !== 'undefined'
            ? window.localStorage
            : {
                getItem: () => null,
                setItem: () => null,
                removeItem: () => null,
              },
        ),

        // Only persist these fields
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          expiresIn: state.expiresIn,
          user: state.user,
          tenantId: state.tenantId,
        }),

        // ----------------------------------------
        // Rehydration Callback
        // ----------------------------------------
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isAuthenticated = Boolean(state.user && state.accessToken);

            if (!state.tenantId && state.user?.tenantId) {
              state.tenantId = state.user.tenantId;
            }

            state.setHydrated(true);
          }
        },
      },
    ),
    {
      name: 'AuthStore',
      // ✅ FIXED: Use import.meta.env for Vite instead of process.env
      enabled: import.meta.env.MODE !== 'production',
    },
  ),
);

// ============================================================
// Selectors (Optimization Helpers)
// ============================================================

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectAccessToken = (state: AuthStore) => state.accessToken;
export const selectAuthLoading = (state: AuthStore) => state.isLoading;
export const selectTenantId = (state: AuthStore) => state.tenantId;
export const selectRefreshToken = (state: AuthStore) => state.refreshToken;