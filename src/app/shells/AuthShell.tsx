/**
 * Shell for unauthenticated routes (login, register, password reset).
 * No sidebar, no header, no socket.
 */

import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface AuthShellProps {
  children: React.ReactNode;
}

const AuthShell: React.FC<AuthShellProps> = ({ children }) => {
  return (
    <main className="min-h-screen flex flex-col bg-[#080C14] text-white">
      <ErrorBoundary>{children}</ErrorBoundary>
    </main>
  );
};

export default React.memo(AuthShell);