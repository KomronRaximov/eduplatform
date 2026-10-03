import { io, Socket } from 'socket.io-client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
let socket: Socket | null = null;

// Reads localStorage directly (not lib/auth.ts): logout() there calls closeSocket(), so importing it would be a cycle.
function sessionRole(): string | null {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw)?.role ?? null : null; } catch { return null; }
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const role = sessionRole();
  if (!accessToken || !role || role === 'ADMIN') return null;
  if (socket) return socket;
  socket = io(new URL(BASE).origin, { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
  return socket;
}

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
}
