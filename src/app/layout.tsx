/**
 * Application shell orchestrator.
 *
 * Chooses which shell to render based on:
 *   1. Whether Zustand stores have finished rehydrating
 *   2. Whether the current route is an auth route
 *
 * Owns cross-cutting concerns only:
 *   - QueryClient singleton (memoized)
 *   - Store rehydration
 *   - Auth service initialization
 *   - Theme → <html> sync
 *   - Document title management
 *   - App-level ErrorBoundary around providers
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { useUIStore } from '@/stores/ui-store';
import { initAuthService } from '@/services/auth.service';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import BootstrapShell from './shells/BootstrapShell';
import AuthShell from './shells/AuthShell';
import AppShell from './shells/AppShell';
import { APP_ROUTES } from '@/constants';

const AUTH_ROUTE_PREFIXES = [
  APP_ROUTES.login,
  APP_ROUTES.register,
  '/forgot-password',
  '/reset-password',
] as const;

const PAGE_TITLES: Array<[prefix: string, title: string]> = [
  ['/', 'Dashboard | ArchitectureSentinel'],
  [APP_ROUTES.projects, 'Projects | ArchitectureSentinel'],
  ['/analysis', 'Analysis | ArchitectureSentinel'],
  [APP_ROUTES.login, 'Sign In | ArchitectureSentinel'],
  [APP_ROUTES.register, 'Create Account | ArchitectureSentinel'],
  [APP_ROUTES.settings, 'Settings | ArchitectureSentinel'],
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const theme = useUIStore((state) => state.theme);
  const [isHydrated, setIsHydrated] = useState(false);

  const queryClient = useMemo(() => getQueryClient(), []);

  const isAuthRoute = useMemo(
    () => AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname],
  );

  // Rehydrate persisted stores and initialize services once.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      void useUIStore.persist?.rehydrate?.();
    }
    initAuthService();
    setIsHydrated(true);
  }, []);

  // Sync the resolved theme onto the root element (single source of truth).
  useEffect(() => {
    const root = document.documentElement;
    const shouldBeDark = theme === 'dark';
    root.classList.toggle('dark', shouldBeDark);
    root.style.colorScheme = shouldBeDark ? 'dark' : 'light';
  }, [theme]);

  // Update the document title as the route changes.
  useEffect(() => {
    const matched = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
    document.title = matched ? matched[1] : 'ArchitectureSentinel';
  }, [pathname]);

  if (!isHydrated) {
    return <BootstrapShell />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {isAuthRoute ? (
          <AuthShell>{children}</AuthShell>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default React.memo(Layout);