/**
 * src/lib/socket-client.ts
 *
 * عميل WebSocket (Socket.IO) موحد للمشروع.
 */

import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL, SOCKET_CONFIG } from '../constants';

let socketInstance: Socket | null = null;

/**
 * الحصول على عميل Socket.IO (مفرد).
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(WS_BASE_URL, {
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionDelayMax: SOCKET_CONFIG.maxReconnectionDelay, // تم التعديل هنا
      timeout: SOCKET_CONFIG.timeout,
      autoConnect: false,
    });
  }
  return socketInstance;
}

/**
 * عميل Socket الجاهز للاستخدام.
 */
export const socketClient = getSocket();