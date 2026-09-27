/**
 * Redirects unauthenticated users to /login.
 *
 * Renders BootstrapShell while the auth store is still loading from
 * persistence, so we never flash the login page at a signed-in user.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import BootstrapShell from '@/app/shells/BootstrapShell';
import { APP_ROUTES } from '@/constants';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  // Treat "has token but no user yet" as still loading; the auth hook
  // will hydrate the user on mount.
  const hasToken = Boolean(accessToken);
  if (!isAuthenticated && !hasToken) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location }} />;
  }

  // Authenticated but user object still hydrating → show neutral loader.
  if (isAuthenticated && !hasToken) {
    return <BootstrapShell />;
  }

  return <>{children}</>;
};

export default React.memo(AuthGate);