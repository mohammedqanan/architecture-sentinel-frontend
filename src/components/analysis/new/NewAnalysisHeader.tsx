'use client';

/**
 * src/components/providers/SocketProvider.tsx
 * ════════════════════════════════════════════════════════════
 * Global WebSocket provider — gates the Socket.IO connection on auth.
 *
 * Mounted inside `AppShell`:
 *   <AuthGate> → <SocketProvider> → <MainLayout> → {children}
 *
 * Exports BOTH:
 *   • named   → `import { SocketProvider } from '...'`
 *   • default → `import SocketProvider from '...'`
 *
 * @module components/providers/SocketProvider
 */

import React from 'react';

import { useSocket } from '@/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

export interface SocketProviderProps {
  children: React.ReactNode;
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
}) => {
  // ✅ Single boolean selector — no shallow compare needed.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);

  // ✅ `enabled` gates the connection on auth state.
  useSocket({
    enabled: isAuthenticated,
    onError: (error) => {
      // Non-fatal — surface as toast, never crash the tree.
      addToast(
        `Real-time connection failed: ${error.message}`,
        'warning',
      );
    },
  });

  return <>{children}</>;
};

SocketProvider.displayName = 'SocketProvider';

// ✅ Default export — for `import SocketProvider from '...'`
export default React.memo(SocketProvider);