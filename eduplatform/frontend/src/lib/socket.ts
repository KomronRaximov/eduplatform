import { io, Socket } from 'socket.io-client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
let socket: Socket | null = null;
let socketToken: string | null = null;

// Reads localStorage directly (not lib/auth.ts): logout()/saveSession() there call closeSocket(), so importing it would be a cycle.
export function sessionUser(): { id?: string; role?: string } | null {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export const sessionRole = (): string | null => sessionUser()?.role ?? null;

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const role = sessionRole();
  if (!accessToken || !role || role === 'ADMIN') { if (socket) closeSocket(); return null; }
  if (socket && socketToken !== accessToken) closeSocket();
  if (socket) return socket;
  socket = io(new URL(BASE).origin, { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
  socketToken = accessToken;
  return socket;
}
