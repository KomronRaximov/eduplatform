import { User } from '../types';
import { closeSocket } from './socket';
export function saveSession(accessToken: string, user: User) { localStorage.setItem('accessToken', accessToken); localStorage.setItem('user', JSON.stringify(user)); }
export function sessionUser(): User | null { if (typeof window === 'undefined') return null; const value = localStorage.getItem('user'); return value ? JSON.parse(value) : null; }
export function logout() { closeSocket(); localStorage.removeItem('accessToken'); localStorage.removeItem('user'); }
