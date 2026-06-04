import { Manager, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

const SOCKET_URL = 'http://192.168.1.100:3001';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getAccessToken();
  const manager = new Manager(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  socket = manager.socket('/');

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Timeout de conexion')), 10000);
  });
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket no conectado');
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
