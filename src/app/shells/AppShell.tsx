/**
 * Shell for authenticated routes.
 * - Lazy-loads MainLayout so it never enters the auth bundle.
 * - Mounts SocketProvider conditionally.
 * - Wraps everything in an AuthGate to reject anonymous visitors.
 */

import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import AuthGate from '@/components/guards/AuthGate';
import SocketProvider from '@/components/providers/SocketProvider';
import BootstrapShell from './BootstrapShell';

const MainLayout = lazy(() => import('@/components/layout/main-layout'));

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AuthGate>
      <SocketProvider>
        <ErrorBoundary>
          <Suspense fallback={<BootstrapShell />}>
            <MainLayout>{children}</MainLayout>
          </Suspense>
        </ErrorBoundary>
      </SocketProvider>
    </AuthGate>
  );
};

export default React.memo(AppShell);