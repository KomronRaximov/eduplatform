const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const token = () => typeof window === 'undefined' ? null : localStorage.getItem('accessToken');

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = token();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

/** Auth bilan faylni yuklab olish (masalan CSV eksport). */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const accessToken = token();
  const response = await fetch(`${BASE}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Faylni yuklab bo‘lmadi');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Auth bilan faylni Blob sifatida oladi (rasm ko'rish yoki yuklab olish uchun). */
export async function fetchBlob(path: string): Promise<Blob> {
  const accessToken = token();
  const response = await fetch(`${BASE}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Faylni ochib bo‘lmadi');
  }
  return response.blob();
}
