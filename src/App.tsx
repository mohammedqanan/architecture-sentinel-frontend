/**
 * src/App.tsx
 * ════════════════════════════════════════════════════════════
 * Root routing tree — ArchitectureSentinel v3.2
 *
 * 🎯 Architectural rules:
 *   1. ALL routes derive from `APP_ROUTES` (single source of truth).
 *   2. Guards are declarative components (`<ProtectedRoute>`, `<PublicOnlyRoute>`).
 *   3. `ErrorBoundary` wraps the whole tree.
 *   4. 404 fallback is explicit — no silent redirects.
 *   5. Static routes precede dynamic ones (`/projects/new` before `/projects/:id`).
 *
 * @module App
 */

import React, { Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '@/hooks/use-auth';
import { APP_ROUTES } from '@/constants';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SpatialLoader } from '@/components/ui/spatial-loader';

// ════════════════════════════════════════════════════════════
// 1. Lazy-loaded pages (code-split per route)
// ════════════════════════════════════════════════════════════

const LoginPage = lazy(() => import('@/app/login/page'));
const RegisterPage = lazy(() => import('@/app/register/page'));
const DashboardPage = lazy(() => import('@/app/page'));

// ───── Projects subtree ─────
const ProjectsPage = lazy(() => import('@/app/projects/page'));
const NewProjectPage = lazy(() => import('@/app/projects/new/page'));
const ProjectDetailPage = lazy(() => import('@/app/projects/[id]/page'));

// ───── Analyses subtree ─────
const AnalysesListPage = lazy(() => import('@/app/analyses/page'));
const NewAnalysisPage = lazy(() => import('@/app/analyses/new/page'));
const AnalysisDetailPage = lazy(
  () => import('@/app/analyses/[id]/page'),
);

// ───── Fallbacks ─────
const NotFoundPage = lazy(() => import('@/app/not-found'));

// ════════════════════════════════════════════════════════════
// 2. Route-level suspense fallback
// ════════════════════════════════════════════════════════════

const RouteFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#080C14]">
    <SpatialLoader size="lg" message="Loading route…" />
  </div>
);

// ════════════════════════════════════════════════════════════
// 3. Guards
// ════════════════════════════════════════════════════════════

/**
 * Blocks anonymous visitors and preserves the intended destination
 * in router state so we can redirect back after login.
 */
const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  // Wait for session hydration before making a routing decision.
  if (isHydrating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#080C14]">
        <SpatialLoader size="lg" message="Restoring session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={APP_ROUTES.login}
        state={{ from: location }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

/**
 * Redirects signed-in users away from auth screens (login, register…).
 */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) return null;
  if (isAuthenticated) return <Navigate to={APP_ROUTES.home} replace />;

  return <>{children}</>;
};

// ════════════════════════════════════════════════════════════
// 4. Root component
// ════════════════════════════════════════════════════════════

const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackMessage="Application encountered an unexpected error.">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ─────── Public Routes ─────── */}
          <Route
            path={APP_ROUTES.login}
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.register}
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* ─────── Protected Subtree ─────── */}
          <Route element={<ProtectedRoute />}>
            <Route path={APP_ROUTES.home} element={<DashboardPage />} />

            {/* ─────── Projects subtree ─────── */}
            <Route
              path={APP_ROUTES.projects}
              element={<ProjectsPage />}
            />
            {/* New — /projects/new (must precede :id to avoid capture) */}
            <Route
              path="/projects/new"
              element={<NewProjectPage />}
            />
            {/* Detail — /projects/:id */}
            <Route
              path="/projects/:id"
              element={<ProjectDetailPage />}
            />

            {/* ─────── Analyses subtree ─────── */}
            <Route
              path={APP_ROUTES.analyses}
              element={<AnalysesListPage />}
            />
            <Route
              path={APP_ROUTES.newAnalysis}
              element={<NewAnalysisPage />}
            />
            <Route
              path="/analyses/:id"
              element={<AnalysisDetailPage />}
            />
          </Route>

          {/* ─────── 404 Fallback ─────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;