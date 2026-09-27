/**
 * ArchitectureSentinel - Vite Entry Point
 * ════════════════════════════════════════════════════════════
 * Mounts the application into #root with strict provider ordering.
 *
 * Provider order (OUTER → INNER):
 *   1. React.StrictMode       — dev-time correctness checks
 *   2. QueryClientProvider    — server-state (TanStack Query)
 *   3. BrowserRouter          — client-side routing
 *   4. App                    — route tree
 *
 * 🎯 CRITICAL: `initAuthService()` MUST run BEFORE rendering.
 *    It wires the api-client to the auth-store so that every outgoing
 *    request carries `Authorization: Bearer <token>` and `X-Tenant-Id`.
 *    Without this call, all protected requests return 401 (No auth token).
 *
 * @module main
 * @version 3.2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { getQueryClient } from './lib/query-client';
import { initAuthService } from './services/auth.service';

import './index.css';

// ════════════════════════════════════════════════════════════
// 1. Root DOM Node Guard
// ════════════════════════════════════════════════════════════

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    '[ArchitectureSentinel Fatal]: Root container #root not found in index.html. ' +
      'Ensure your index.html contains <div id="root"></div>.',
  );
}

// ════════════════════════════════════════════════════════════
// 2. Query Client (SSR-safe singleton)
// ════════════════════════════════════════════════════════════

const queryClient = getQueryClient();

// ════════════════════════════════════════════════════════════
// 3. Auth Service Initialization — MUST run before render
// ════════════════════════════════════════════════════════════
//
// ⚠️ This registers the following getters on the api-client module:
//    • authTokenGetter    → reads `accessToken` from the auth store
//    • refreshTokenGetter → exchanges refresh token for a new access token
//    • logoutCallback     → clears auth state on hard 401 after refresh
//    • tenantIdGetter     → reads `tenantId` from the auth store
//
//    Without this call, no Authorization header is attached → 401.

initAuthService();

// ════════════════════════════════════════════════════════════
// 4. Render
// ════════════════════════════════════════════════════════════

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);