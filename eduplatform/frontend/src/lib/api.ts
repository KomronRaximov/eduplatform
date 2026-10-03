const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const token = () => typeof window === 'undefined' ? null : localStorage.getItem('accessToken');

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = token();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? 'So‘rov bajarilmadi');
  }

  return response.status === 204 ? (undefined as T) : response.json();
}
