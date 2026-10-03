import { User } from '../types';
import { closeSocket } from './socket';
// providers.tsx clears the React Query cache on this event so one user's cached data is never shown to the next user.
const notifySessionChanged = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('session-changed')); };
export function saveSession(accessToken: string, user: User) { closeSocket(); localStorage.setItem('accessToken', accessToken); localStorage.setItem('user', JSON.stringify(user)); notifySessionChanged(); }
export function sessionUser(): User | null { if (typeof window === 'undefined') return null; const value = localStorage.getItem('user'); return value ? JSON.parse(value) : null; }
export function logout() { closeSocket(); localStorage.removeItem('accessToken'); localStorage.removeItem('user'); notifySessionChanged(); }
