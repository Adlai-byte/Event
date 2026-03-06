// mvc/services/socketClient.ts
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(userEmail: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const baseUrl = getApiBaseUrl();
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    socket?.emit('join', userEmail);
  });

  socket.on('disconnect', (_reason) => {});

  socket.on('reconnect', () => {
    socket?.emit('join', userEmail);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
