'use client';

/**
 * src/hooks/use-socket.ts
 * ════════════════════════════════════════════════════════════
 * Socket.IO connection lifecycle hook.
 *
 * Architecture:
 *   • Auth-gated: opens only when `options.enabled === true`.
 *   • Single shared client: uses `socketClient` singleton from `lib/`.
 *   • StrictMode-safe: no double connections on double-mount.
 *   • Token refresh: rebinds `socket.auth` on access-token change.
 *
 * @module hooks/use-socket
 */

import { useEffect, useRef, useState, useCallback } from 'react';

import { socketClient } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/auth-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

export interface UseSocketOptions {
  /**
   * Master switch — when `false`, the socket is disconnected.
   * Default: `true`.
   */
  enabled?: boolean;

  /** Optional connection error callback. */
  onError?: (error: Error) => void;

  /** Optional connect callback. */
  onConnect?: () => void;

  /** Optional disconnect callback. */
  onDisconnect?: (reason: string) => void;
}

export interface UseSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
}

// ════════════════════════════════════════════════════════════
// Hook
// ════════════════════════════════════════════════════════════

export function useSocket(
  options: UseSocketOptions = {},
): UseSocketReturn {
  const { enabled = true, onConnect, onDisconnect, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(
    null,
  );

  // ───── Latest callbacks stored in refs (avoid stale closures) ─────
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onConnect, onDisconnect, onError]);

  // ───── Auth token ─────
  const accessToken = useAuthStore((s) => s.accessToken);

  // ════════════════════════════════════════════════════════
  // Connection lifecycle
  // ════════════════════════════════════════════════════════

  useEffect(() => {
    // 🚫 Disabled → ensure socket is disconnected and bail.
    if (!enabled) {
      if (socketClient.connected) {
        socketClient.disconnect();
      }
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    // 🔑 Bind latest auth token to the socket handshake.
    if (accessToken) {
      socketClient.auth = { token: accessToken };
    }

    // 🔌 Connect if not already.
    if (!socketClient.connected) {
      socketClient.connect();
    }

    // ───── Event handlers ─────
    const handleConnect = (): void => {
      setIsConnected(true);
      setConnectionError(null);
      onConnectRef.current?.();
    };

    const handleDisconnect = (reason: string): void => {
      setIsConnected(false);
      onDisconnectRef.current?.(reason);
    };

    const handleConnectError = (error: Error): void => {
      setConnectionError(error.message || 'Socket connection failed');
      setIsConnected(false);
      onErrorRef.current?.(error);
    };

    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);
    socketClient.on('connect_error', handleConnectError);

    // ───── Cleanup ─────
    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
      socketClient.off('connect_error', handleConnectError);
    };
  }, [enabled, accessToken]);

  // ════════════════════════════════════════════════════════
  // Return
  // ════════════════════════════════════════════════════════

  return { isConnected, connectionError };
}