import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';
// Socket.IO connects to the root of the API server, not the /api path
const SOCKET_URL = API_BASE.replace('/api', '').replace(/\/$/, '');

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (socket?.connected) return socket;

  const token = localStorage.getItem('tradelink_token');
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitTyping(receiverId: string) {
  const s = getSocket();
  if (s) s.emit('dm:typing', { receiverId });
}

export function emitStopTyping(receiverId: string) {
  const s = getSocket();
  if (s) s.emit('dm:stop-typing', { receiverId });
}
