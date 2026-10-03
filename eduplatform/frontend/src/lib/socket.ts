import { io, Socket } from 'socket.io-client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
let socket: Socket | null = null;
let socketToken: string | null = null;
let authFailed = false;

// Reads localStorage directly (not lib/auth.ts): logout()/saveSession() there call closeSocket(), so importing it would be a cycle.
export function storedUser(): { id?: string; role?: string } | null {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export const sessionRole = (): string | null => storedUser()?.role ?? null;

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
  authFailed = false;
}

// True once the server rejected the token (connect_error 'unauthorized') or dropped the socket because the token expired.
export const socketAuthFailed = (): boolean => authFailed;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const role = sessionRole();
  if (!accessToken || !role || role === 'ADMIN') { if (socket) closeSocket(); return null; }
  if (socket && socketToken !== accessToken) closeSocket();
  if (socket) return socket;
  const s = io(new URL(BASE).origin, { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
  // Registered before any component listener, so authFailed is already set when they run.
  // The socket stays (disconnected) until the token changes: no retry storm, and mounting components still see the failure.
  s.on('connect_error', (err) => { if (err.message === 'unauthorized' && socket === s) { authFailed = true; s.disconnect(); } });
  s.on('disconnect', (reason) => { if (reason === 'io server disconnect' && socket === s) authFailed = true; });
  socket = s;
  socketToken = accessToken;
  return s;
}
