/**
 * Opens the WebSocket connection only when the user is authenticated.
 * Unmounting (logout, navigation to an auth route) closes the socket.
 */

import React from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';

interface SocketProviderProps {
  children: React.ReactNode;
}

const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // The hook itself receives the enabled flag so it can skip connecting.
  useSocket({ enabled: isAuthenticated });

  return <>{children}</>;
};

export default React.memo(SocketProvider);