import { io, Socket } from 'socket.io-client';
import { getAccessToken, BASE_URL } from '../api/client';
import { handleIncomingMessage } from '../notifications/handler';

let socket: Socket | null = null;

export async function connectSocket(tokenOverride?: string): Promise<Socket> {
  if (socket?.connected) return socket;

  disconnectSocket();

  const token = tokenOverride || (await getAccessToken());

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    socket!.off('message:new').on('message:new', (msg: any) => {
      handleIncomingMessage(msg);
    });
  });

  return new Promise((resolve, reject) => {
    socket!.once('connect', () => resolve(socket!));
    socket!.once('connect_error', (err) => reject(err));
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
