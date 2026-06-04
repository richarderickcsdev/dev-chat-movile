import { io, Socket } from 'socket.io-client';
import { getAccessToken, BASE_URL } from '../api/client';

let socket: Socket | null = null;

export async function connectSocket(tokenOverride?: string): Promise<Socket> {
  if (socket?.connected) return socket;

  disconnectSocket();

  const token = tokenOverride || (await getAccessToken());

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Timeout de conexion')), 15000);
  });
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket no conectado');
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
}
